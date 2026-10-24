import { describe, expect, it } from "vitest";
import { computeTotals, validateCoupon, type CartLine, type CouponLike } from "@/lib/pricing";

const line = (sku: string, price: number, qty = 1, mrp = price, category = "Sarees"): CartLine => ({
  sku,
  qty,
  product: { id: sku, sku, slug: sku, name: sku, images: [], category, pricing: { mrp, sellingPrice: price, discountPercent: mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0, gstPercent: 5, currency: "INR" }, stock: { qty: 10, status: "in_stock" } },
});
const shipping = { freeShippingAbove: 4999, shippingCharge: 199 };
const now = new Date();

describe("computeTotals", () => {
  it("adds up lines, backs out GST and charges shipping under threshold", () => {
    const t = computeTotals([line("A", 1000, 2, 1200)], { shipping, now });
    expect(t.subTotal).toBe(2000);
    expect(t.productDiscount).toBe(400);
    expect(t.shippingCharge).toBe(199);
    expect(t.netAmount).toBe(2199);
    expect(t.gstTotal).toBeCloseTo(2000 - 2000 / 1.05, 1);
    expect(t.freeShippingGap).toBe(2999);
  });
  it("gives free shipping above threshold", () => {
    const t = computeTotals([line("A", 6000)], { shipping, now });
    expect(t.shippingCharge).toBe(0);
    expect(t.freeShippingGap).toBe(0);
  });
  it("applies a percent coupon with cap", () => {
    const coupon: CouponLike = { code: "X", type: "percent", value: 10, maxDiscount: 500, isActive: true };
    const t = computeTotals([line("A", 10000)], { coupon, shipping, now });
    expect(t.couponDiscount).toBe(500);
    expect(t.netAmount).toBe(9500);
    expect(t.couponError).toBeUndefined();
  });
  it("applies a flat coupon only when eligible categories are present", () => {
    const coupon: CouponLike = { code: "F", type: "flat", value: 300, isActive: true, applicableCategories: ["Fabrics"] };
    expect(computeTotals([line("A", 5000, 1, 5000, "Sarees"), line("B", 2000, 1, 2000, "Fabrics")], { coupon, shipping, now }).couponDiscount).toBe(300);
    expect(computeTotals([line("A", 5000, 1, 5000, "Sarees")], { coupon, shipping, now }).couponError).toMatch(/eligible/);
  });
  it("bogo makes the cheapest unit free per pair", () => {
    const coupon: CouponLike = { code: "B", type: "bogo", value: 0, isActive: true };
    expect(computeTotals([line("A", 3000), line("B", 1500), line("C", 2000)], { coupon, shipping, now }).couponDiscount).toBe(1500);
    expect(computeTotals([line("A", 3000), line("B", 1500), line("C", 2000), line("D", 1000)], { coupon, shipping, now }).couponDiscount).toBe(2500);
  });
  it("reports an error but still prices the cart for an invalid coupon", () => {
    const t = computeTotals([line("A", 1000)], { coupon: { code: "X", type: "percent", value: 10, minCart: 5000 }, shipping, now });
    expect(t.couponDiscount).toBe(0);
    expect(t.couponError).toMatch(/more/);
    expect(t.netAmount).toBe(1199);
  });
});

describe("validateCoupon", () => {
  const base: CouponLike = { code: "W", type: "percent", value: 10, minCart: 2000, isActive: true };
  const cart = [line("A", 5000)];
  it("rejects inactive, not-yet-valid, expired, below-minimum and exhausted coupons", () => {
    expect(validateCoupon({ ...base, isActive: false }, 5000, cart, now).ok).toBe(false);
    expect(validateCoupon({ ...base, validFrom: new Date(now.getTime() + 864e5) }, 5000, cart, now).ok).toBe(false);
    expect(validateCoupon({ ...base, validTo: new Date(now.getTime() - 1000) }, 5000, cart, now).ok).toBe(false);
    expect(validateCoupon(base, 1000, [line("A", 1000)], now).ok).toBe(false);
    expect(validateCoupon({ ...base, usageLimit: 5, usedCount: 5 }, 5000, cart, now).ok).toBe(false);
    expect(validateCoupon(null, 5000, cart, now).ok).toBe(false);
  });
  it("accepts a valid coupon and computes the discount", () => {
    const r = validateCoupon(base, 5000, cart, now);
    expect(r).toEqual({ ok: true, discount: 500 });
  });
});
