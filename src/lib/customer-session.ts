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
 * Sets the customer session cookie, then restores this customer's saved data
 * (any device) and ADOPTS any guest cart/wishlist created on this browser before
 * login. Guest items are merged into the customer's own list instead of being
 * discarded, so switching to WhatsApp login never loses a bag.
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

  // If this browser token belongs to a different customer, move this browser to
  // a fresh token so two customers' data can never mix. (A guest token cannot
  // belong to another customer, so guest data is unaffected.)
  const foreign =
    (await Wish.exists({ token: cartToken, customerId: { $nin: [null, customer.id] } })) ??
    (await Carts.exists({ token: cartToken, customerId: { $nin: [null, customer.id] } }));
  if (foreign) {
    cartToken = randomBytes(24).toString("hex");
    jar.set(CART_COOKIE, cartToken, cookieOptions(THIRTY_DAYS));
  }

  // ---- wishlist: this customer's saved lists + the guest list on this browser ----
  const lists = await Wish.find({
    $or: [
      { customerId: customer.id },
      { token: cartToken, customerId: null },
    ],
  }).lean();
  if (lists.length) {
    const skus = [...new Set(lists.flatMap((list) => list.skus ?? []))];
    const keep = lists.find((list) => list.token === cartToken) ?? lists[0];
    await Wish.updateOne(
      { _id: keep._id },
      { $set: { token: cartToken, customerId: customer.id, skus } },
    );
    const extra = lists.filter((list) => String(list._id) !== String(keep._id)).map((list) => list._id);
    if (extra.length) await Wish.deleteMany({ _id: { $in: extra } });
  }

  // ---- cart: this customer's saved carts + the guest cart on this browser ----
  const carts = await Carts.find({
    $or: [
      { customerId: customer.id },
      { token: cartToken, customerId: null },
    ],
  }).lean();
  if (carts.length) {
    const keep = carts.find((cart) => cart.token === cartToken) ?? carts[0];
    const qty = new Map<string, number>();
    for (const cart of carts) for (const item of cart.items ?? []) qty.set(item.sku, Math.max(qty.get(item.sku) ?? 0, item.qty));
    const items = [...qty].map(([sku, quantity]) => ({ sku, qty: quantity, addedAt: new Date() }));
    const couponCode = keep.couponCode ?? carts.find((cart) => cart.couponCode)?.couponCode;
    await Carts.updateOne(
      { _id: keep._id },
      {
        $set: {
          token: cartToken,
          customerId: customer.id,
          items,
          lastActivityAt: new Date(),
          ...(couponCode ? { couponCode } : {}),
        },
        $unset: { abandonedNotifiedAt: 1 },
      },
    );
    const extra = carts.filter((cart) => String(cart._id) !== String(keep._id)).map((cart) => cart._id);
    if (extra.length) await Carts.deleteMany({ _id: { $in: extra } });
  }
}