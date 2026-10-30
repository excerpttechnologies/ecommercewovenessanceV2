import { getWebConnection } from "@/lib/db";
import { OrderModel } from "@/models/erp/order.model";
import type { AnyDoc } from "@/models/_util";
import { getShippingContext, type ShippingContext } from "./config";
import { computePackage } from "./package";
import { packageDefaultsFromConfig, resolvePackageItems } from "./package-server";
import { createShipment } from "./shipments";
import { safeError } from "./errors";
import { defaultsFromContext } from "./checkout";
import type { PackageDimensions, ShipmentResult } from "./types";

/**
 * Automatic, idempotent shipment creation inside the existing payment lifecycle:
 * prepaid orders ship after payment, COD orders ship after acceptance.
 */

const LOCK_TTL_MS = 5 * 60 * 1000;

export type ShipmentTrigger = "payment" | "cod_acceptance" | "admin" | "retry";

export interface AutoShipmentOptions {
  trigger?: ShipmentTrigger;
  courierId?: number | string;
  /** Admin actions surface Shiprocket errors; background triggers only store them. */
  throwOnError?: boolean;
}

async function orderShippingPackage(
  doc: AnyDoc,
  context: ShippingContext,
): Promise<PackageDimensions> {
  const stored = doc?.shipping?.package;
  if (
    stored &&
    typeof stored.weight === "number" &&
    typeof stored.length === "number" &&
    typeof stored.breadth === "number" &&
    typeof stored.height === "number" &&
    stored.weight > 0
  ) {
    return { weight: stored.weight, length: stored.length, breadth: stored.breadth, height: stored.height };
  }
  const items = Array.isArray(doc?.items) ? doc.items : [];
  const resolved = await resolvePackageItems(
    items.map((item: AnyDoc) => ({ sku: String(item.sku), qty: Math.max(1, Number(item.qty) || 1) })),
  );
  const defaults = context.config
    ? packageDefaultsFromConfig(context.config)
    : defaultsFromContext(context);
  return computePackage(resolved, defaults);
}

function eligibilityFailure(doc: AnyDoc): string | null {
  const status = String(doc?.orderStatus ?? "Placed");
  if (status === "Cancelled" || status === "Returned") return "order_closed";
  if (String(doc?.paymentMode) !== "COD" && String(doc?.paymentStatus) !== "Paid") return "payment_pending";
  if (String(doc?.paymentMode) === "COD" && !["Confirmed", "Packed", "Shipped"].includes(status)) {
    return "cod_not_accepted";
  }
  return null;
}

/**
 * Create one Shiprocket shipment for a website order.
 * Returns `alreadyExisted` for a second call — an atomic lock prevents two
 * concurrent attempts from creating duplicate shipments.
 */
