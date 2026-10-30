import { getWebConnection } from "@/lib/db";
import { OrderModel } from "@/models/erp/order.model";
import { shiprocketRequest } from "./client";
import { ShiprocketError } from "./errors";
import { mapShiprocketStatus, mergeTrackingEvents, orderStatusForShipping, canAdvanceOrderStatus, canAdvanceShipping, shippingEventKey } from "./status";
import type { ShippingContext } from "./config";
import type { ShippingStatus } from "@/domain/types";
import type { TrackingEvent, TrackingResult } from "./types";

/** Server-side tracking with a short-lived cache and explicit refresh support. */

interface RawTrackActivity {
  date?: string;
  status?: string;
  activity?: string;
  location?: string;
  "sr-status"?: string;
  "sr-status-label"?: string;
}

interface RawTrackData {
  awb_code?: string;
  courier_name?: string;
  current_status?: string;
  current_status_id?: string | number;
  destination?: string;
  etd?: string;
  delivered_date?: string | null;
  track_url?: string;
  shipment_track?: RawTrackActivity[];
  shipment_track_activities?: RawTrackActivity[];
}

interface TrackResponse {
  tracking_data?: RawTrackData;
  data?: RawTrackData;
}

const cache = new Map<string, { result: TrackingResult; expiresAt: number }>();

function cacheKey(context: ShippingContext, key: string): string {
  return `${context.config?.baseUrl ?? "none"}|${key}`;
}

function trackingUrlFor(awb: string, raw?: string): string {
  if (raw && /^https?:\/\//i.test(raw)) {
    // Shiprocket sometimes returns a bare domain; only accept absolute URLs.
    return raw;
  }
  return awb ? `https://shiprocket.co/tracking/${encodeURIComponent(awb)}` : "";
}

function normalizeEvents(raw: RawTrackData): TrackingEvent[] {
  const list = raw.shipment_track_activities ?? raw.shipment_track ?? [];
  if (!Array.isArray(list)) return [];
  return list
    .filter((item): item is RawTrackActivity => Boolean(item) && typeof item === "object")
    .map((item) => ({
      status: (item.status ?? item["sr-status-label"] ?? "Update").toString().slice(0, 120),
      statusCode: item["sr-status"]?.toString(),
      activity: item.activity?.toString().slice(0, 240),
      location: item.location?.toString().slice(0, 120),
      date: item.date?.toString(),
    }))
    .reverse()
    .slice(-100);
}

function normalizeTracking(key: { awb?: string; shipmentId?: number }, body: TrackResponse): TrackingResult {
  const raw = body.tracking_data ?? body.data ?? {};
  const awb = (raw.awb_code || key.awb || "").toString();
  const rawStatus = (raw.current_status || "").toString();
  const status = mapShiprocketStatus(rawStatus) ?? "in_transit";
  if (!awb) {
    throw new ShiprocketError("SHIPROCKET_BAD_RESPONSE", "Shiprocket returned tracking data without an AWB.", { status: 502 });
  }
  return {
    awb,
    courierName: raw.courier_name,
    status,
    statusCode: raw.current_status_id != null ? String(raw.current_status_id) : undefined,
    estimatedDelivery: raw.etd,
    trackingUrl: trackingUrlFor(awb, raw.track_url),
    events: normalizeEvents(raw),
    updatedAt: new Date().toISOString(),
  };
}

export interface TrackingTarget {
  awb?: string;
  shipmentId?: number;
  orderId?: number;
}

/**
 * GET /courier/track/awb/:awb (falls back to the shipment endpoint).
 * Results are reused for `trackingCacheMinutes` unless `refresh` is set.
 */
export async function getTracking(
  context: ShippingContext,
  target: TrackingTarget,
  options: { refresh?: boolean } = {},
): Promise<TrackingResult> {
  const config = context.config;
  if (!config) throw new ShiprocketError("SHIPROCKET_NOT_CONFIGURED", "Shiprocket is not configured on the server.", { status: 503 });
  if (!target.awb && !target.shipmentId) {
    throw new ShiprocketError("SHIPROCKET_NO_SHIPMENT", "This order has no Shiprocket shipment to track yet.", { status: 409 });
  }

  const key = cacheKey(context, target.awb || `s${target.shipmentId}`);
  const cached = cache.get(key);
  if (!options.refresh && cached && cached.expiresAt > Date.now()) return cached.result;

  const path = target.awb
    ? `/courier/track/awb/${encodeURIComponent(target.awb)}`
    : `/courier/track/shipment/${target.shipmentId}`;
  const body = await shiprocketRequest<TrackResponse>(config, path, { safe: true });
  const result = normalizeTracking({ awb: target.awb, shipmentId: target.shipmentId }, body);

  const ttl = Math.max(1, context.shipping.trackingCacheMinutes) * 60 * 1000;
  cache.set(key, { result, expiresAt: Date.now() + ttl });
  return result;
}

export function clearTrackingCache() {
  cache.clear();
}

/**
 * Persist a tracking result on the order (shipping snapshot + forward-only
 * order status). Shared by the customer/admin refresh endpoints.
 */
export async function applyTrackingToOrder(orderNo: string, result: TrackingResult): Promise<void> {
  const M = OrderModel(await getWebConnection());
  const doc = await M.findOne({ orderNo }).lean<{ orderStatus?: string; shipping?: { status?: string } }>();
  if (!doc) return;

  const set: Record<string, unknown> = {
    "shipping.awbNo": result.awb,
    "shipping.trackingStatus": result.status,
    "shipping.trackingUpdatedAt": result.updatedAt,
    "shipping.trackingUrl": result.trackingUrl || undefined,
    "shipping.updatedAt": result.updatedAt,
    awbNo: result.awb,
  };
  if (result.courierName) {
    set["shipping.courierName"] = result.courierName;
    set.courierName = result.courierName;
  }
  if (result.estimatedDelivery) set["shipping.estimatedDelivery"] = result.estimatedDelivery;
  const nextShippingStatus = result.status as ShippingStatus;
  if (canAdvanceShipping(doc.shipping?.status as ShippingStatus | undefined, nextShippingStatus)) set["shipping.status"] = nextShippingStatus;
  if (result.status === "delivered") set["shipping.returnDeliveredAt"] = undefined;
  for (const [k, v] of Object.entries(set)) if (v === undefined) delete set[k];

  const update: Record<string, unknown> = { $set: set };
  if (result.events.length) {
    update.$push = { "shipping.trackingEvents": { $each: result.events, $slice: -100 } };
  }

  const nextOrderStatus = orderStatusForShipping(nextShippingStatus);
  if (nextOrderStatus && canAdvanceOrderStatus(doc.orderStatus, nextOrderStatus)) {
    set.orderStatus = nextOrderStatus;
    (update.$push as Record<string, unknown>).statusHistory = {
      status: nextOrderStatus,
      note: `Shiprocket tracking: ${result.status}`,
      by: "shiprocket",
      at: new Date(),
    };
  }

  await M.updateOne({ orderNo }, update);
}

/** Store the latest event list de-duplicated (used by the webhook). */
export function trackingEventsFrom(result: TrackingResult): TrackingEvent[] {
  return mergeTrackingEvents([], result.events);
}

export { shippingEventKey };
