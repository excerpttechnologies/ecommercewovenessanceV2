/**
 * Shiprocket helper (server-only). NEW FILE — does not touch any existing code.
 * Reads SHIPROCKET_* values straight from process.env (already present in .env).
 *
 * Flow: login (token cached) -> create order -> assign courier/AWB -> request pickup.
 */

const DEFAULT_BASE = "https://apiv2.shiprocket.in/v1/external";

export interface ShipOrderInput {
  orderNo: string;
  createdAt?: Date | string;
  paymentMode: string; // "COD" or anything else = prepaid
  netAmount: number;
  subTotal: number;
  shippingCharge?: number;
  items: { name?: string; sku: string; qty: number; rate: number; discount?: number; gst?: number }[];
  address: { name?: string; phone?: string; line1?: string; line2?: string; city?: string; state?: string; pincode?: string; country?: string };
  email?: string;
}

export interface ShipResult {
  shiprocketOrderId: number;
  shipmentId: number;
  awbNo?: string;
  courierName?: string;
  pickupRequested: boolean;
}

function base() {
  return (process.env.SHIPROCKET_BASE_URL?.trim() || DEFAULT_BASE).replace(/\/+$/, "");
}

export function isShiprocketConfigured(): boolean {
  return Boolean(
    process.env.SHIPROCKET_EMAIL?.trim() &&
      process.env.SHIPROCKET_PASSWORD?.trim() &&
      process.env.SHIPROCKET_PICKUP_LOCATION?.trim(),
  );
}

let cached: { token: string; expiresAt: number } | null = null;

async function login(): Promise<string> {
  if (cached && cached.expiresAt > Date.now()) return cached.token;
  const res = await fetch(`${base()}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env.SHIPROCKET_EMAIL?.trim(),
      password: process.env.SHIPROCKET_PASSWORD?.trim(),
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const body = (await res.json().catch(() => ({}))) as { token?: string; message?: string };
  if (!res.ok || !body.token) {
    throw new Error(`Shiprocket login failed${body.message ? `: ${body.message}` : ` (HTTP ${res.status})`}`);
  }
  // Shiprocket tokens last ~10 days; refresh after 8.
  cached = { token: body.token, expiresAt: Date.now() + 8 * 24 * 60 * 60 * 1000 };
  return body.token;
}

async function call<T>(path: string, init: { method?: string; body?: unknown } = {}, retry = true): Promise<T> {
  const token = await login();
  const res = await fetch(`${base()}${path}`, {
    method: init.method ?? "GET",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(20_000),
  });
  if (res.status === 401 && retry) {
    cached = null;
    return call<T>(path, init, false);
  }
  const data = (await res.json().catch(() => ({}))) as T & { message?: string; errors?: unknown };
  if (!res.ok) {
    const detail = data.errors ? ` ${JSON.stringify(data.errors).slice(0, 300)}` : "";
    throw new Error(`Shiprocket: ${data.message ?? `HTTP ${res.status}`}${detail}`);
  }
  return data;
}

const digits = (v?: string) => (v ?? "").replace(/\D/g, "");
const num = (v: string | undefined, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};
const two = (n: number) => String(n).padStart(2, "0");
function fmtDate(d: Date) {
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())} ${two(d.getHours())}:${two(d.getMinutes())}`;
}

export async function shipOrder(o: ShipOrderInput): Promise<ShipResult> {
  if (!isShiprocketConfigured()) {
    throw Object.assign(new Error("Shiprocket is not configured. Add SHIPROCKET_EMAIL, SHIPROCKET_PASSWORD and SHIPROCKET_PICKUP_LOCATION to the server environment."), { status: 503, code: "SHIPROCKET_NOT_CONFIGURED" });
  }
  const a = o.address;
  const phone = digits(a.phone).slice(-10);
  const pincode = digits(a.pincode);
  if (phone.length !== 10) throw Object.assign(new Error("Customer phone must be a 10-digit number."), { status: 422, code: "BAD_PHONE" });
  if (pincode.length !== 6) throw Object.assign(new Error("Customer pincode must be 6 digits."), { status: 422, code: "BAD_PINCODE" });
  if (!a.line1 || !a.city || !a.state) throw Object.assign(new Error("Shipping address is incomplete."), { status: 422, code: "BAD_ADDRESS" });

  const [first, ...rest] = (a.name?.trim() || "Customer").split(/\s+/);
  const isCod = o.paymentMode.toUpperCase() === "COD";
  const weight = num(process.env.SHIPROCKET_WEIGHT_KG, 0.7);

  const payload: Record<string, unknown> = {
    order_id: o.orderNo,
    order_date: fmtDate(o.createdAt ? new Date(o.createdAt) : new Date()),
    pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION?.trim(),
    billing_customer_name: first,
    billing_last_name: rest.join(" "),
    billing_address: a.line1,
    billing_address_2: a.line2 ?? "",
    billing_city: a.city,
    billing_pincode: pincode,
    billing_state: a.state,
    billing_country: a.country || "India",
    billing_email: o.email || process.env.SHIPROCKET_FALLBACK_EMAIL?.trim() || "orders@wovenessence.in",
    billing_phone: phone,
    shipping_is_billing: true,
    order_items: o.items.map((it) => ({
      name: it.name || it.sku,
      sku: it.sku,
      units: it.qty,
      selling_price: it.rate,
      discount: it.discount ?? 0,
      tax: 0,
      hsn: "",
    })),
    payment_method: isCod ? "COD" : "Prepaid",
    shipping_charges: o.shippingCharge ?? 0,
    sub_total: o.netAmount,
    length: num(process.env.SHIPROCKET_BOX_LENGTH_CM, 30),
    breadth: num(process.env.SHIPROCKET_BOX_BREADTH_CM, 25),
    height: num(process.env.SHIPROCKET_BOX_HEIGHT_CM, 5),
    weight,
  };
  const channelId = process.env.SHIPROCKET_CHANNEL_ID?.trim();
  if (channelId) payload.channel_id = channelId;

  // 1) create the order in Shiprocket
  const created = await call<{ order_id?: number; shipment_id?: number; awb_code?: string; courier_name?: string }>(
    "/orders/create/adhoc",
    { method: "POST", body: payload },
  );
  if (!created.order_id || !created.shipment_id) throw new Error("Shiprocket did not return an order/shipment id.");

  let awbNo = created.awb_code || undefined;
  let courierName = created.courier_name || undefined;

  // 2) assign courier + AWB (Shiprocket picks the recommended courier when none is given)
  if (!awbNo) {
    try {
      const assigned = await call<{ response?: { data?: { awb_code?: string; courier_name?: string } } }>(
        "/courier/assign/awb",
        { method: "POST", body: { shipment_id: created.shipment_id } },
      );
      awbNo = assigned.response?.data?.awb_code || undefined;
      courierName = assigned.response?.data?.courier_name || courierName;
    } catch (e) {
      console.error("[shiprocket] AWB assignment failed", e);
    }
  }

  // 3) request pickup (only possible once an AWB exists)
  let pickupRequested = false;
  if (awbNo) {
    try {
      await call("/courier/generate/pickup", { method: "POST", body: { shipment_id: [created.shipment_id] } });
      pickupRequested = true;
    } catch (e) {
      console.error("[shiprocket] pickup request failed", e);
    }
  }

  return { shiprocketOrderId: created.order_id, shipmentId: created.shipment_id, awbNo, courierName, pickupRequested };
}
