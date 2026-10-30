import { timingSafeEqual } from "node:crypto";
import { getWebConnection } from "@/lib/db";
import { OrderModel } from "@/models/erp/order.model";
import type { AnyDoc } from "@/models/_util";
import {
  canAdvanceOrderStatus,
  canAdvanceShipping,
  mapShiprocketStatus,
  orderStatusForShipping,
  shippingEventKey,
} from "./status";
import type { ShippingStatus } from "@/domain/types";

/**
 * Shiprocket webhook: token auth, event validation, duplicate protection,
 * forward-only status updates and safe out-of-order handling.
 *
 * Configure in Shiprocket → Settings → API → Webhooks:
 *   URL   : https://<site>/api/v1/shipping/webhook  (Shiprocket rejects URLs containing "shiprocket")
 *   Token : the value of SHIPROCKET_WEBHOOK_TOKEN (sent in the x-api-key header)
 */

export interface ShippingWebhookEvent {
  orderNo?: string;
  awb?: string;
  shipmentId?: number;
  courierName?: string;
  rawStatus: string;
  status: ShippingStatus;
  statusCode?: string;
  date?: string;
  location?: string;
  activity?: string;
  eventKey: string;
}

export function verifyWebhookToken(headers: Headers): { ok: true } | { ok: false; reason: "not_configured" | "unauthorized" } {
  const expected = process.env.SHIPROCKET_WEBHOOK_TOKEN?.trim();
  if (!expected) return { ok: false, reason: "not_configured" };
  const received = headers.get("x-api-key")?.trim();
  if (!received) return { ok: false, reason: "unauthorized" };
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  const match = a.length === b.length && timingSafeEqual(a, b);
  return match ? { ok: true } : { ok: false, reason: "unauthorized" };
}

const str = (value: unknown): string | undefined => {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
};

/** Normalise the handful of payload shapes Shiprocket posts for tracking updates. */
export function parseWebhookPayload(body: unknown): ShippingWebhookEvent | null {
  if (!body || typeof body !== "object") return null;
  const raw = body as Record<string, unknown>;
  const shipment = (raw.shipment && typeof raw.shipment === "object" ? raw.shipment : {}) as Record<string, unknown>;
  const scan = (raw.scan && typeof raw.scan === "object" ? raw.scan : {}) as Record<string, unknown>;

  const rawStatus =
    str(raw.current_status) ??
    str(raw.shipment_status) ??
    str(raw.status) ??
    str(scan.status) ??
    str(raw.activity) ??
    "";
  const status = mapShiprocketStatus(rawStatus);
  if (!status) return null;

  const orderNo = str(raw.order_id) ?? str(raw.order_no) ?? str(shipment.order_id) ?? str(raw.channel_order_id);
  const awb = str(raw.awb) ?? str(raw.awb_code) ?? str(shipment.awb) ?? str(shipment.awb_code);
  const shipmentIdRaw = str(raw.shipment_id) ?? str(shipment.id);
  const shipmentId = shipmentIdRaw && /^\d+$/.test(shipmentIdRaw) ? Number(shipmentIdRaw) : undefined;
  if (!orderNo && !awb && !shipmentId) return null;

  const statusCode = str(raw.current_status_id) ?? str(raw.status_code) ?? str(scan.status_code);
  const date = str(raw.event_time) ?? str(raw.updated_at) ?? str(raw.scan_datetime) ?? str(scan.date) ?? str(raw.timestamp);
  const location = str(raw.location) ?? str(scan.location);
  const activity = str(raw.activity) ?? str(raw.description) ?? str(scan.activity);
  const courierName = str(raw.courier_name) ?? str(shipment.courier_name);

  return {
    orderNo,
    awb,
    shipmentId,
    courierName,
    rawStatus,
    status,
    statusCode,
    date,
    location,
    activity,
    eventKey: shippingEventKey({ awb, shipmentId, orderNo, status, statusCode, date }),
  };
}

