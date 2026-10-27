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

///////////////////////////////////////////////////////////////////////

import type { NextRequest } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/api/body";
import { handler, ok } from "@/lib/api/response";
import { getCustomerSession, requireCustomer } from "@/lib/auth";
import { getWishlistSkus, toggleWishlist } from "@/lib/cart-server";

export const dynamic = "force-dynamic";

/** Guests see nothing liked; only a logged-in customer sees their own likes. */
export const GET = handler(async () => {
  if (!(await getCustomerSession())) return ok([]);
  return ok(await getWishlistSkus());
});

export const POST = handler(async (req: NextRequest) => {
  await requireCustomer();
  const b = await parseBody(req, z.object({ sku: z.string().min(1) }));
  if (!b.ok) return b.res;
  return ok(await toggleWishlist(b.data.sku));
});