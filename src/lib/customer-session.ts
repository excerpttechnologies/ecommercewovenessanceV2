// // import { cookies } from "next/headers";
// // import type { Customer } from "@/domain/types";
// // import { getWebConnection } from "@/lib/db";
// // import { CartModel, WishlistModel } from "@/models/web/commerce.models";
// // import { CART_COOKIE, CUSTOMER_COOKIE, cookieOptions, signSession } from "./auth";

// // const WEEK = 60 * 60 * 24 * 7;

// // /** Sets the customer session cookie and merges the guest cart / wishlist into the customer's. */
// // export async function startCustomerSession(customer: Customer): Promise<void> {
// //   const token = await signSession(
// //     { kind: "customer", sub: customer.id, mobile: customer.mobile || undefined, email: customer.email, name: customer.name },
// //     `${WEEK}s`,
// //   );
// //   const jar = await cookies();
// //   jar.set(CUSTOMER_COOKIE, token, cookieOptions(WEEK));

// //   const cartToken = jar.get(CART_COOKIE)?.value;
// //   if (cartToken) {
// //     const conn = await getWebConnection();
// //     await CartModel(conn).updateOne({ token: cartToken }, { $set: { customerId: customer.id } });
// //     await WishlistModel(conn).updateOne({ token: cartToken }, { $set: { customerId: customer.id } });
// //   }
// // }


// ////////////////////////////////////////////////////////////////////////////////////////////

// // import { cookies } from "next/headers";
// // import type { Customer } from "@/domain/types";
// // import { getWebConnection } from "@/lib/db";
// // import { CartModel, WishlistModel } from "@/models/web/commerce.models";
// // import { CART_COOKIE, CUSTOMER_COOKIE, cookieOptions, signSession } from "./auth";

// // const WEEK = 60 * 60 * 24 * 7;

// // /** Sets the customer session cookie and merges the guest cart / wishlist into the customer's. */
// // export async function startCustomerSession(customer: Customer): Promise<void> {
// //   const token = await signSession(
// //     { kind: "customer", sub: customer.id, mobile: customer.mobile || undefined, email: customer.email, name: customer.name },
// //     `${WEEK}s`,
// //   );
// //   const jar = await cookies();
// //   jar.set(CUSTOMER_COOKIE, token, cookieOptions(WEEK));

// //   const cartToken = jar.get(CART_COOKIE)?.value;
// //   if (cartToken) {
// //     const conn = await getWebConnection();
// //     await CartModel(conn).updateOne({ token: cartToken }, { $set: { customerId: customer.id } });
// //     await WishlistModel(conn).updateOne({ token: cartToken }, { $set: { customerId: customer.id } });
// //   }
// // }


// //////////////////////////////////////////////////////////


import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import type { Customer } from "@/domain/types";
import { getWebConnection } from "@/lib/db";
import { CartModel, WishlistModel } from "@/models/web/commerce.models";
import { CART_COOKIE, CUSTOMER_COOKIE, cookieOptions, signSession } from "./auth";

const WEEK = 60 * 60 * 24 * 7;
const THIRTY_DAYS = 60 * 60 * 24 * 30;

/**
 * Sets the customer session cookie, then restores ONLY this customer's own saved data (any device).
 * Guest data left on this browser is dropped, and another customer's data is never mixed in.
 */
export async function startCustomerSession(customer: Customer): Promise<void> {
  const token = await signSession(
    { kind: "customer", sub: customer.id, mobile: customer.mobile || undefined, email: customer.email, name: customer.name },
    `${WEEK}s`,
  );
  const jar = await cookies();
  jar.set(CUSTOMER_COOKIE, token, cookieOptions(WEEK));

  let cartToken = jar.get(CART_COOKIE)?.value;
  if (!cartToken) {
    cartToken = randomBytes(24).toString("hex");
    jar.set(CART_COOKIE, cartToken, cookieOptions(THIRTY_DAYS));
  }

  const conn = await getWebConnection();
  const Wish = WishlistModel(conn);
  const Carts = CartModel(conn);

  // 1) leftover guest likes / bag on this browser are removed
  await Wish.deleteMany({ token: cartToken, customerId: null });
  await Carts.deleteMany({ token: cartToken, customerId: null });
  // 2) if a different customer's data uses this browser's token, give it a new token so nothing mixes
  await Wish.updateOne({ token: cartToken, customerId: { $nin: [null, customer.id] } }, { $set: { token: randomBytes(24).toString("hex") } });
  await Carts.updateOne({ token: cartToken, customerId: { $nin: [null, customer.id] } }, { $set: { token: randomBytes(24).toString("hex") } });

  // ---- wishlist: merge only this customer's own lists ----
  const lists = await Wish.find({ customerId: customer.id });
  if (lists.length) {
    const skus = [...new Set(lists.flatMap((l) => l.skus))];
    const keep = lists.find((l) => l.token === cartToken) ?? lists[0];
    await Wish.updateOne({ _id: keep._id }, { $set: { token: cartToken, customerId: customer.id, skus } });
    const extra = lists.filter((l) => l !== keep).map((l) => l._id);
    if (extra.length) await Wish.deleteMany({ _id: { $in: extra } });
  }

  // ---- cart: merge only this customer's own carts ----
  const carts = await Carts.find({ customerId: customer.id });
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