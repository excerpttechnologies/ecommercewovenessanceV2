import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { getWebConnection } from "@/lib/db";
import { CART_COOKIE, cookieOptions, getCustomerSession } from "@/lib/auth";
import { computeTotals, type CartLine, type CartTotals, type CouponLike } from "@/lib/pricing";
import { CartModel, CouponModel, WishlistModel } from "@/models/web/commerce.models";
import { getBarcodeLabels, getMasterData, getSite } from "@/repositories";
import { barcodeProductToProduct } from "@/lib/erp-mapping";

export interface CartView {
  token: string;
  lines: CartLine[];
  unavailable: { sku: string; qty: number }[];
  couponCode?: string;
  totals: CartTotals;
}

async function getBarcodeProduct(sku: string) {
  const [item] = await getBarcodeLabels().getByBarcodes([sku]);
  return item ? barcodeProductToProduct(item) : null;
}

const THIRTY_DAYS = 60 * 60 * 24 * 30;

/** Guest cart token lives in an httpOnly cookie; on login the cart is merged onto the customer. */
export async function getCartToken(create = true): Promise<string | null> {
  const jar = await cookies();
  let token = jar.get(CART_COOKIE)?.value;
  if (!token && create) {
    token = randomBytes(24).toString("hex");
    try {
      jar.set(CART_COOKIE, token, cookieOptions(THIRTY_DAYS));
    } catch {
      /* called from a server component render — cookie will be set on the next mutation */
    }
  }
  return token ?? null;
}

interface RawCart {
  items: { sku: string; qty: number }[];
  couponCode?: string | null;
  customerId?: unknown;
}

async function rawCart(token: string) {
  const M = CartModel(await getWebConnection());
  const session = await getCustomerSession();
  let cart = (await M.findOne({ token }).lean()) as RawCart | null;
  if (!cart) {
    await M.create({ token, customerId: session?.sub, items: [] });
    cart = { items: [], customerId: session?.sub };
  } else if (session && cart.customerId == null) {
    await M.updateOne({ token }, { $set: { customerId: session.sub } });
  }
  return { M, cart };
}

export async function loadCoupon(code?: string | null): Promise<CouponLike | null> {
  if (!code) return null;
  const M = CouponModel(await getWebConnection());
  const c = await M.findOne({ code: code.toUpperCase() }).lean();
  if (!c) return null;
  return {
    code: c.code,
    type: c.type as CouponLike["type"],
    value: c.value,
    minCart: c.minCart,
    maxDiscount: c.maxDiscount,
    applicableCategories: c.applicableCategories,
    validFrom: c.validFrom,
    validTo: c.validTo,
    isActive: c.isActive,
    usageLimit: c.usageLimit,
    usedCount: c.usedCount,
  };
}

/** Hydrate cart items with live product data (price & stock always come from master data). */
export async function getCartView(token?: string | null): Promise<CartView> {
  const t = token ?? (await getCartToken());
  const settings = await getSite().settings();
  const shipping = {
    freeShippingAbove: settings.commerce?.freeShippingAbove ?? 4999,
    shippingCharge: settings.commerce?.shippingCharge ?? 149,
  };
  if (!t) return { token: "", lines: [], unavailable: [], totals: computeTotals([], { shipping }) };

  const { cart } = await rawCart(t);
  const items = cart.items ?? [];
  const products = items.length ? await getMasterData().products.getBySkus(items.map((i) => i.sku)) : [];
  const bySku = new Map(products.map((p) => [p.sku, p]));
  const missingSkus = items.map((item) => item.sku).filter((sku) => !bySku.has(sku));
  const barcodeProducts = missingSkus.length ? await getBarcodeLabels().getByBarcodes(missingSkus) : [];
  for (const item of barcodeProducts) bySku.set(item.barcode, barcodeProductToProduct(item));
  const lines: CartLine[] = [];
  const unavailable: { sku: string; qty: number }[] = [];
  for (const it of items) {
    const p = bySku.get(it.sku);
    if (!p || !p.isActive || p.stock.qty <= 0) unavailable.push({ sku: it.sku, qty: it.qty });
    else lines.push({ sku: it.sku, qty: Math.min(it.qty, p.stock.qty), product: p });
  }
  const coupon = await loadCoupon(cart.couponCode);
  const totals = computeTotals(lines, { coupon, shipping });
  return { token: t, lines, unavailable, couponCode: cart.couponCode ?? undefined, totals };
}

