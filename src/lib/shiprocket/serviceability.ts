import type { ShippingContext } from "./config";
import { canQueryServiceability } from "./config";
import { shiprocketRequest } from "./client";
import { ShiprocketError, safeError } from "./errors";
import type { CourierOption, PackageDimensions, ShippingQuote } from "./types";

interface ServiceabilityInput {
  pickupPincode: string;
  deliveryPincode: string;
  weightKg: number;
  cod: boolean;
  declaredValue?: number;
}

interface RawCourier {
  courier_company_id?: number | string;
  courier_name?: string;
  freight_charge?: number | string;
  rate?: number | string;
  net_charge?: number | string;
  total_charge?: number | string;
  cod?: number | string | boolean;
  estimated_delivery_days?: number | string;
  etd?: string;
  rating?: number | string;
  charged_weight?: number | string;
  min_weight?: number | string;
  max_weight?: number | string;
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const positive = (value: unknown): number | undefined => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};
const truthy = (value: unknown): boolean =>
  value === true || value === 1 || value === "1" || value === "true" || value === "yes" || value === "Y";

function normalizeCourier(raw: RawCourier): CourierOption | null {
  const id = raw.courier_company_id;
  const name = typeof raw.courier_name === "string" ? raw.courier_name.trim() : "";
  if (id == null || !name) return null;
  const rate =
    positive(raw.freight_charge) ??
    positive(raw.rate) ??
    positive(raw.net_charge) ??
    positive(raw.total_charge) ??
    0;
  const etaRaw = raw.estimated_delivery_days ?? raw.etd;
  const etaDays = positive(etaRaw) != null ? Math.max(1, Math.round(Number(etaRaw))) : undefined;
  return {
    id,
    name,
    rate: r2(rate),
    cod: truthy(raw.cod),
    etaDays,
    estimatedDelivery: typeof raw.etd === "string" ? raw.etd : undefined,
    rating: positive(raw.rating),
    chargeWeight: positive(raw.charged_weight),
    minWeight: positive(raw.min_weight),
    maxWeight: positive(raw.max_weight),
  };
}

/** Raw Shiprocket courier serviceability/rate lookup. */
export async function fetchServiceability(
  context: ShippingContext,
  input: ServiceabilityInput,
): Promise<CourierOption[]> {
  if (!context.config) {
    throw new ShiprocketError(
      "SHIPROCKET_NOT_CONFIGURED",
      "Shiprocket is not configured. Add the API credentials on the server.",
      { status: 503 },
    );
  }
  if (!canQueryServiceability(context.config)) {
    throw new ShiprocketError(
      "SHIPROCKET_PICKUP_PINCODE_MISSING",
      "Add the warehouse pickup pincode in Admin → Settings → Shipping to fetch live delivery rates.",
      { status: 503 },
    );
  }
  const params = new URLSearchParams({
    pickup_postcode: input.pickupPincode,
    delivery_postcode: input.deliveryPincode,
    cod: input.cod ? "1" : "0",
    weight: String(Math.max(0.01, input.weightKg)),
  });
  if (input.declaredValue && input.declaredValue > 0) params.set("declared_value", String(input.declaredValue));

  const response = await shiprocketRequest<{
    data?: { available_courier_companies?: RawCourier[] };
  }>(context.config, `/courier/serviceability/?${params.toString()}`, { safe: true });

  const raw = response.data?.available_courier_companies;
  if (!Array.isArray(raw)) {
    throw new ShiprocketError(
      "SHIPROCKET_BAD_RESPONSE",
      "Shiprocket returned an unexpected serviceability response.",
      { status: 502, retryable: true },
    );
  }
  return raw
    .map(normalizeCourier)
    .filter((courier): courier is CourierOption => Boolean(courier))
    .sort((a, b) => a.rate - b.rate || (a.etaDays ?? 999) - (b.etaDays ?? 999));
}

const quoteCache = new Map<string, { quote: ShippingQuote; expiresAt: number }>();
const CACHE_MS = 3 * 60 * 1000;

function cacheKey(context: ShippingContext, input: ServiceabilityInput): string {
  return [
    context.config?.baseUrl ?? "flat",
    context.config?.pickupPincode ?? "",
    input.deliveryPincode,
    input.weightKg.toFixed(2),
    input.cod ? "cod" : "prepaid",
    context.shipping.rateMarkupPercent,
    context.shipping.codExtraCharge,
  ].join("|");
}