export async function createShipmentForOrder(
  orderNo: string,
  options: AutoShipmentOptions = {},
): Promise<ShipmentResult> {
  const context = await getShippingContext();
  const empty: ShipmentResult = { alreadyExisted: false, skipped: true, pickupRequested: false, warnings: [] };

  if (!context.config) {
    return { ...empty, reason: "shiprocket_not_configured" };
  }

  const M = OrderModel(await getWebConnection());
  const doc = await M.findOne({ orderNo }).lean<AnyDoc>();
  if (!doc) return { ...empty, reason: "order_not_found" };

  if (doc.shiprocketShipmentId) {
    return {
      alreadyExisted: true,
      shiprocketOrderId: Number(doc.shiprocketOrderId) || undefined,
      shipmentId: Number(doc.shiprocketShipmentId) || undefined,
      awbNo: doc.awbNo ?? doc?.shipping?.awbNo,
      courierName: doc.courierName ?? doc?.shipping?.courierName,
      pickupRequested: Boolean(doc?.shipping?.pickupRequested),
      warnings: [],
    };
  }

  const blocked = eligibilityFailure(doc);
  if (blocked) return { ...empty, reason: blocked };

  const now = new Date();
  const stale = new Date(now.getTime() - LOCK_TTL_MS);
  const claimed = await M.findOneAndUpdate(
    {
      orderNo,
      shiprocketShipmentId: { $exists: false },
      $or: [{ shiprocketLock: { $exists: false } }, { shiprocketLock: { $lt: stale } }, { shiprocketLock: null }],
    },
    { $set: { shiprocketLock: now, "shipping.status": "creating", "shipping.updatedAt": now.toISOString() } },
    { new: true },
  ).lean<AnyDoc>();
  if (!claimed) return { ...empty, reason: "shipment_in_progress" };

  try {
    const pkg = await orderShippingPackage(claimed, context);
    const address = claimed.shippingAddress ?? {};
    const result = await createShipment(
      context,
      {
        orderNo,
        createdAt: claimed.createdAt ?? new Date(),
        paymentMode: String(claimed.paymentMode ?? "COD"),
        netAmount: Number(claimed.netAmount) || 0,
        subTotal: Number(claimed.subTotal) || Number(claimed.netAmount) || 0,
        shippingCharge: Number(claimed.shippingCharge) || 0,
        items: (claimed.items ?? []).map((item: AnyDoc) => ({
          name: item.productName ?? item.name ?? item.sku,
          sku: String(item.sku),
          qty: Math.max(1, Number(item.qty) || 1),
          rate: Number(item.rate) || 0,
          discount: Number(item.discount) || 0,
          tax: Number(item.gst) || 0,
        })),
        address: {
          name: address.name,
          phone: address.phone,
          line1: address.line1,
          line2: address.line2,
          city: address.city,
          state: address.state,
          pincode: address.pincode,
          country: address.country,
          email: claimed.customerEmail,
        },
        package: pkg,
        courierId: options.courierId,
      },
      { assignAwb: context.shipping.autoAssignAwb, requestPickup: context.shipping.autoRequestPickup },
    );

    const shippingStatus =
      result.awbNo && result.pickupRequested
        ? "pickup_scheduled"
        : result.awbNo
          ? "awb_assigned"
          : "created";
    const nextOrderStatus = ["Placed", "Confirmed"].includes(String(claimed.orderStatus)) ? "Packed" : String(claimed.orderStatus);
    const note = `Shiprocket shipment ${result.shipmentId}${result.awbNo ? ` · AWB ${result.awbNo}` : " (AWB pending)"}${result.courierName ? ` · ${result.courierName}` : ""}${result.warnings.length ? ` · ${result.warnings.join("; ")}` : ""}`;

    await M.updateOne(
      { orderNo },
      {
        $set: {
          shiprocketOrderId: result.shiprocketOrderId,
          shiprocketShipmentId: result.shipmentId,
          ...(result.awbNo ? { awbNo: result.awbNo } : {}),
          ...(result.courierName ? { courierName: result.courierName } : {}),
          orderStatus: nextOrderStatus,
          "shipping.status": shippingStatus,
          "shipping.provider": "shiprocket",
          "shipping.shiprocketOrderId": result.shiprocketOrderId,
          "shipping.shiprocketShipmentId": result.shipmentId,
          ...(result.awbNo ? { "shipping.awbNo": result.awbNo } : {}),
          ...(result.courierName ? { "shipping.courierName": result.courierName } : {}),
          "shipping.pickupRequested": result.pickupRequested,
          "shipping.package": pkg,
          "shipping.updatedAt": new Date().toISOString(),
        },
        $unset: { shiprocketLock: "", "shipping.lastError": "" },
        $push: {
          statusHistory: { status: nextOrderStatus, note, by: options.trigger ?? "system", at: new Date() },
        },
      },
    );

    return { ...result, warnings: result.warnings };
  } catch (error) {
    const safe = safeError(error);
    await M.updateOne(
      { orderNo },
      {
        $set: {
          "shipping.status": "failed",
          "shipping.lastError": { code: safe.code, message: safe.message, at: new Date().toISOString() },
          "shipping.updatedAt": new Date().toISOString(),
        },
        $unset: { shiprocketLock: "" },
      },
    ).catch(() => {});
    if (options.throwOnError) throw error;
    console.warn(`[shiprocket] auto shipment failed for ${orderNo}: ${safe.code}`);
    return { ...empty, reason: safe.code, warnings: [safe.message] };
  }
}

/**
 * Run shipment creation after the response has been sent (Next.js `after`),
 * so checkout/webhooks never wait on Shiprocket. Falls back to fire-and-forget
 * when `after` is unavailable (tests, scripts).
 */
export async function scheduleShipment(orderNo: string, options: AutoShipmentOptions = {}): Promise<void> {
  const run = async () => {
    try {
      await createShipmentForOrder(orderNo, options);
    } catch (error) {
      console.warn("[shiprocket] scheduled shipment failed", safeError(error).code);
    }
  };
  let queued = false;
  try {
    const mod = await import("next/server");
    mod.after(run);
    queued = true;
  } catch {
    queued = false;
  }
  if (!queued) void run();
}

/** Settings gate used by the payment lifecycle. */
export async function autoShipmentsEnabled(): Promise<boolean> {
  const context = await getShippingContext();
  return Boolean(context.config) && context.shipping.enabled && context.shipping.autoCreateShipments;
}
