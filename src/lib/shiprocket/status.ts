import type { OrderStatus, ShippingStatus } from "@/domain/types";
import type { TrackingEvent } from "./types";

/**
 * Shiprocket status -> local fulfilment status mapping.
 * Every webhook/tracking status goes through here so the storefront and admin
 * always show the same vocabulary, and an out-of-order event can never move an
 * order backwards (see `canAdvanceShipping`).
 */

const normalize = (raw: string) => raw.replace(/[_]+/g, " ").replace(/\s+/g, " ").trim().toUpperCase();

/** Shiprocket status text (any known spelling) -> fulfilment status, or null when unknown. */
export function mapShiprocketStatus(raw: string): ShippingStatus | null {
  const s = normalize(raw);
  if (!s) return null;

  if (s.includes("RTO")) {
    if (s.includes("DELIVERED") || /(^|\s)DTO(\s|$)/.test(s)) return "rto_delivered";
    if (s.includes("OUT FOR DELIVERY") || /(^|\s)OFD(\s|$)/.test(s)) return "rto_out_for_delivery";
    if (/(INITIATED|ACKNOWLEDGED|REQUESTED|SCHEDULED)/.test(s)) return "rto_initiated";
    return "rto_in_transit";
  }

  if (s.includes("RETURN")) {
    if (s.includes("DELIVERED")) return "returned";
    if (/(IN TRANSIT|PICKED|SHIPPED|OUT FOR DELIVERY|DISPATCHED)/.test(s)) return "return_in_transit";
    return "return_created";
  }

  if (/CANCEL/.test(s)) return "cancelled";
  if (/^(DELIVERED|DELIVERED TO CONSUMER)$/.test(s)) return "delivered";
  if (s.includes("OUT FOR DELIVERY")) return "out_for_delivery";
  if (/(UNDELIVERED|NDR|DELIVERY FAILED|DELIVERY ATTEMPT|REFUSED)/.test(s)) return "undelivered";
  if (/(IN TRANSIT|PICKED UP|PICKED|SHIPPED|REACHED|DISPATCHED|BAGGED)/.test(s)) return "in_transit";
  if (/(PICKUP SCHEDULED|PICKUP QUEUED|PICKUP GENERATED|PICKUP RESCHEDULED)/.test(s)) return "pickup_scheduled";
  if (/(AWB ASSIGNED|AWB GENERATED)/.test(s)) return "awb_assigned";
  if (s === "NEW" || s === "CREATED" || s.includes("MANIFEST GENERATED") || s.includes("LABEL GENERATED")) return "created";
  return null;
}

/** Only forward movement is allowed; terminal states never move again. */
const RANK: Record<ShippingStatus, number> = {
  not_configured: 0,
  not_created: 1,
  creating: 2,
  failed: 2,
  created: 3,
  awb_assigned: 4,
  pickup_scheduled: 5,
  in_transit: 6,
  out_for_delivery: 7,
  delivered: 8,
  undelivered: 7,
  cancelled: 9,
  rto_initiated: 8,
  rto_in_transit: 9,
  rto_out_for_delivery: 10,
  rto_delivered: 11,
  return_created: 9,
  return_in_transit: 10,
  returned: 11,
};

export const TERMINAL_SHIPPING_STATUSES: ShippingStatus[] = [
  "delivered",
  "cancelled",
  "returned",
  "rto_delivered",
];

export function isTerminalShippingStatus(status: ShippingStatus): boolean {
  return TERMINAL_SHIPPING_STATUSES.includes(status);
}

/** True when `next` is progress compared with `current`. */
export function canAdvanceShipping(current: ShippingStatus | undefined, next: ShippingStatus): boolean {
  if (!current) return true;
  if (isTerminalShippingStatus(current)) return false;
  if (current === next) return false;
  return RANK[next] > RANK[current];
}

const ORDER_STATUS_FOR_SHIPPING: Partial<Record<ShippingStatus, OrderStatus>> = {
  created: "Packed",
  awb_assigned: "Packed",
  pickup_scheduled: "Packed",
  in_transit: "Shipped",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  rto_delivered: "Returned",
  returned: "Returned",
};

/** Order-level status that a fulfilment status implies (null = leave the order status alone). */
export function orderStatusForShipping(status: ShippingStatus): OrderStatus | null {
  return ORDER_STATUS_FOR_SHIPPING[status] ?? null;
}

const ORDER_RANK: Record<OrderStatus, number> = {
  Placed: 0,
  Confirmed: 1,
  Packed: 2,
  Shipped: 3,
  "Out for delivery": 4,
  Delivered: 5,
  Cancelled: 6,
  Returned: 7,
};

/** Never downgrade Delivered/Returned/Cancelled because of a stale tracking event. */
export function canAdvanceOrderStatus(current: string | undefined, next: OrderStatus): boolean {
  if (!current) return true;
  if (current === "Delivered" || current === "Returned") return false;
  if (current === "Cancelled") return next === "Returned";
  if (next === "Cancelled" || next === "Returned") return current !== "Delivered" && current !== next;
  return (ORDER_RANK[next] ?? -1) > (ORDER_RANK[current as OrderStatus] ?? -1);
}

/** Stable de-duplication key for one tracking/webhook event. */
export function shippingEventKey(event: {
  awb?: string;
  shipmentId?: number | string;
  orderNo?: string;
  status: string;
  statusCode?: string;
  date?: string;
}): string {
  const who = event.awb || (event.shipmentId != null ? `s${event.shipmentId}` : event.orderNo || "");
  return [who, event.status, event.statusCode ?? "", event.date ?? ""].join("|").slice(0, 240);
}

/** Cap stored events and drop exact repeats (keeps the newest). */
export function mergeTrackingEvents(existing: TrackingEvent[], incoming: TrackingEvent[], limit = 100): TrackingEvent[] {
  const seen = new Set<string>();
  const out: TrackingEvent[] = [];
  for (const event of [...existing, ...incoming]) {
    const key = `${event.date ?? ""}|${event.status}|${event.activity ?? ""}|${event.location ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(event);
  }
  return out.slice(-limit);
}
