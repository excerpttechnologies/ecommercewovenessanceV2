"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, MapPin, Truck, XCircle } from "lucide-react";
import { formatINR } from "@/lib/utils";

interface PincodeQuote {
  pin: string;
  serviceable: boolean;
  cod: boolean;
  etaDays?: number;
  estimatedDelivery?: string;
  shippingCharge: number;
  baseShippingCharge: number;
  freeShippingApplied: boolean;
  provider: "shiprocket" | "flat";
  fallback: boolean;
  reason?: string;
  courier: { name: string; etaDays?: number } | null;
}

const NOT_SERVICEABLE_REASONS: Record<string, string> = {
  pincode_not_serviceable: "We do not deliver to this pincode yet.",
  no_courier_service: "No courier currently serves this pincode.",
};

/**
 * Delivery checker backed by real Shiprocket serviceability. It never shows a
 * fake success: when Shiprocket is unavailable the server returns
 * `fallback: true` (or `serviceable: false`) and that is what we render.
 */
export function PincodeCheck({ sku, price, className }: { sku?: string; price?: number; className?: string }) {
  const [pin, setPin] = useState("");
  const [quote, setQuote] = useState<PincodeQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!/^[1-9]\d{5}$/.test(pin)) {
      setQuote(null);
      setError(null);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ pin, paymentMode: "COD" });
        if (sku) params.set("sku", sku);
        if (price) params.set("price", String(price));
        const res = await fetch(`/api/v1/pincode?${params.toString()}`, { signal: controller.signal });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.ok === false) throw new Error(json?.error?.message ?? "Could not check this pincode");
        setQuote(json.data as PincodeQuote);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setQuote(null);
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [pin, sku, price]);

  return (
    <div className={className ?? "rounded-xl border border-line bg-white p-4"}>
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
        <MapPin className="h-3.5 w-3.5 text-maroon" /> Check delivery
      </p>
      <label className="mt-2 flex items-center gap-2">
        <span className="sr-only">Delivery pincode</span>
        <input
          value={pin}
          onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          maxLength={6}
          placeholder="Enter 6-digit pincode"
          className="h-10 w-full rounded-md border border-line px-3 text-sm outline-none focus:border-maroon"
        />
        {loading && <Loader2 className="h-4 w-4 animate-spin text-maroon" aria-label="Checking" />}
      </label>

      {error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}

      {quote && !error && (
        <div className="mt-3 space-y-1.5 text-xs">
          {quote.serviceable ? (
            <p className="flex items-center gap-1.5 font-semibold text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              {quote.provider === "shiprocket" ? "Deliverable" : "Deliverable (flat rate)"}
              {quote.etaDays ? ` · ${quote.etaDays} day${quote.etaDays === 1 ? "" : "s"}` : ""}
            </p>
          ) : (
            <p className="flex items-center gap-1.5 font-semibold text-red-700">
              <XCircle className="h-4 w-4" />
              {NOT_SERVICEABLE_REASONS[quote.reason ?? ""] ?? "Currently not deliverable."}
            </p>
          )}
          {quote.serviceable && (
            <p className="flex items-center gap-1.5 text-ink/80">
              <Truck className="h-4 w-4 text-maroon" />
              {quote.shippingCharge > 0 ? `Shipping ${formatINR(quote.shippingCharge)}` : "Free shipping"}
              {quote.courier?.name ? ` · ${quote.courier.name}` : ""}
            </p>
          )}
          {quote.serviceable && (
            <p className="text-muted">{quote.cod ? "Cash on delivery available" : "Prepaid only for this pincode"}</p>
          )}
          {quote.fallback && <p className="text-muted">Live courier rates are unavailable right now, so our standard rate applies.</p>}
        </div>
      )}
    </div>
  );
}
