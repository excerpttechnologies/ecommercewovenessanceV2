import { shiprocketRequest } from "./client";
import { ShiprocketError } from "./errors";
import { assignAwb, shiprocketDate, splitName } from "./shipments";
import type { ShippingContext } from "./config";
import type { ReturnRequest, ReturnResult } from "./types";

/** Return / RTO shipment support. Refunds stay in the existing payment flow. */

interface ReturnResponse {
  order_id?: number | string;
  shipment_id?: number | string;
  status?: string;
  message?: string;
}

const digits = (value?: string | null) => (value ?? "").replace(/\D/g, "");

/**
 * Return payload is the mirror image of a forward shipment: pickup from the
 * customer address, deliver back to the configured return address.
 */
export function buildReturnPayload(request: ReturnRequest, context: ShippingContext): Record<string, unknown> {
  const config = context.config;
  if (!config) throw new ShiprocketError("SHIPROCKET_NOT_CONFIGURED", "Shiprocket is not configured on the server.", { status: 503 });
  const customer = splitName(request.address.name);
  const warehouse = config.returnAddress;
  if (digits(request.address.pincode).length !== 6) {
    throw new ShiprocketError("BAD_PINCODE", "Customer pincode must be 6 digits.", { status: 422 });
  }
  if (!warehouse.address || digits(warehouse.pincode).length !== 6) {
    throw new ShiprocketError(
      "SHIPROCKET_RETURN_ADDRESS_MISSING",
      "Add the return address and pincode in Admin → Settings → Shipping.",
      { status: 503 },
    );
  }
  if (!request.items.length) throw new ShiprocketError("BAD_ITEMS", "A return needs at least one item.", { status: 422 });

  return {
    order_id: `${request.orderNo}-R1`,
    order_date: shiprocketDate(request.createdAt),
    ...(config.channelId ? { channel_id: config.channelId } : {}),
    pickup_customer_name: customer.first,
    pickup_last_name: customer.last,
    pickup_address: request.address.line1 ?? "",
    pickup_address_2: request.address.line2 ?? "",
    pickup_city: request.address.city ?? "",
    pickup_state: request.address.state ?? "",
    pickup_country: request.address.country || "India",
    pickup_pincode: digits(request.address.pincode),
    pickup_email: request.address.email || config.pickup.email,
    pickup_phone: digits(request.address.phone).slice(-10),
    shipping_customer_name: warehouse.name,
    shipping_last_name: "",
    shipping_address: warehouse.address,
    shipping_address_2: warehouse.address2,
    shipping_city: warehouse.city,
    shipping_state: warehouse.state,
    shipping_country: "India",
    shipping_pincode: digits(warehouse.pincode),
    shipping_email: warehouse.email,
    shipping_phone: digits(warehouse.phone).slice(-10),
    order_items: request.items.map((item) => ({
      name: (item.name || item.sku).slice(0, 120),
      sku: item.sku.slice(0, 60),
      units: Math.max(1, Math.floor(item.qty)),
      selling_price: Math.max(0, item.rate),
      discount: Math.max(0, item.discount ?? 0),
      tax: Math.max(0, item.tax ?? 0),
      hsn: item.hsn ?? "",
    })),
    payment_method: "Prepaid",
    sub_total: Math.max(0, request.subTotal || request.netAmount),
    length: Math.max(1, Math.ceil(request.package.length)),
    breadth: Math.max(1, Math.ceil(request.package.breadth)),
    height: Math.max(1, Math.ceil(request.package.height)),
    weight: Math.max(0.01, Math.round(request.package.weight * 100) / 100),
  };
}

/** POST /orders/create/return — creates the reverse pickup order. */
export async function createReturnShipment(context: ShippingContext, request: ReturnRequest): Promise<ReturnResult> {
  const config = context.config;
  if (!config) throw new ShiprocketError("SHIPROCKET_NOT_CONFIGURED", "Shiprocket is not configured on the server.", { status: 503 });
  const body = buildReturnPayload(request, context);
  const response = await shiprocketRequest<ReturnResponse>(config, "/orders/create/return", {
    method: "POST",
    body,
    safe: false,
  });
  const returnOrderId = Number(response.order_id);
  const returnShipmentId = Number(response.shipment_id);
  if (!Number.isFinite(returnOrderId) || returnOrderId <= 0) {
    throw new ShiprocketError(
      "SHIPROCKET_RETURN_FAILED",
      `Shiprocket did not create the return${response.message ? `: ${response.message}` : "."}`,
      { status: 502 },
    );
  }

  let returnAwb: string | undefined;
  if (Number.isFinite(returnShipmentId) && returnShipmentId > 0) {
    try {
      const assigned = await assignAwb(context, { shipmentId: returnShipmentId });
      returnAwb = assigned.awbNo;
    } catch {
      // The return exists; the AWB can be generated later from the admin page.
    }
  }

  return {
    returnOrderId,
    returnShipmentId: Number.isFinite(returnShipmentId) && returnShipmentId > 0 ? returnShipmentId : undefined,
    returnAwb,
    status: returnAwb ? "return_created" : "return_created",
  };
}
