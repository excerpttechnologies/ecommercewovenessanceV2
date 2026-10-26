// import type { NextRequest } from "next/server";
// import { z } from "zod";
// import { parseBody } from "@/lib/api/body";
// import { handler, ok } from "@/lib/api/response";
// import { getWishlistSkus, toggleWishlist } from "@/lib/cart-server";

// export const dynamic = "force-dynamic";

// export const GET = handler(async () => ok(await getWishlistSkus()));

// export const POST = handler(async (req: NextRequest) => {
//   const b = await parseBody(req, z.object({ sku: z.string().min(1) }));
//   if (!b.ok) return b.res;
//   return ok(await toggleWishlist(b.data.sku));
// });



//////////////////////////////////////////////////////////////
// ============================================================================
// FILE PATH : src/app/api/v1/wishlist/route.ts
// ROUTE     : /api/v1/wishlist  (GET, POST)
// HOW TO USE: Replace the full contents of the existing file with this code.
// CHANGE    : - POST (heart / save) now requires a logged-in customer. A guest
//               gets 401 UNAUTHENTICATED and the client redirects to /login.
//             - GET returns an empty list for guests, so hearts are never
//               shown as liked while logged out.
// ============================================================================
import type { NextRequest } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/api/body";
import { handler, ok } from "@/lib/api/response";
import { getCustomerSession, requireCustomer } from "@/lib/auth";
import { getWishlistSkus, toggleWishlist } from "@/lib/cart-server";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  if (!(await getCustomerSession())) return ok([]); // logged out -> nothing liked
  return ok(await getWishlistSkus());
});

export const POST = handler(async (req: NextRequest) => {
  await requireCustomer(); // not logged in -> 401, client redirects to /login
  const b = await parseBody(req, z.object({ sku: z.string().min(1) }));
  if (!b.ok) return b.res;
  return ok(await toggleWishlist(b.data.sku));
});
