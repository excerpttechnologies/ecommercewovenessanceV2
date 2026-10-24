import type { NextRequest } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/api/body";
import { handler, ok } from "@/lib/api/response";
import { applyCoupon } from "@/lib/cart-server";

export const dynamic = "force-dynamic";

export const POST = handler(async (req: NextRequest) => {
  const b = await parseBody(req, z.object({ code: z.string().min(2).max(30) }));
  if (!b.ok) return b.res;
  const { token: _t, ...view } = await applyCoupon(b.data.code);
  return ok(view);
});

export const DELETE = handler(async () => {
  const { token: _t, ...view } = await applyCoupon(null);
  return ok(view);
});
