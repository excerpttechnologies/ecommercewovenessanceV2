import { cookies } from "next/headers";
import type { Customer } from "@/domain/types";
import { getWebConnection } from "@/lib/db";
import { CartModel, WishlistModel } from "@/models/web/commerce.models";
import { CART_COOKIE, CUSTOMER_COOKIE, cookieOptions, signSession } from "./auth";

const WEEK = 60 * 60 * 24 * 7;

/** Sets the customer session cookie and merges the guest cart / wishlist into the customer's. */
export async function startCustomerSession(customer: Customer): Promise<void> {
  const token = await signSession(
    { kind: "customer", sub: customer.id, mobile: customer.mobile || undefined, email: customer.email, name: customer.name },
    `${WEEK}s`,
  );
  const jar = await cookies();
  jar.set(CUSTOMER_COOKIE, token, cookieOptions(WEEK));

  const cartToken = jar.get(CART_COOKIE)?.value;
  if (cartToken) {
    const conn = await getWebConnection();
    await CartModel(conn).updateOne({ token: cartToken }, { $set: { customerId: customer.id } });
    await WishlistModel(conn).updateOne({ token: cartToken }, { $set: { customerId: customer.id } });
  }
}
