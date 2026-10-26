// import { cookies } from "next/headers";
// import { handler, ok } from "@/lib/api/response";
// import { CUSTOMER_COOKIE } from "@/lib/auth";

// export const POST = handler(async () => {
//   (await cookies()).delete(CUSTOMER_COOKIE);
//   return ok({ loggedOut: true });
// });


/////////////////////////////////////////////////////////////////////////////////////







// ============================================================================
// FILE PATH : src/app/api/v1/auth/logout/route.ts
// ROUTE     : POST /api/v1/auth/logout
// HOW TO USE: Replace the full contents of the existing file with this code.
// FIX       : After logout the wishlist (and cart) still showed the old data.
//             Cause: wishlist/cart are looked up by the guest cookie (CART_COOKIE)
//             and logout only removed the customer cookie, so the same token
//             kept returning the saved items. Now the guest cookie is removed
//             too, so the browser starts a fresh, empty guest session.
//             The customer's saved items stay in the database and come back
//             when they log in again.
// ============================================================================
import { cookies } from "next/headers";
import { handler, ok } from "@/lib/api/response";
import { CART_COOKIE, CUSTOMER_COOKIE } from "@/lib/auth";

export const POST = handler(async () => {
  const jar = await cookies();
  jar.delete(CUSTOMER_COOKIE);
  jar.delete(CART_COOKIE); // clears guest wishlist/cart link so nothing stays visible after logout
  return ok({ loggedOut: true });
});