// import { cookies } from "next/headers";
// import type { Customer } from "@/domain/types";
// import { getWebConnection } from "@/lib/db";
// import { CartModel, WishlistModel } from "@/models/web/commerce.models";
// import { CART_COOKIE, CUSTOMER_COOKIE, cookieOptions, signSession } from "./auth";

// const WEEK = 60 * 60 * 24 * 7;

// /** Sets the customer session cookie and merges the guest cart / wishlist into the customer's. */
// export async function startCustomerSession(customer: Customer): Promise<void> {
//   const token = await signSession(
//     { kind: "customer", sub: customer.id, mobile: customer.mobile || undefined, email: customer.email, name: customer.name },
//     `${WEEK}s`,
//   );
//   const jar = await cookies();
//   jar.set(CUSTOMER_COOKIE, token, cookieOptions(WEEK));

//   const cartToken = jar.get(CART_COOKIE)?.value;
//   if (cartToken) {
//     const conn = await getWebConnection();
//     await CartModel(conn).updateOne({ token: cartToken }, { $set: { customerId: customer.id } });
//     await WishlistModel(conn).updateOne({ token: cartToken }, { $set: { customerId: customer.id } });
//   }
// }


//////////////////////////////////////////////////////////


// FILE: src/lib/customer-session.ts
// CHANGED: function startCustomerSession (same name/params).
// MISTAKE: only tagged this browser's cart/wishlist with customerId; the customer's older wishlist/cart (other device/session) were never merged -> liked items & cart missing after login.
// FIX: after setting the cookie, merge all wishlists and carts of the customer + this browser's token into one (union of skus, max qty), delete the leftovers.
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import type { Customer } from "@/domain/types";
import { getWebConnection } from "@/lib/db";
import { CartModel, WishlistModel } from "@/models/web/commerce.models";
import { CART_COOKIE, CUSTOMER_COOKIE, cookieOptions, signSession } from "./auth";

const WEEK = 60 * 60 * 24 * 7;
const THIRTY_DAYS = 60 * 60 * 24 * 30;

/**
 * Sets the customer session cookie, then restores the customer's saved data:
 * every wishlist / cart the customer ever had (any device) is merged with this browser's guest one,
 * so liked items and cart lines show up immediately after login.
 */
export async function startCustomerSession(customer: Customer): Promise<void> {
  const token = await signSession(
    { kind: "customer", sub: customer.id, mobile: customer.mobile || undefined, email: customer.email, name: customer.name },
    `${WEEK}s`,
  );
  const jar = await cookies();
  jar.set(CUSTOMER_COOKIE, token, cookieOptions(WEEK));

  // fresh browser/device: give it a cart token so the saved data can be attached to it
  let cartToken = jar.get(CART_COOKIE)?.value;
  if (!cartToken) {
    cartToken = randomBytes(24).toString("hex");
    jar.set(CART_COOKIE, cartToken, cookieOptions(THIRTY_DAYS));
  }

  const conn = await getWebConnection();

  // ---- wishlist: union of this browser's list + all lists saved on the customer ----
  const Wish = WishlistModel(conn);
  const lists = await Wish.find({ $or: [{ customerId: customer.id }, { token: cartToken }] });
  if (lists.length) {
    const skus = [...new Set(lists.flatMap((l) => l.skus))];
    const keep = lists.find((l) => l.token === cartToken) ?? lists[0];
    await Wish.updateOne({ _id: keep._id }, { $set: { token: cartToken, customerId: customer.id, skus } });
    const extra = lists.filter((l) => l !== keep).map((l) => l._id);
    if (extra.length) await Wish.deleteMany({ _id: { $in: extra } });
  }

  // ---- cart: bring the customer's older carts into this browser's cart ----
  const Carts = CartModel(conn);
  const carts = await Carts.find({ $or: [{ customerId: customer.id }, { token: cartToken }] });
  if (carts.length) {
    const keep = carts.find((c) => c.token === cartToken) ?? carts[0];
    const qty = new Map<string, number>();
    for (const c of carts) for (const it of c.items ?? []) qty.set(it.sku, Math.max(qty.get(it.sku) ?? 0, it.qty));
    const items = [...qty].map(([sku, q]) => ({ sku, qty: q, addedAt: new Date() }));
    const couponCode = keep.couponCode ?? carts.find((c) => c.couponCode)?.couponCode;
    await Carts.updateOne({ _id: keep._id }, { $set: { token: cartToken, customerId: customer.id, items, lastActivityAt: new Date(), ...(couponCode ? { couponCode } : {}) } });
    const extra = carts.filter((c) => c !== keep).map((c) => c._id);
    if (extra.length) await Carts.deleteMany({ _id: { $in: extra } });
  }
}
