import type { NextRequest } from "next/server";
import { handler, ok } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth";
import { getWebConnection, toObjectIdOrString } from "@/lib/db";
import { ORDER_FIELDS as O } from "@/lib/erp-mapping";
import { OrderModel } from "@/models/erp/order.model";
import { getCustomers } from "@/repositories";

export const dynamic = "force-dynamic";
export const GET = handler(async (req: NextRequest) => {
  await requireAdmin("customers:read");
  const sp = req.nextUrl.searchParams;
  const { items, ...meta } = await getCustomers().list({ q: sp.get("q") ?? undefined, page: Number(sp.get("page") ?? 1), limit: Number(sp.get("limit") ?? 25) });
  const customerIds = items.map((customer) => toObjectIdOrString(customer.id));
  const orderCounts = customerIds.length
    ? await OrderModel(await getWebConnection()).aggregate([
        { $match: { [O.customerId]: { $in: customerIds } } },
        { $group: { _id: `$${O.customerId}`, count: { $sum: 1 } } },
      ])
    : [];
  const countsByCustomerId = new Map(orderCounts.map((row: { _id: unknown; count: number }) => [String(row._id), row.count]));
  return ok(items.map((customer) => ({ ...customer, orders: countsByCustomerId.get(customer.id) ?? 0 })), meta);
});
