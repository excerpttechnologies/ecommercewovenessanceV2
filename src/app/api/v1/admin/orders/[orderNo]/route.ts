// import type { NextRequest } from "next/server";
// import { fail, handler, ok } from "@/lib/api/response";
// import { requireAdmin } from "@/lib/auth";
// import { getErpOrders } from "@/repositories";

// export const dynamic = "force-dynamic";
// type Ctx = { params: Promise<{ orderNo: string }> };

// export const GET = handler(async (_req: NextRequest, ctx: Ctx) => {
//   await requireAdmin("orders:read");
//   const order = await getErpOrders().getByOrderNo((await ctx.params).orderNo);
//   if (!order) return fail("NOT_FOUND", "Order not found", 404);
//   return ok({ ...order, customer: null, allowedTransitions: [] });
// });

// /** ERP owns order status and tracking writes; this admin view is intentionally read-only. */
// export const PATCH = handler(async () => {
//   await requireAdmin("orders:write");
//   return fail("READ_ONLY", "RetailERP orders are read-only here. Update this order in RetailERP.", 409);
// });




//////////////////////////////////////////////////////////////


import type { NextRequest } from "next/server";
import { fail, handler, ok } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth";
import { getErpOrders } from "@/repositories";
import { getWebConnection } from "@/lib/db";
import { mapOrder } from "@/lib/erp-mapping";
import { OrderModel } from "@/models/erp/order.model";
import type { AnyDoc } from "@/models/_util";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ orderNo: string }> };

// Allowed next status for WEBSITE orders only
const NEXT: Record<string, string[]> = {
  Placed: ["Confirmed", "Cancelled"],
  Confirmed: ["Cancelled"],
  Packed: ["Shipped", "Cancelled"],
  Shipped: ["Out for delivery", "Delivered"],
  "Out for delivery": ["Delivered"],
};

export const GET = handler(async (_req: NextRequest, ctx: Ctx) => {
  await requireAdmin("orders:read");
  const { orderNo } = await ctx.params;

  // 1. Try the ERP first
  const erp = await getErpOrders().getByOrderNo(orderNo);
  if (erp) return ok({ ...erp, customer: null, allowedTransitions: [], isWebsite: false });

  // 2. Website database
  const M = OrderModel(await getWebConnection());
  const doc = await M.findOne({ orderNo }).lean<AnyDoc>();
  if (!doc) return fail("NOT_FOUND", "Order not found", 404);
  const order = mapOrder(doc);
  return ok({
    ...order,
    awbNo: doc.awbNo ?? order.awbNo ?? null,
    courierName: doc.courierName ?? null,
    shiprocketShipmentId: doc.shiprocketShipmentId ?? null,
    customer: null,
    allowedTransitions: NEXT[order.orderStatus] ?? [],
    isWebsite: true,
  });
});

/** Website orders: change status. ERP orders stay read-only. */
export const PATCH = handler(async (req: NextRequest, ctx: Ctx) => {
  const session = await requireAdmin("orders:write");
  const { orderNo } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { status?: string };
  const status = String(body.status ?? "");

  const M = OrderModel(await getWebConnection());
  const doc = await M.findOne({ orderNo }).lean<AnyDoc>();
  if (!doc) return fail("READ_ONLY", "RetailERP orders are read-only here. Update this order in RetailERP.", 409);

  const current = mapOrder(doc).orderStatus;
  if (!(NEXT[current] ?? []).includes(status)) {
    return fail("BAD_TRANSITION", `Cannot change ${current} to ${status}.`, 409);
  }

  const now = new Date();
  const set: Record<string, unknown> = { orderStatus: status };
  if (status === "Delivered" && doc.paymentMode === "COD") set.paymentStatus = "Paid";

  await M.updateOne(
    { orderNo },
    {
      $set: set,
      $push: { statusHistory: { status, note: "Updated by admin", by: session.email ?? "admin", at: now } },
    },
  );
  return ok({ orderNo, orderStatus: status });
});