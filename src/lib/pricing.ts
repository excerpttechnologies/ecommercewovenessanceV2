import type { Product } from "@/domain/types";

/**
 * Pure pricing rules — no DB, fully unit-testable.
 * All amounts in INR (paise-free integers where possible; rounded to 2dp).
 */

export interface CartLine {
  sku: string;
  qty: number;
  product: Pick<Product, "id" | "sku" | "slug" | "name" | "images" | "pricing" | "stock" | "category" | "isBarcodeLabel">;
}

export interface CouponLike {
  code: string;
  type: "percent" | "flat" | "bogo";
  value: number;
  minCart?: number | null;
  maxDiscount?: number | null;
  applicableCategories?: string[] | null;
  validFrom?: Date | string | null;
  validTo?: Date | string | null;
  isActive?: boolean | null;
  usageLimit?: number | null;
  usedCount?: number | null;
}

export interface ShippingRules {
  freeShippingAbove: number;
  shippingCharge: number;
}

export interface CartTotals {
  itemCount: number;
  subTotal: number; // sum of selling price × qty (GST inclusive, as ERP prices are)
  mrpTotal: number;
  productDiscount: number; // mrp − selling
  couponDiscount: number;
  couponError?: string;
  shippingCharge: number;
  gstTotal: number; // informational: GST portion inside the inclusive price
  netAmount: number;
  freeShippingGap: number; // how much more to spend for free shipping (0 if reached)
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function validateCoupon(coupon: CouponLike | null | undefined, subTotal: number, lines: CartLine[], now = new Date()): { ok: true; discount: number } | { ok: false; error: string } {
  if (!coupon) return { ok: false, error: "Coupon not found" };
  if (coupon.isActive === false) return { ok: false, error: "This coupon is no longer active" };
  if (coupon.validFrom && new Date(coupon.validFrom) > now) return { ok: false, error: "This coupon is not valid yet" };
  if (coupon.validTo && new Date(coupon.validTo) < now) return { ok: false, error: "This coupon has expired" };
  if (coupon.usageLimit != null && (coupon.usedCount ?? 0) >= coupon.usageLimit) return { ok: false, error: "This coupon has been fully redeemed" };
  if (coupon.minCart && subTotal < coupon.minCart) return { ok: false, error: `Add items worth ₹${(coupon.minCart - subTotal).toLocaleString("en-IN")} more to use this coupon` };

  const cats = (coupon.applicableCategories ?? []).map((c) => c.toLowerCase());
  const eligible = cats.length ? lines.filter((l) => cats.includes((l.product.category ?? "").toLowerCase())) : lines;
  const eligibleTotal = eligible.reduce((s, l) => s + l.product.pricing.sellingPrice * l.qty, 0);
  if (eligibleTotal <= 0) return { ok: false, error: "No items in your cart are eligible for this coupon" };

  let discount = 0;
  if (coupon.type === "percent") discount = (eligibleTotal * coupon.value) / 100;
  else if (coupon.type === "flat") discount = coupon.value;
  else if (coupon.type === "bogo") {
    // cheapest eligible unit free for every 2 units
    const units = eligible.flatMap((l) => Array.from({ length: l.qty }, () => l.product.pricing.sellingPrice)).sort((a, b) => a - b);
    const free = Math.floor(units.length / 2);
    discount = units.slice(0, free).reduce((s, p) => s + p, 0);
  }
  if (coupon.maxDiscount != null) discount = Math.min(discount, coupon.maxDiscount);
  discount = Math.min(r2(discount), eligibleTotal);
  return { ok: true, discount };
}

export function computeTotals(lines: CartLine[], opts: { coupon?: CouponLike | null; shipping: ShippingRules; now?: Date }): CartTotals {
  const itemCount = lines.reduce((s, l) => s + l.qty, 0);
  const subTotal = r2(lines.reduce((s, l) => s + l.product.pricing.sellingPrice * l.qty, 0));
  const mrpTotal = r2(lines.reduce((s, l) => s + (l.product.pricing.mrp || l.product.pricing.sellingPrice) * l.qty, 0));
  const productDiscount = r2(Math.max(0, mrpTotal - subTotal));

  let couponDiscount = 0;
  let couponError: string | undefined;
  if (opts.coupon) {
    const v = validateCoupon(opts.coupon, subTotal, lines, opts.now);
    if (v.ok) couponDiscount = v.discount;
    else couponError = v.error;
  }

  const afterDiscount = r2(Math.max(0, subTotal - couponDiscount));
  const shippingCharge = itemCount === 0 || afterDiscount >= opts.shipping.freeShippingAbove ? 0 : opts.shipping.shippingCharge;
  const freeShippingGap = shippingCharge === 0 ? 0 : r2(opts.shipping.freeShippingAbove - afterDiscount);

  // GST is inclusive in ERP selling prices; back it out proportionally for the invoice.
  const gstTotal = r2(
    lines.reduce((s, l) => {
      const rate = l.product.pricing.gstPercent ?? 5;
      const gross = l.product.pricing.sellingPrice * l.qty;
      return s + gross - gross / (1 + rate / 100);
    }, 0) * (subTotal ? afterDiscount / subTotal : 0),
  );

  return {
    itemCount,
    subTotal,
    mrpTotal,
    productDiscount,
    couponDiscount,
    couponError,
    shippingCharge,
    gstTotal,
    netAmount: r2(afterDiscount + shippingCharge),
    freeShippingGap,
  };
}
