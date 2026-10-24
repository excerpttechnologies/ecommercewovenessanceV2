import type { NextRequest } from "next/server";
import { fail, handler, ok } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth";
import { getErpOrders } from "@/repositories";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ orderNo: string }> };

export const GET = handler(async (_req: NextRequest, ctx: Ctx) => {
  await requireAdmin("orders:read");
  const order = await getErpOrders().getByOrderNo((await ctx.params).orderNo);
  if (!order) return fail("NOT_FOUND", "Order not found", 404);
  return ok({ ...order, customer: null, allowedTransitions: [] });
});

/** ERP owns order status and tracking writes; this admin view is intentionally read-only. */
export const PATCH = handler(async () => {
  await requireAdmin("orders:write");
  return fail("READ_ONLY", "RetailERP orders are read-only here. Update this order in RetailERP.", 409);
});
