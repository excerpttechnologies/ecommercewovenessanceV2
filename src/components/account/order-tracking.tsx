"use client";
import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Loader2, RefreshCw, Truck } from "lucide-react";

interface TrackingEvent {
  status: string;
  activity?: string;
  location?: string;
  date?: string;
}

interface TrackingPayload {
  available: boolean;
  status?: string;
  message?: string;
  trackingUrl?: string;
  etaDays?: number;
  estimatedDelivery?: string;
  tracking?: {
    awb: string;
    courierName?: string;
    status: string;
    estimatedDelivery?: string;
    trackingUrl?: string;
    events: TrackingEvent[];
    updatedAt: string;
  };
}

const LABELS: Record<string, string> = {
  not_created: "Not shipped yet",
  creating: "Preparing shipment",
  created: "Shipment created",
  awb_assigned: "AWB assigned",
  pickup_scheduled: "Pickup scheduled",
  in_transit: "In transit",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  undelivered: "Delivery attempted",
  rto_initiated: "Return to origin started",
  rto_in_transit: "Returning to origin",
  rto_out_for_delivery: "Return out for delivery",
  rto_delivered: "Returned to origin",
  return_created: "Return created",
  return_in_transit: "Return in transit",
  returned: "Return delivered",
  failed: "Shipment could not be created",
};

/** Customer tracking panel: server-side tracking with an explicit refresh. */
export function OrderTracking({
  orderNo,
  phone,
  onUpdated,
}: {
  orderNo: string;
  phone?: string;
  onUpdated?: () => void;
}) {
  const [data, setData] = useState<TrackingPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (refresh: boolean) => {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (phone) params.set("phone", phone);
        if (refresh) params.set("refresh", "1");
        const res = await fetch(`/api/v1/orders/${encodeURIComponent(orderNo)}/tracking?${params.toString()}`, {
          cache: "no-store",
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.ok === false) throw new Error(json?.error?.message ?? "Could not load tracking");
        setData(json.data as TrackingPayload);
        if (refresh) onUpdated?.();
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [orderNo, phone, onUpdated],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  const tracking = data?.tracking;
  const status = tracking?.status ?? data?.status;
  const events = tracking?.events ?? [];
  const trackingUrl = tracking?.trackingUrl ?? data?.trackingUrl;

  return (
    <div className="mt-5 rounded-xl border border-line bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Truck className="h-4 w-4 text-maroon" />
          {status ? LABELS[status] ?? status : "Tracking"}
        </p>
        <button
          type="button"
          onClick={() => void load(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[11px] font-semibold text-ink hover:border-maroon hover:text-maroon disabled:opacity-50"
        >
          {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Refresh
        </button>
      </div>

      {loading && <p className="mt-2 text-xs text-muted">Loading tracking…</p>}
      {error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
      {!loading && !error && !tracking?.awb && (
        <p className="mt-2 text-xs text-muted">{data?.message ?? "Tracking will appear once your order is handed to the courier."}</p>
      )}

      {tracking?.awb && (
        <div className="mt-3 space-y-1 text-xs text-ink/80">
          <p>
            {tracking.courierName ? `${tracking.courierName} · ` : ""}AWB <b>{tracking.awb}</b>
            {tracking.estimatedDelivery ? ` · ETA ${tracking.estimatedDelivery}` : data?.etaDays ? ` · ${data.etaDays} days` : ""}
          </p>
          {trackingUrl && (
            <a href={trackingUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-maroon hover:underline">
              Open courier tracking <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      )}

      {events.length > 0 && (
        <ol className="mt-4 space-y-3 border-l-2 border-line pl-4 text-xs">
          {[...events].reverse().map((event, index) => (
            <li key={`${event.date ?? ""}-${index}`} className="relative">
              <span className="absolute -left-[1.32rem] top-1 h-2 w-2 rounded-full bg-maroon" aria-hidden />
              <p className="font-semibold text-ink">{event.status}</p>
              {event.activity && <p className="text-muted">{event.activity}</p>}
              <p className="text-[11px] text-muted">{[event.location, event.date].filter(Boolean).join(" · ")}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
