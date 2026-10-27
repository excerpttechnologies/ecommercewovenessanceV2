// import type { NextRequest } from "next/server";
// import { fail, handler, ok } from "@/lib/api/response";
// import { requireAdmin } from "@/lib/auth";
// import type { OrderStatus } from "@/domain/types";
// import { getErpOrders } from "@/repositories";

// export const dynamic = "force-dynamic";

// export const GET = handler(async (req: NextRequest) => {
//   await requireAdmin("orders:read");
//   const sp = req.nextUrl.searchParams;
//   const statusValue = sp.get("status");
//   const statuses: OrderStatus[] = ["Placed", "Confirmed", "Packed", "Shipped", "Out for delivery", "Delivered", "Cancelled", "Returned"];
//   if (statusValue && !statuses.includes(statusValue as OrderStatus)) {
//     return fail("VALIDATION_ERROR", "Invalid order status filter", 400);
//   }
//   const status = statusValue as OrderStatus | null;
//   const orders = getErpOrders();
//   const [result, statusCounts, awaitingPayment] = await Promise.all([
//     orders.list({
//       status: status ?? undefined,
//       paymentStatus: sp.get("paymentStatus") === "Pending" ? "Pending" : undefined,
//       q: sp.get("q") ?? undefined,
//       from: sp.get("from") ? new Date(sp.get("from")!) : undefined,
//       to: sp.get("to") ? new Date(sp.get("to")!) : undefined,
//       page: Number(sp.get("page") ?? 1),
//       limit: Number(sp.get("limit") ?? 25),
//     }),
//     orders.getStatusCounts(),
//     orders.countAwaitingPayment(),
//   ]);
//   return ok(result.items, {
//     total: result.total,
//     page: result.page,
//     limit: result.limit,
//     pages: result.pages,
//     counts: {
//       all: Object.values(statusCounts).reduce((sum, count) => sum + count, 0),
//       awaitingPayment,
//       ...statusCounts,
//     },
//   });
// });


////////////////////////////////////////////////////////////////

import type { NextRequest } from "next/server";
import { fail, handler, ok } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth";
import type { OrderStatus } from "@/domain/types";
import { getErpOrders } from "@/repositories";
import { getWebConnection } from "@/lib/db";
import { mapOrder } from "@/lib/erp-mapping";
import { OrderModel } from "@/models/erp/order.model";
import type { AnyDoc } from "@/models/_util";

export const dynamic = "force-dynamic";

export const GET = handler(async (req: NextRequest) => {
  await requireAdmin("orders:read");
  const sp = req.nextUrl.searchParams;
  const statusValue = sp.get("status");
  const statuses: OrderStatus[] = ["Placed", "Confirmed", "Packed", "Shipped", "Out for delivery", "Delivered", "Cancelled", "Returned"];
  if (statusValue && !statuses.includes(statusValue as OrderStatus)) {
    return fail("VALIDATION_ERROR", "Invalid order status filter", 400);
  }
  const status = statusValue as OrderStatus | null;
  const page = Number(sp.get("page") ?? 1);
  const limit = Number(sp.get("limit") ?? 25);
  const q = (sp.get("q") ?? "").trim().toLowerCase();
  const from = sp.get("from") ? new Date(sp.get("from")!) : null;
  const to = sp.get("to") ? new Date(sp.get("to")!) : null;
  const pendingOnly = sp.get("paymentStatus") === "Pending";

  const orders = getErpOrders();
  const [result, statusCounts, awaitingPayment] = await Promise.all([
    orders.list({
      status: status ?? undefined,
      paymentStatus: pendingOnly ? "Pending" : undefined,
      q: sp.get("q") ?? undefined,
      from: from ?? undefined,
      to: to ?? undefined,
      page,
      limit,
    }),
    orders.getStatusCounts(),
    orders.countAwaitingPayment(),
  ]);

  // Website orders (saved in the website database)
  let webAll: ReturnType<typeof mapOrder>[] = [];
  try {
    const M = OrderModel(await getWebConnection());
    const docs = await M.find({}).sort({ createdAt: -1 }).limit(500).lean<AnyDoc[]>();
    webAll = docs.map((d) => mapOrder(d));
  } catch {
    webAll = [];
  }

  const erpNos = new Set(result.items.map((o) => o.orderNo));
  const webAllNew = webAll.filter((o) => !erpNos.has(o.orderNo));

  const webFiltered = webAllNew.filter((o) => {
    if (status && o.orderStatus !== status) return false;
    if (pendingOnly && o.paymentStatus !== "Pending") return false;
    if (q && !String(o.orderNo).toLowerCase().includes(q)) return false;
    // const t = new Date(o.createdAt).getTime();
    if (!o.createdAt) return false;
    const t = new Date(o.createdAt).getTime();
    if (from && t < from.getTime()) return false;
    if (to && t > to.getTime()) return false;
    return true;
  });

  // Show website orders on page 1, newest first
  const items = (page === 1 ? [...webFiltered, ...result.items] : result.items) as typeof result.items;
  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Counts including website orders
  const counts: Record<string, number> = { ...statusCounts };
  for (const o of webAllNew) {
    counts[o.orderStatus] = (counts[o.orderStatus] ?? 0) + 1;
  }
  const webAwaiting = webAllNew.filter((o) => o.paymentStatus === "Pending").length;

  return ok(items, {
    total: result.total + webFiltered.length,
    page: result.page,
    limit: result.limit,
    pages: Math.max(result.pages, Math.ceil((result.total + webFiltered.length) / limit)),
    counts: {
      ...counts,
      all: Object.values(counts).reduce((sum, count) => sum + count, 0),
      awaitingPayment: awaitingPayment + webAwaiting,
    },
  });
});

