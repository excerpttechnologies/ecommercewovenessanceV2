import type { OrderShipping, ShippingStatus } from "@/domain/types";

/** All shipping states an order can be in. Stored on the existing order document. */
export const SHIPPING_STATUSES: ShippingStatus[] = [
  "not_configured",
  "not_created",
  "creating",
  "created",
  "awb_assigned",
  "pickup_scheduled",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "undelivered",
  "rto_initiated",
  "rto_in_transit",
  "rto_out_for_delivery",
  "rto_delivered",
  "return_created",
  "return_in_transit",
  "returned",
  "failed",
];

export const SHIPPING_STATUS_LABELS: Record<ShippingStatus, string> = {
  not_configured: "Not configured",
  not_created: "Not shipped",
  creating: "Creating shipment",
  created: "Shipment created",
  awb_assigned: "AWB assigned",
  pickup_scheduled: "Pickup scheduled",
  in_transit: "In transit",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  undelivered: "Undelivered / NDR",
  rto_initiated: "RTO initiated",
  rto_in_transit: "RTO in transit",
  rto_out_for_delivery: "RTO out for delivery",
  rto_delivered: "RTO delivered",
  return_created: "Return created",
  return_in_transit: "Return in transit",
  returned: "Returned",
  failed: "Shipment failed",
};

export const EMPTY_ORDER_SHIPPING: OrderShipping = {
  status: "not_created",
  trackingEvents: [],
  events: [],
};

const num = (value: unknown): number | undefined => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};
const text = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;
const bool = (value: unknown): boolean | undefined => (typeof value === "boolean" ? value : undefined);

function normalizePackage(value: unknown): OrderShipping["package"] {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Record<string, unknown>;
  const weight = num(raw.weight);
  const length = num(raw.length);
  const breadth = num(raw.breadth);
  const height = num(raw.height);
  if (weight == null && length == null && breadth == null && height == null) return undefined;
  return {
    weight: weight ?? 0,
    length: length ?? 0,
    breadth: breadth ?? 0,
    height: height ?? 0,
  };
}

function normalizeTrackingEvents(value: unknown): OrderShipping["trackingEvents"] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      status: text(item.status) ?? "Update",
      statusCode: text(item.statusCode),
      activity: text(item.activity),
      location: text(item.location),
      date: text(item.date),
      awb: text(item.awb),
    }))
    .slice(-100);
}

function normalizeCouriers(value: unknown): OrderShipping["couriers"] {
  if (!Array.isArray(value)) return undefined;
  const couriers = value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => {
      const id = item.id;
      const name = text(item.name);
      if ((typeof id !== "string" && typeof id !== "number") || !name) return null;
      return {
        id,
        name,
        rate: num(item.rate) ?? 0,
        cod: item.cod === true,
        etaDays: num(item.etaDays),
        estimatedDelivery: text(item.estimatedDelivery),
        rating: num(item.rating),
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .slice(0, 12);
  return couriers.length ? couriers : undefined;
}

/** Migration-safe defaults for old orders that have no `shipping` object yet. */
export function normalizeOrderShipping(input?: Partial<OrderShipping> | null): OrderShipping {
  const raw = input ?? {};
  const status = (SHIPPING_STATUSES as string[]).includes(String(raw.status))
    ? (raw.status as ShippingStatus)
    : EMPTY_ORDER_SHIPPING.status;
  const lastError =
    raw.lastError && typeof raw.lastError === "object"
      ? {
          code: text(raw.lastError.code) ?? "SHIPROCKET_ERROR",
          message: text(raw.lastError.message) ?? "Shipment action failed",
          at: text(raw.lastError.at) ?? new Date().toISOString(),
        }
      : undefined;
  return {
    status,
    provider: raw.provider === "shiprocket" || raw.provider === "flat" ? raw.provider : undefined,
    quotedCharge: num(raw.quotedCharge),
    baseCharge: num(raw.baseCharge),
    codAvailable: bool(raw.codAvailable),
    courierId: raw.courierId,
    courierName: text(raw.courierName),
    etaDays: num(raw.etaDays),
    estimatedDelivery: text(raw.estimatedDelivery),
    trackingUrl: text(raw.trackingUrl),
    trackingStatus: text(raw.trackingStatus),
    trackingUpdatedAt: text(raw.trackingUpdatedAt),
    trackingEvents: normalizeTrackingEvents(raw.trackingEvents),
    couriers: normalizeCouriers(raw.couriers),
    package: normalizePackage(raw.package),
    shiprocketOrderId: num(raw.shiprocketOrderId),
    shiprocketShipmentId: num(raw.shiprocketShipmentId),
    awbNo: text(raw.awbNo),
    pickupRequested: bool(raw.pickupRequested),
    pickupScheduledDate: text(raw.pickupScheduledDate),
    labelUrl: text(raw.labelUrl),
    manifestUrl: text(raw.manifestUrl),
    invoiceUrl: text(raw.invoiceUrl),
    lastError,
    returnOrderId: num(raw.returnOrderId),
    returnShipmentId: num(raw.returnShipmentId),
    returnAwb: text(raw.returnAwb),
    returnStatus: text(raw.returnStatus),
    returnRequestedAt: text(raw.returnRequestedAt),
    returnDeliveredAt: text(raw.returnDeliveredAt),
    rtoInitiatedAt: text(raw.rtoInitiatedAt),
    rtoDeliveredAt: text(raw.rtoDeliveredAt),
    cancelledAt: text(raw.cancelledAt),
    events: Array.isArray(raw.events) ? raw.events.map(String).filter(Boolean).slice(-100) : [],
    updatedAt: text(raw.updatedAt),
  };
}

/** Fields that must never be copied from a client payload. */
export function shippingForNewOrder(input?: Partial<OrderShipping> | null): OrderShipping {
  const normalized = normalizeOrderShipping(input);
  return {
    ...normalized,
    status: normalized.status === "not_created" ? "not_created" : normalized.status,
    shiprocketOrderId: undefined,
    shiprocketShipmentId: undefined,
    awbNo: undefined,
    labelUrl: undefined,
    manifestUrl: undefined,
    invoiceUrl: undefined,
    returnOrderId: undefined,
    returnShipmentId: undefined,
    returnAwb: undefined,
    lastError: undefined,
    events: [],
    updatedAt: new Date().toISOString(),
  };
}
