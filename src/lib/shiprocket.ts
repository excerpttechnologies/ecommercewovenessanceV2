/**
 * Shiprocket helper (server-only).
 *
 * This module is kept as the stable, backwards-compatible entry point: it
 * re-exports the modular implementation in `./shiprocket/*` and keeps the
 * original `shipOrder()` helper for existing callers.
 */

import { getShippingContext } from "./shiprocket/config";
import { computePackage } from "./shiprocket/package";
import { createShipment } from "./shiprocket/shipments";

export * from "./shiprocket/index";

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
  courierId?: number | string;
}

export interface ShipResult {
  shiprocketOrderId: number;
  shipmentId: number;
  awbNo?: string;
  courierName?: string;
  pickupRequested: boolean;
}

export function isShiprocketConfigured(): boolean {
  return Boolean(
    process.env.SHIPROCKET_EMAIL?.trim() &&
      process.env.SHIPROCKET_PASSWORD?.trim() &&
      process.env.SHIPROCKET_PICKUP_LOCATION?.trim(),
  );
}

/**
 * Legacy single-shot helper: create order, assign AWB, request pickup.
 * Prefer `createShipmentForOrder()` from `./shiprocket/auto` for website orders —
 * it is idempotent and persists the result on the order.
 */
export async function shipOrder(o: ShipOrderInput): Promise<ShipResult> {
  const context = await getShippingContext();
  if (!context.config) {
    throw Object.assign(
      new Error(
        "Shiprocket is not configured. Add SHIPROCKET_EMAIL, SHIPROCKET_PASSWORD and SHIPROCKET_PICKUP_LOCATION to the server environment.",
      ),
      { status: 503, code: "SHIPROCKET_NOT_CONFIGURED" },
    );
  }
  const pkg = computePackage(
    o.items.map((item) => ({ sku: item.sku, qty: item.qty })),
    {
      weightKg: context.config.defaultWeightKg,
      lengthCm: context.config.defaultLengthCm,
      breadthCm: context.config.defaultBreadthCm,
      heightCm: context.config.defaultHeightCm,
    },
  );
  const result = await createShipment(
    context,
    {
      orderNo: o.orderNo,
      createdAt: o.createdAt,
      paymentMode: o.paymentMode,
      netAmount: o.netAmount,
      subTotal: o.subTotal,
      shippingCharge: o.shippingCharge,
      items: o.items.map((item) => ({
        name: item.name,
        sku: item.sku,
        qty: item.qty,
        rate: item.rate,
        discount: item.discount,
        tax: item.gst,
      })),
      address: o.address,
      package: pkg,
      email: o.email,
      courierId: o.courierId,
    },
    { assignAwb: true, requestPickup: true },
  );
  if (!result.shiprocketOrderId || !result.shipmentId) {
    throw new Error("Shiprocket did not return an order/shipment id.");
  }
  return {
    shiprocketOrderId: result.shiprocketOrderId,
    shipmentId: result.shipmentId,
    awbNo: result.awbNo,
    courierName: result.courierName,
    pickupRequested: result.pickupRequested,
  };
}
