import type { NextRequest } from "next/server";
import { fail, handler, ok } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth";
import type { OrderStatus } from "@/domain/types";
import { getErpOrders } from "@/repositories";

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
  const orders = getErpOrders();
  const [result, statusCounts, awaitingPayment] = await Promise.all([
    orders.list({
      status: status ?? undefined,
      paymentStatus: sp.get("paymentStatus") === "Pending" ? "Pending" : undefined,
      q: sp.get("q") ?? undefined,
      from: sp.get("from") ? new Date(sp.get("from")!) : undefined,
      to: sp.get("to") ? new Date(sp.get("to")!) : undefined,
      page: Number(sp.get("page") ?? 1),
      limit: Number(sp.get("limit") ?? 25),
    }),
    orders.getStatusCounts(),
    orders.countAwaitingPayment(),
  ]);
  return ok(result.items, {
    total: result.total,
    page: result.page,
    limit: result.limit,
    pages: result.pages,
    counts: {
      all: Object.values(statusCounts).reduce((sum, count) => sum + count, 0),
      awaitingPayment,
      ...statusCounts,
    },
  });
});
