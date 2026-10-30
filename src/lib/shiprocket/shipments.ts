import { shiprocketRequest } from "./client";
import { ShiprocketError } from "./errors";
import { fetchServiceability } from "./serviceability";
import type {
  CourierOption,
  PackageDimensions,
  ShipmentRequest,
  ShipmentResult,
  ShiprocketConfig,
} from "./types";
import type { ShippingContext } from "./config";

/** Wrappers around the documented Shiprocket fulfilment endpoints. */

const digits = (value?: string | null) => (value ?? "").replace(/\D/g, "");
const two = (n: number) => String(n).padStart(2, "0");

/** Shiprocket expects `YYYY-MM-DD HH:mm`. */
export function shiprocketDate(value?: Date | string): string {
  const d = value ? new Date(value) : new Date();
  const date = Number.isNaN(d.getTime()) ? new Date() : d;
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())} ${two(date.getHours())}:${two(date.getMinutes())}`;
}

export function splitName(full?: string): { first: string; last: string } {
  const parts = (full ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { first: "Customer", last: "" };
  return { first: parts[0].slice(0, 60), last: parts.slice(1).join(" ").slice(0, 60) };
}

function assertRequest(request: ShipmentRequest, config: ShiprocketConfig) {
  if (!config.pickupLocation) {
    throw new ShiprocketError("SHIPROCKET_PICKUP_LOCATION_MISSING", "Add the Shiprocket pickup location nickname in Admin → Settings → Shipping.", { status: 503 });
  }
  if (!request.orderNo) throw new ShiprocketError("BAD_ORDER", "Order number is missing.", { status: 422 });
  if (!request.items.length) throw new ShiprocketError("BAD_ITEMS", "A shipment needs at least one item.", { status: 422 });
  const phone = digits(request.address.phone).slice(-10);
  if (phone.length !== 10) throw new ShiprocketError("BAD_PHONE", "Customer phone must be a 10-digit number.", { status: 422 });
  if (digits(request.address.pincode).length !== 6) {
    throw new ShiprocketError("BAD_PINCODE", "Customer pincode must be 6 digits.", { status: 422 });
  }
  if (!request.address.line1?.trim() || !request.address.city?.trim() || !request.address.state?.trim()) {
    throw new ShiprocketError("BAD_ADDRESS", "Shipping address is incomplete.", { status: 422 });
  }
}

/** The exact `/orders/create/adhoc` payload — exported so it can be unit-tested. */
export function buildOrderPayload(request: ShipmentRequest, config: ShiprocketConfig): Record<string, unknown> {
  assertRequest(request, config);
  const billing = splitName(request.address.name);
  const pkg: PackageDimensions = request.package;
  const isCod = request.paymentMode.toUpperCase() === "COD";
  const payload: Record<string, unknown> = {
    order_id: request.orderNo,
    order_date: shiprocketDate(request.createdAt),
    pickup_location: config.pickupLocation,
    billing_customer_name: billing.first,
    billing_last_name: billing.last,
    billing_address: request.address.line1,
    billing_address_2: request.address.line2 ?? "",
    billing_city: request.address.city,
    billing_pincode: digits(request.address.pincode),
    billing_state: request.address.state,
    billing_country: request.address.country || "India",
    billing_email: request.email || request.address.email || config.pickup.email,
    billing_phone: digits(request.address.phone).slice(-10),
    shipping_is_billing: true,
    order_items: request.items.map((item) => ({
      name: (item.name || item.sku).slice(0, 120),
      sku: item.sku.slice(0, 60),
      units: Math.max(1, Math.floor(item.qty)),
      selling_price: Math.max(0, item.rate),
      discount: Math.max(0, item.discount ?? 0),
      tax: Math.max(0, item.tax ?? 0),
      hsn: item.hsn ?? "",
    })),
    payment_method: isCod ? "COD" : "Prepaid",
    shipping_charges: Math.max(0, request.shippingCharge ?? 0),
    sub_total: Math.max(0, request.subTotal || request.netAmount),
    length: Math.max(1, Math.ceil(pkg.length)),
    breadth: Math.max(1, Math.ceil(pkg.breadth)),
    height: Math.max(1, Math.ceil(pkg.height)),
    weight: Math.max(0.01, Math.round(pkg.weight * 100) / 100),
  };
  if (config.channelId) payload.channel_id = config.channelId;
  return payload;
}

interface CreateOrderResponse {
  order_id?: number | string;
  shipment_id?: number | string;
  status?: string;
  awb_code?: string;
  courier_name?: string;
  message?: string;
}

/** POST /orders/create/adhoc */
export async function createShiprocketOrder(
  context: ShippingContext,
  request: ShipmentRequest,
): Promise<{ shiprocketOrderId: number; shipmentId: number; awbNo?: string; courierName?: string }> {
  const config = context.config;
  if (!config) throw new ShiprocketError("SHIPROCKET_NOT_CONFIGURED", "Shiprocket is not configured on the server.", { status: 503 });
  const body = buildOrderPayload(request, config);
  const response = await shiprocketRequest<CreateOrderResponse>(config, "/orders/create/adhoc", {
    method: "POST",
    body,
    safe: false,
  });
  const shiprocketOrderId = Number(response.order_id);
  const shipmentId = Number(response.shipment_id);
  if (!Number.isFinite(shiprocketOrderId) || !Number.isFinite(shipmentId) || shiprocketOrderId <= 0 || shipmentId <= 0) {
    throw new ShiprocketError(
      "SHIPROCKET_BAD_RESPONSE",
      "Shiprocket did not return an order/shipment id for this order.",
      { status: 502, details: response },
    );
  }
  return {
    shiprocketOrderId,
    shipmentId,
    awbNo: typeof response.awb_code === "string" && response.awb_code ? response.awb_code : undefined,
    courierName: typeof response.courier_name === "string" && response.courier_name ? response.courier_name : undefined,
  };
}

/** GET /courier/serviceability — available couriers + live rates for a package. */
export async function fetchCourierOptions(
  context: ShippingContext,
  input: { deliveryPincode: string; weightKg: number; cod: boolean; declaredValue?: number },
): Promise<CourierOption[]> {
  const config = context.config;
  if (!config) throw new ShiprocketError("SHIPROCKET_NOT_CONFIGURED", "Shiprocket is not configured on the server.", { status: 503 });
  if (digits(config.pickupPincode).length !== 6) {
    throw new ShiprocketError("SHIPROCKET_PICKUP_PINCODE_MISSING", "Add the warehouse pickup pincode in Admin → Settings → Shipping.", { status: 503 });
  }
  return fetchServiceability(context, {
    pickupPincode: config.pickupPincode,
    deliveryPincode: input.deliveryPincode,
    weightKg: input.weightKg,
    cod: input.cod,
    declaredValue: input.declaredValue,
  });
}

interface AwbResponse {
  awb_assign_status?: number | string;
  message?: string;
  response?: { data?: { awb_code?: string; courier_name?: string; courier_company_id?: number | string } };
}

/** POST /courier/assign/awb — assigns a courier and generates the AWB. */
export async function assignAwb(
  context: ShippingContext,
  input: { shipmentId: number; courierId?: number | string },
): Promise<{ awbNo: string; courierName?: string; courierId?: number | string }> {
  const config = context.config;
  if (!config) throw new ShiprocketError("SHIPROCKET_NOT_CONFIGURED", "Shiprocket is not configured on the server.", { status: 503 });
  const body: Record<string, unknown> = { shipment_id: input.shipmentId };
  if (input.courierId != null && input.courierId !== "") body.courier_id = input.courierId;
  const response = await shiprocketRequest<AwbResponse>(config, "/courier/assign/awb", { method: "POST", body, safe: false });
  const data = response.response?.data;
  const awbNo = typeof data?.awb_code === "string" ? data.awb_code.trim() : "";
  if (!awbNo) {
    throw new ShiprocketError(
      Number(response.awb_assign_status) === 0 ? "SHIPROCKET_AWB_FAILED" : "SHIPROCKET_BAD_RESPONSE",
      `Shiprocket did not assign an AWB${response.message ? `: ${response.message}` : "."}`,
      { status: 502 },
    );
  }
  return { awbNo, courierName: data?.courier_name, courierId: data?.courier_company_id ?? input.courierId };
}

interface PickupResponse {
  pickup_status?: number | string;
  message?: string;
  response?: { pickup_scheduled_date?: string; pickup_token_number?: string };
}

/** POST /courier/generate/pickup — needs an assigned AWB. */
export async function requestPickup(
  context: ShippingContext,
  shipmentId: number,
): Promise<{ pickupScheduledDate?: string; pickupToken?: string }> {
  const config = context.config;
  if (!config) throw new ShiprocketError("SHIPROCKET_NOT_CONFIGURED", "Shiprocket is not configured on the server.", { status: 503 });
  const response = await shiprocketRequest<PickupResponse>(config, "/courier/generate/pickup", {
    method: "POST",
    body: { shipment_id: [shipmentId] },
    safe: false,
  });
  if (Number(response.pickup_status) === 0) {
    throw new ShiprocketError(
      "SHIPROCKET_PICKUP_FAILED",
      `Shiprocket could not schedule a pickup${response.message ? `: ${response.message}` : "."}`,
      { status: 502 },
    );
  }
  return {
    pickupScheduledDate: response.response?.pickup_scheduled_date,
    pickupToken: response.response?.pickup_token_number,
  };
}

interface LabelResponse {
  label_created?: number | string;
  label_url?: string;
  message?: string;
}

/** POST /courier/generate/label */
export async function generateLabel(context: ShippingContext, shipmentId: number): Promise<string> {
  const config = context.config;
  if (!config) throw new ShiprocketError("SHIPROCKET_NOT_CONFIGURED", "Shiprocket is not configured on the server.", { status: 503 });
  const response = await shiprocketRequest<LabelResponse>(config, "/courier/generate/label", {
    method: "POST",
    body: { shipment_id: [shipmentId] },
    safe: false,
  });
  if (typeof response.label_url !== "string" || !response.label_url) {
    throw new ShiprocketError(
      "SHIPROCKET_LABEL_FAILED",
      `Shiprocket did not return a label${response.message ? `: ${response.message}` : "."}`,
      { status: 502 },
    );
  }
  return response.label_url;
}

interface ManifestResponse {
  manifest_url?: string;
  status?: number | string;
  message?: string;
  response?: { manifest_url?: string };
}

/** POST /manifests/generate */
export async function generateManifest(context: ShippingContext, shipmentId: number): Promise<string> {
  const config = context.config;
  if (!config) throw new ShiprocketError("SHIPROCKET_NOT_CONFIGURED", "Shiprocket is not configured on the server.", { status: 503 });
  const response = await shiprocketRequest<ManifestResponse>(config, "/manifests/generate", {
    method: "POST",
    body: { shipment_id: [shipmentId] },
    safe: false,
  });
  const url = response.manifest_url || response.response?.manifest_url;
  if (typeof url !== "string" || !url) {
    throw new ShiprocketError(
      "SHIPROCKET_MANIFEST_FAILED",
      `Shiprocket did not return a manifest${response.message ? `: ${response.message}` : "."}`,
      { status: 502 },
    );
  }
  return url;
}

interface CancelResponse {
  status?: number | string;
  message?: string;
}

/** POST /orders/cancel — cancels the Shiprocket order (and stops pickup). */
export async function cancelShiprocketOrder(context: ShippingContext, shiprocketOrderId: number): Promise<boolean> {
  const config = context.config;
  if (!config) throw new ShiprocketError("SHIPROCKET_NOT_CONFIGURED", "Shiprocket is not configured on the server.", { status: 503 });
  const response = await shiprocketRequest<CancelResponse>(config, "/orders/cancel", {
    method: "POST",
    body: { ids: [shiprocketOrderId] },
    safe: false,
  });
  return Number(response.status) === 200 || /cancel/i.test(response.message ?? "");
}

/**
 * Create the shipment, optionally assign the AWB and schedule pickup.
 * A courier/AWB or pickup failure is reported as a warning and never loses the
 * Shiprocket order/shipment ids that were already created.
 */
export async function createShipment(
  context: ShippingContext,
  request: ShipmentRequest,
  options: { assignAwb?: boolean; requestPickup?: boolean } = {},
): Promise<ShipmentResult> {
  const warnings: string[] = [];
  const created = await createShiprocketOrder(context, request);

  let awbNo = created.awbNo;
  let courierName = created.courierName;
  let pickupRequested = false;

  if (!awbNo && options.assignAwb !== false) {
    try {
      const assigned = await assignAwb(context, { shipmentId: created.shipmentId, courierId: request.courierId });
      awbNo = assigned.awbNo;
      courierName = assigned.courierName ?? courierName;
    } catch (error) {
      warnings.push(error instanceof Error ? error.message.slice(0, 200) : "AWB assignment failed");
    }
  }

  if (awbNo && options.requestPickup !== false) {
    try {
      await requestPickup(context, created.shipmentId);
      pickupRequested = true;
    } catch (error) {
      warnings.push(error instanceof Error ? error.message.slice(0, 200) : "Pickup request failed");
    }
  }

  return {
    alreadyExisted: false,
    shiprocketOrderId: created.shiprocketOrderId,
    shipmentId: created.shipmentId,
    awbNo,
    courierName,
    pickupRequested,
    warnings,
  };
}

export const __testing = { digits };
