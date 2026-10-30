import type { NextRequest } from "next/server";
import { fail, handler, ok } from "@/lib/api/response";
import { clientKey, rateLimit } from "@/lib/api/rate-limit";
import { getCartToken, getCartView } from "@/lib/cart-server";
import { quoteForItems } from "@/lib/shiprocket";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/shipping/quote?pin=560001&paymentMode=COD
 *     &sku=BARCODE&qty=1  (optional — otherwise the signed-in/guest cart is used)
 *
 * Live Shiprocket serviceability + rate for the current cart. The response is
 * never fabricated: when Shiprocket is unavailable the quote says
 * `fallback: true` (or `serviceable: false` when the flat fallback is disabled).
 */
export const GET = handler(async (req: NextRequest) => {
  const limit = rateLimit(clientKey(req, "shipping-quote"), 30, 60_000);
  if (!limit.ok) {
    return fail("RATE_LIMITED", "Too many shipping checks. Please wait a moment and try again.", 429);
  }

  const sp = req.nextUrl.searchParams;
  const pin = (sp.get("pin") ?? "").replace(/\D/g, "");
  if (!/^[1-9][0-9]{5}$/.test(pin)) return fail("VALIDATION_ERROR", "Enter a valid 6-digit pincode");

  const paymentMode = (sp.get("paymentMode") ?? "COD").toUpperCase() === "COD" ? "COD" : "PREPAID";
  const sku = sp.get("sku");
  const qty = Math.max(1, Math.min(20, Number(sp.get("qty") ?? 1) || 1));

  let items: { sku: string; qty: number }[];
  let payableSubtotal: number;

  if (sku) {
    items = [{ sku, qty }];
    const price = Math.max(0, Number(sp.get("price") ?? 0) || 0);
    payableSubtotal = price * qty;
  } else {
    const token = await getCartToken(false);
    const cart = await getCartView(token);
    if (!cart.lines.length) return fail("EMPTY_CART", "Add an item to your bag to check delivery.", 409);
    items = cart.lines.map((line) => ({ sku: line.sku, qty: line.qty }));
    payableSubtotal = Math.max(0, cart.totals.subTotal - cart.totals.couponDiscount);
  }

  const quote = await quoteForItems({ items, deliveryPincode: pin, paymentMode, payableSubtotal });
  return ok(quote, { cache: "no-store" });
});