function flatQuote(
  context: ShippingContext,
  deliveryPincode: string,
  pkg: PackageDimensions,
  reason: string,
): ShippingQuote {
  const prefixes = context.commerce.serviceablePincodePrefixes;
  const serviceable = prefixes.length === 0 || prefixes.some((prefix) => deliveryPincode.startsWith(prefix));
  return {
    serviceable,
    provider: "flat",
    fallback: true,
    reason: serviceable ? reason : "pincode_not_serviceable",
    pickupPincode: context.config?.pickupPincode || undefined,
    deliveryPincode,
    codAvailable: serviceable && context.commerce.codEnabled,
    shippingCharge: r2(context.commerce.shippingCharge),
    baseShippingCharge: r2(context.commerce.shippingCharge),
    currency: "INR",
    couriers: [],
    package: pkg,
    quotedAt: new Date().toISOString(),
  };
}

/**
 * Quote shipping for a package. Live Shiprocket rates are used when configured;
 * otherwise (or when Shiprocket is temporarily unavailable) the configured flat
 * rate is returned with `fallback: true` so the UI can label it honestly.
 * A definitive "not serviceable" response is never overridden by a fallback.
 */
export async function quoteShipping(
  context: ShippingContext,
  input: { deliveryPincode: string; package: PackageDimensions; paymentMode: "COD" | "PREPAID" },
): Promise<ShippingQuote> {
  const pkg = input.package;
  const cod = input.paymentMode === "COD";
  const key = cacheKey(context, {
    pickupPincode: context.config?.pickupPincode ?? "",
    deliveryPincode: input.deliveryPincode,
    weightKg: pkg.weight,
    cod,
  });
  const cached = quoteCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.quote;

  const fallbackAllowed = context.shipping.fallbackToFlatRate;
  if (!context.shipping.enabled) {
    return flatQuote(context, input.deliveryPincode, pkg, "shiprocket_disabled");
  }
  if (!context.config || !canQueryServiceability(context.config)) {
    if (fallbackAllowed) return flatQuote(context, input.deliveryPincode, pkg, "shiprocket_not_configured");
    return {
      ...flatQuote(context, input.deliveryPincode, pkg, "shiprocket_not_configured"),
      serviceable: false,
      codAvailable: false,
      shippingCharge: 0,
      baseShippingCharge: 0,
    };
  }

  try {
    const couriers = await fetchServiceability(context, {
      pickupPincode: context.config.pickupPincode,
      deliveryPincode: input.deliveryPincode,
      weightKg: pkg.weight,
      cod,
    });
    if (!couriers.length) {
      const quote: ShippingQuote = {
        serviceable: false,
        provider: "shiprocket",
        fallback: false,
        reason: "no_courier_service",
        pickupPincode: context.config.pickupPincode,
        deliveryPincode: input.deliveryPincode,
        codAvailable: false,
        shippingCharge: 0,
        baseShippingCharge: 0,
        currency: "INR",
        couriers: [],
        package: pkg,
        quotedAt: new Date().toISOString(),
      };
      quoteCache.set(key, { quote, expiresAt: Date.now() + CACHE_MS });
      return quote;
    }

    const codCouriers = couriers.filter((courier) => courier.cod);
    const eligible = cod ? codCouriers : couriers;
    const selected = eligible[0] ?? couriers[0];
    const markup = context.shipping.rateMarkupPercent;
    const markupAmount = selected.rate * (markup / 100);
    const codExtra = cod ? context.shipping.codExtraCharge : 0;
    const shippingCharge = r2(selected.rate + markupAmount + codExtra);
    const quote: ShippingQuote = {
      serviceable: true,
      provider: "shiprocket",
      fallback: false,
      pickupPincode: context.config.pickupPincode,
      deliveryPincode: input.deliveryPincode,
      codAvailable: codCouriers.length > 0,
      shippingCharge,
      baseShippingCharge: selected.rate,
      currency: "INR",
      etaDays: selected.etaDays,
      estimatedDelivery: selected.estimatedDelivery,
      couriers: couriers.slice(0, 8),
      selectedCourier: selected,
      package: pkg,
      quotedAt: new Date().toISOString(),
    };
    quoteCache.set(key, { quote, expiresAt: Date.now() + CACHE_MS });
    return quote;
  } catch (error) {
    const safe = safeError(error);
    console.warn(`[shiprocket] serviceability unavailable: ${safe.code}`);
    if (fallbackAllowed) return flatQuote(context, input.deliveryPincode, pkg, safe.code.toLowerCase());
    return {
      ...flatQuote(context, input.deliveryPincode, pkg, safe.code.toLowerCase()),
      serviceable: false,
      codAvailable: false,
      shippingCharge: 0,
      baseShippingCharge: 0,
    };
  }
}

/** For tests / explicit refresh. */
export function clearQuoteCache() {
  quoteCache.clear();
}
