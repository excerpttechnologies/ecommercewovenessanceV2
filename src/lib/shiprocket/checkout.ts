import type { OrderShipping } from "@/domain/types";
import { getShippingContext, type ShippingContext } from "./config";
import { computePackage, type PackageDefaults } from "./package";
import { packageDefaultsFromConfig, resolvePackageItems } from "./package-server";
import { quoteShipping } from "./serviceability";
import type { CheckoutShippingQuote, PackageDimensions, ShippingQuote } from "./types";

/**
 * Checkout-facing shipping logic. All amounts here are computed on the server;
 * the browser only ever displays them.
 */

const r2 = (n: number) => Math.round(n * 100) / 100;

export function defaultsFromContext(context: ShippingContext): PackageDefaults {
  return packageDefaultsFromConfig(
    context.config ?? {
      defaultWeightKg: context.shipping.defaultWeightKg,
      defaultLengthCm: context.shipping.defaultLengthCm,
      defaultBreadthCm: context.shipping.defaultBreadthCm,
      defaultHeightCm: context.shipping.defaultHeightCm,
    },
  );
}

/** Build the shipment box for a set of cart lines using product overrides + ERP + defaults. */
export async function resolveCartPackage(
  items: { sku: string; qty: number }[],
  context: ShippingContext,
): Promise<PackageDimensions> {
  const resolved = await resolvePackageItems(items);
  return computePackage(resolved, defaultsFromContext(context));
}

/**
 * Apply the store's free-shipping threshold to a live quote. The courier rate is
 * always kept as `baseShippingCharge` for display and audit.
 */
export function applyFreeShipping(
  quote: ShippingQuote,
  payableSubtotal: number,
  freeShippingAbove: number,
): CheckoutShippingQuote {
  const eligible = quote.serviceable && payableSubtotal >= freeShippingAbove && freeShippingAbove > 0;
  return {
    serviceable: quote.serviceable,
    provider: quote.provider,
    fallback: quote.fallback,
    reason: quote.reason,
    deliveryPincode: quote.deliveryPincode,
    codAvailable: quote.codAvailable,
    shippingCharge: eligible ? 0 : r2(quote.shippingCharge),
    baseShippingCharge: r2(quote.baseShippingCharge),
    freeShippingApplied: eligible,
    freeShippingThreshold: freeShippingAbove,
    etaDays: quote.etaDays,
    estimatedDelivery: quote.estimatedDelivery,
    couriers: quote.couriers,
    selectedCourier: quote.selectedCourier,
    package: quote.package,
    quotedAt: quote.quotedAt,
  };
}

export interface QuoteInput {
  items: { sku: string; qty: number }[];
  deliveryPincode: string;
  paymentMode: "COD" | "PREPAID";
  /** Cart value after discounts — decides the free-shipping threshold. */
  payableSubtotal: number;
  context?: ShippingContext;
}

/** Full server-side quote used by checkout, the delivery checker and the quote API. */
export async function quoteForItems(input: QuoteInput): Promise<CheckoutShippingQuote> {
  const context = input.context ?? (await getShippingContext());
  const pkg = await resolveCartPackage(input.items, context);
  const quote = await quoteShipping(context, {
    deliveryPincode: input.deliveryPincode,
    package: pkg,
    paymentMode: input.paymentMode,
  });
  return applyFreeShipping(quote, input.payableSubtotal, context.commerce.freeShippingAbove);
}

/** Snapshot persisted on the order so the admin/customer pages never re-quote for history. */
export function buildOrderShippingSnapshot(quote: CheckoutShippingQuote): Partial<OrderShipping> {
  return {
    status: "not_created",
    provider: quote.provider,
    quotedCharge: quote.shippingCharge,
    baseCharge: quote.baseShippingCharge,
    codAvailable: quote.codAvailable,
    courierId: quote.selectedCourier?.id,
    courierName: quote.selectedCourier?.name,
    etaDays: quote.etaDays,
    estimatedDelivery: quote.estimatedDelivery,
    couriers: quote.couriers.map((c) => ({
      id: c.id,
      name: c.name,
      rate: c.rate,
      cod: c.cod,
      etaDays: c.etaDays,
      estimatedDelivery: c.estimatedDelivery,
      rating: c.rating,
    })),
    package: quote.package,
    trackingEvents: [],
    events: [],
    updatedAt: new Date().toISOString(),
  };
}

/** Amount charged for shipping: free above the threshold, otherwise the quoted rate. */
export function chargedShipping(quote: CheckoutShippingQuote): number {
  return quote.serviceable ? r2(quote.shippingCharge) : 0;
}