export async function addToCart(sku: string, qty = 1): Promise<CartView> {
  const token = (await getCartToken())!;
  const product = (await getMasterData().products.getBySku(sku)) ?? (await getBarcodeProduct(sku));
  if (!product || !product.isActive) throw Object.assign(new Error("Product not available"), { status: 404, code: "NOT_FOUND" });
  if (product.stock.qty <= 0) throw Object.assign(new Error("This item is out of stock"), { status: 409, code: "OUT_OF_STOCK" });
  const { M, cart } = await rawCart(token);
  const existing = (cart.items ?? []).find((i) => i.sku === sku);
  const newQty = Math.min(product.stock.qty, (existing?.qty ?? 0) + qty);
  if (existing) await M.updateOne({ token, "items.sku": sku }, { $set: { "items.$.qty": newQty, lastActivityAt: new Date() } });
  else await M.updateOne({ token }, { $push: { items: { sku, qty: newQty, addedAt: new Date() } }, $set: { lastActivityAt: new Date() } });
  return getCartView(token);
}

export async function setCartQty(sku: string, qty: number): Promise<CartView> {
  const token = (await getCartToken())!;
  const { M } = await rawCart(token);
  if (qty <= 0) await M.updateOne({ token }, { $pull: { items: { sku } }, $set: { lastActivityAt: new Date() } });
  else {
    const product = (await getMasterData().products.getBySku(sku)) ?? (await getBarcodeProduct(sku));
    const capped = Math.min(qty, product?.stock.qty ?? qty);
    await M.updateOne({ token, "items.sku": sku }, { $set: { "items.$.qty": capped, lastActivityAt: new Date() } });
  }
  return getCartView(token);
}

export async function applyCoupon(code: string | null): Promise<CartView> {
  const token = (await getCartToken())!;
  const { M } = await rawCart(token);
  if (!code) {
    await M.updateOne({ token }, { $unset: { couponCode: 1 } });
    return getCartView(token);
  }
  const coupon = await loadCoupon(code);
  if (!coupon) throw Object.assign(new Error("Coupon not found"), { status: 404, code: "COUPON_NOT_FOUND" });
  await M.updateOne({ token }, { $set: { couponCode: coupon.code } });
  const view = await getCartView(token);
  if (view.totals.couponError) {
    await M.updateOne({ token }, { $unset: { couponCode: 1 } });
    throw Object.assign(new Error(view.totals.couponError), { status: 422, code: "COUPON_INVALID" });
  }
  return view;
}

export async function clearCart(token: string) {
  const M = CartModel(await getWebConnection());
  await M.updateOne({ token }, { $set: { items: [] }, $unset: { couponCode: 1 } });
}

/* ---------- Wishlist (same token strategy) ---------- */

export async function getWishlistSkus(): Promise<string[]> {
  const token = await getCartToken(false);
  const session = await getCustomerSession();
  if (!token && !session) return [];
  const M = WishlistModel(await getWebConnection());
  const doc = await M.findOne(session ? { $or: [{ customerId: session.sub }, { token }] } : { token }).lean();
  return doc?.skus ?? [];
}

export async function toggleWishlist(sku: string): Promise<string[]> {
  const token = (await getCartToken())!;
  const session = await getCustomerSession();
  const M = WishlistModel(await getWebConnection());
  const q = session ? { $or: [{ customerId: session.sub }, { token }] } : { token };
  const doc = await M.findOne(q);
  if (!doc) {
    await M.create({ token, customerId: session?.sub, skus: [sku] });
    return [sku];
  }
  const has = doc.skus.includes(sku);
  const skus = has ? doc.skus.filter((s) => s !== sku) : [...doc.skus, sku];
  await M.updateOne({ _id: doc._id }, { $set: { skus, ...(session ? { customerId: session.sub } : {}) } });
  return skus;
}