async function findOrder(M: ReturnType<typeof OrderModel>, event: ShippingWebhookEvent) {
  if (event.orderNo) {
    const byNo = await M.findOne({ orderNo: event.orderNo }).lean<AnyDoc>();
    if (byNo) return byNo;
  }
  if (event.awb) {
    const byAwb = await M.findOne({ $or: [{ awbNo: event.awb }, { "shipping.awbNo": event.awb }] }).lean<AnyDoc>();
    if (byAwb) return byAwb;
  }
  if (event.shipmentId) {
    return M.findOne({
      $or: [{ shiprocketShipmentId: event.shipmentId }, { "shipping.shiprocketShipmentId": event.shipmentId }],
    }).lean<AnyDoc>();
  }
  return null;
}

export interface WebhookApplyResult {
  ok: boolean;
  matched: boolean;
  ignored?: "duplicate" | "out_of_order" | "not_found" | "unsupported";
}

/** Apply one validated event. Never lets an older event downgrade an order. */
export async function applyShippingWebhook(body: unknown): Promise<WebhookApplyResult> {
  const event = parseWebhookPayload(body);
  if (!event) return { ok: true, matched: false, ignored: "unsupported" };

  const M = OrderModel(await getWebConnection());
  const doc = await findOrder(M, event);
  if (!doc) return { ok: true, matched: false, ignored: "not_found" };

  const storedEvents: string[] = Array.isArray(doc?.shipping?.events) ? doc.shipping.events.map(String) : [];
  if (storedEvents.includes(event.eventKey)) return { ok: true, matched: true, ignored: "duplicate" };

  const currentShipping = doc?.shipping?.status as ShippingStatus | undefined;
  const shippingAdvances = canAdvanceShipping(currentShipping, event.status);

  const nextOrderStatus = orderStatusForShipping(event.status);
  const orderAdvances = nextOrderStatus ? canAdvanceOrderStatus(String(doc.orderStatus), nextOrderStatus) : false;

  if (!shippingAdvances && !orderAdvances) return { ok: true, matched: true, ignored: "out_of_order" };

  const now = new Date();
  const set: Record<string, unknown> = {
    "shipping.trackingStatus": event.rawStatus,
    "shipping.trackingUpdatedAt": now.toISOString(),
    "shipping.updatedAt": now.toISOString(),
  };
  if (shippingAdvances) set["shipping.status"] = event.status;
  if (event.awb) {
    set["shipping.awbNo"] = event.awb;
    if (!doc.awbNo) set.awbNo = event.awb;
  }
  if (event.courierName) {
    set["shipping.courierName"] = event.courierName;
    if (!doc.courierName) set.courierName = event.courierName;
  }
  if (event.status === "rto_initiated" && !doc?.shipping?.rtoInitiatedAt) set["shipping.rtoInitiatedAt"] = now.toISOString();
  if (event.status === "rto_delivered") set["shipping.rtoDeliveredAt"] = now.toISOString();
  if (event.status === "returned") set["shipping.returnDeliveredAt"] = now.toISOString();
  if (event.status === "cancelled") set["shipping.cancelledAt"] = now.toISOString();
  if (orderAdvances && nextOrderStatus) set.orderStatus = nextOrderStatus;

  const trackingEvent = {
    status: event.rawStatus,
    statusCode: event.statusCode,
    activity: event.activity,
    location: event.location,
    date: event.date,
    awb: event.awb,
  };

  const update: Record<string, unknown> = {
    $set: set,
    $push: {
      "shipping.events": { $each: [event.eventKey], $slice: -100 },
      "shipping.trackingEvents": { $each: [trackingEvent], $slice: -100 },
    },
  };
  if (orderAdvances && nextOrderStatus) {
    (update.$push as Record<string, unknown>).statusHistory = {
      status: nextOrderStatus,
      note: `Shiprocket: ${event.rawStatus}`,
      by: "shiprocket",
      at: now,
    };
  }

  // The guard makes the write idempotent even when two webhooks race.
  const applied = await M.findOneAndUpdate(
    { _id: doc._id, "shipping.events": { $ne: event.eventKey } },
    update,
    { new: false },
  ).lean<AnyDoc>();
  if (!applied) return { ok: true, matched: true, ignored: "duplicate" };

  return { ok: true, matched: true };
}
