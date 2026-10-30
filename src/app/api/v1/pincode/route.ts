import type { NextRequest } from "next/server";
import { fail, handler, ok } from "@/lib/api/response";
import { clientKey, rateLimit } from "@/lib/api/rate-limit";
import { quoteForItems } from "@/lib/shiprocket";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/pincode?pin=560001[&sku=BARCODE&qty=1&paymentMode=COD]
 *
 * Real Shiprocket serviceability for the pincode: courier availability, live
 * shipping rate, COD availability and the estimated delivery window. Without
 * Shiprocket credentials the configured flat fallback is used and the response
 * is marked `fallback: true` — it never pretends a live check succeeded.
 */
export const GET = handler(async (req: NextRequest) => {
  const limit = rateLimit(clientKey(req, "pincode"), 40, 60_000);
  if (!limit.ok) return fail("RATE_LIMITED", "Too many pincode checks. Please wait a moment.", 429);

  const sp = req.nextUrl.searchParams;
  const pin = (sp.get("pin") ?? "").replace(/\D/g, "");
  if (!/^[1-9][0-9]{5}$/.test(pin)) return fail("VALIDATION_ERROR", "Enter a valid 6-digit pincode");

  const paymentMode = (sp.get("paymentMode") ?? "COD").toUpperCase() === "COD" ? "COD" : "PREPAID";
  const sku = sp.get("sku");
  const qty = Math.max(1, Math.min(20, Number(sp.get("qty") ?? 1) || 1));
  const price = Math.max(0, Number(sp.get("price") ?? 0) || 0);

  const quote = await quoteForItems({
    items: sku ? [{ sku, qty }] : [],
    deliveryPincode: pin,
    paymentMode,
    payableSubtotal: price * qty,
  });

  return ok({
    pin,
    serviceable: quote.serviceable,
    cod: quote.codAvailable,
    etaDays: quote.etaDays,
    estimatedDelivery: quote.estimatedDelivery,
    shippingCharge: quote.shippingCharge,
    baseShippingCharge: quote.baseShippingCharge,
    freeShippingApplied: quote.freeShippingApplied,
    provider: quote.provider,
    fallback: quote.fallback,
    reason: quote.reason,
    courier: quote.selectedCourier ?? null,
    couriers: quote.couriers,
    quotedAt: quote.quotedAt,
  });
});
