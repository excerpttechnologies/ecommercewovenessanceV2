import type { NextRequest } from "next/server";
import { fail, handler, ok } from "@/lib/api/response";
import { getCustomerSession } from "@/lib/auth";
import { getOrders } from "@/repositories";

export const dynamic = "force-dynamic";

/** GET /api/v1/orders/:orderNo?phone=… — order lookup (owner session or matching phone) */
export const GET = handler(async (req: NextRequest, ctx: { params: Promise<{ orderNo: string }> }) => {
  const { orderNo } = await ctx.params;
  const order = await getOrders().getByOrderNo(orderNo);
  if (!order) return fail("NOT_FOUND", "Order not found", 404);
  const session = await getCustomerSession();
  const phone = req.nextUrl.searchParams.get("phone");
  const owner = session?.sub === order.customerId || (phone && order.shippingAddress.phone === phone.replace(/\D/g, "").slice(-10));
  if (!owner) return fail("FORBIDDEN", "Enter the phone number used on the order to view it", 403);
  return ok(order);
});
