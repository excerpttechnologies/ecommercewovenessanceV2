import type { NextRequest } from "next/server";
import { fail, handler, ok } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth";
import type { Order, OrderStatus, PaymentStatus } from "@/domain/types";
import { getErpOrders } from "@/repositories";
import { getWebConnection } from "@/lib/db";
import { ORDER_FIELDS as O, mapOrder } from "@/lib/erp-mapping";
import { OrderModel } from "@/models/erp/order.model";
import { escapeRegex } from "@/lib/utils";
import type { AnyDoc } from "@/models/_util";

export const dynamic = "force-dynamic";

const ORDER_STATUSES: OrderStatus[] = [
  "Placed",
  "Confirmed",
  "Packed",
  "Shipped",
  "Out for delivery",
  "Delivered",
  "Cancelled",
  "Returned",
];
const PAYMENT_STATUSES: PaymentStatus[] = ["Pending", "Paid", "Failed", "Refunded"];
const SOURCES = new Set(["all", "web", "erp"]);

/**
 * GET /api/v1/admin/orders
 *
 * Website orders (the orders actually placed on this store, in the website DB) are the primary
 * source and are queried, filtered, counted and paged in MongoDB. RetailERP's own sales orders are
 * merged in as a read-only overlay.
 *
 * The previous version called RetailERP first inside one unguarded Promise.all, so an unreachable
 * ERP database — or a single ERP row with an unknown status — returned 500 for the whole endpoint
 * and the admin saw no orders at all, website ones included. Each source is now independent: ERP
 * failures are reported in `meta.sources.erp.error` while website orders still load.
 */
export const GET = handler(async (req: NextRequest) => {
  await requireAdmin("orders:read");
  const sp = req.nextUrl.searchParams;

  const statusValue = (sp.get("status") ?? "").trim();
  if (statusValue && !ORDER_STATUSES.includes(statusValue as OrderStatus)) {
    return fail("VALIDATION_ERROR", "Invalid order status filter", 400);
  }
  const status = (statusValue || undefined) as OrderStatus | undefined;

  const paymentValue = (sp.get("paymentStatus") ?? "").trim();
  if (paymentValue && !PAYMENT_STATUSES.includes(paymentValue as PaymentStatus)) {
    return fail("VALIDATION_ERROR", "Invalid payment status filter", 400);
  }
  const paymentStatus = (paymentValue || undefined) as PaymentStatus | undefined;

  const page = Math.max(1, Number(sp.get("page") ?? 1) || 1);
  const limit = Math.min(100, Math.max(1, Number(sp.get("limit") ?? 25) || 25));
  const windowSize = page * limit;

  const q = (sp.get("q") ?? "").trim();
  const search = q ? new RegExp(escapeRegex(q), "i") : null;
  const shippingStatus = (sp.get("shippingStatus") ?? "").trim();

  const fromRaw = sp.get("from") ? new Date(sp.get("from")!) : null;
  const toRaw = sp.get("to") ? new Date(sp.get("to")!) : null;
  const from = fromRaw && !Number.isNaN(fromRaw.getTime()) ? fromRaw : null;
  const to = toRaw && !Number.isNaN(toRaw.getTime()) ? toRaw : null;

  const sourceValue = (sp.get("source") ?? "all").trim();
  const source = SOURCES.has(sourceValue) ? sourceValue : "all";

  /* ---------------- website orders (web DB, writable, authoritative for customer orders) ---------------- */
  const filters: AnyDoc[] = [];
  const paymentFilters: AnyDoc[] = [];
  if (paymentStatus) {
    paymentFilters.push({ [O.paymentStatus]: paymentStatus });
    if (paymentStatus === "Pending") paymentFilters.push({ [O.orderStatus]: { $nin: ["Cancelled", "Returned"] } });
  }
  if (shippingStatus) filters.push({ "shipping.status": shippingStatus });
  if (search) {
    filters.push({
      $or: [
        { [O.orderNo]: search },
        { "shippingAddress.name": search },
        { "shippingAddress.phone": search },
        { "shippingAddress.city": search },
        { "shippingAddress.pincode": search },
        { "items.sku": search },
        { "items.productName": search },
      ],
    });
  }
  if (from || to) {
    const range: AnyDoc = {};
    if (from) range.$gte = from;
    if (to) range.$lte = to;
    filters.push({ [O.createdAt]: range });
  }

  const scoped = [...filters, ...paymentFilters];
  const baseMatch: AnyDoc = scoped.length ? { $and: scoped } : {};
  const filteredMatch: AnyDoc = status ? { $and: [...scoped, { [O.orderStatus]: status }] } : baseMatch;
  // "Awaiting payment" badge: stays correct whatever payment filter is selected.
  const awaitingMatch: AnyDoc = {
    $and: [...filters, { [O.paymentStatus]: "Pending" }, { [O.orderStatus]: { $nin: ["Cancelled", "Returned"] } }],
  };

  const Orders = OrderModel(await getWebConnection());
  const skipWeb = source === "erp";

  const [webDocs, webTotal, webAllTotal, webStatusRows, webAwaiting] = await Promise.all([
    skipWeb
      ? Promise.resolve([] as AnyDoc[])
      : Orders.find(filteredMatch).sort({ [O.createdAt]: -1 }).limit(windowSize).lean<AnyDoc[]>(),
    skipWeb ? Promise.resolve(0) : Orders.countDocuments(filteredMatch),
    skipWeb ? Promise.resolve(0) : Orders.countDocuments(baseMatch),
    skipWeb
      ? Promise.resolve([] as { _id: string; count: number }[])
      : Orders.aggregate<{ _id: string; count: number }>([
          { $match: baseMatch },
          { $group: { _id: `$${O.orderStatus}`, count: { $sum: 1 } } },
        ]),
    skipWeb
      ? Promise.resolve(0)
      : Orders.countDocuments(awaitingMatch),
  ]);

  /* ---------------- RetailERP overlay (read-only) ---------------- */
  let erpItems: Order[] = [];
  let erpTotal = 0;
  let erpAwaiting = 0;
  const erpCounts: Record<string, number> = {};
  let erpError: string | null = null;

  if (source !== "web") {
    try {
      const erp = getErpOrders();
      const [listed, counts, awaiting] = await Promise.all([
        erp.list({
          status,
          paymentStatus,
          q: q || undefined,
          from: from ?? undefined,
          to: to ?? undefined,
          page: 1,
          limit: Math.min(100, windowSize),
        }),
        erp.getStatusCounts(),
        erp.countAwaitingPayment(),
      ]);
      erpItems = listed.items;
      erpTotal = listed.total;
      erpAwaiting = awaiting;
      Object.assign(erpCounts, counts);
    } catch (error) {
      erpError = (error as Error).message;
      console.warn("[admin/orders] RetailERP orders unavailable:", erpError);
    }
  }

  /* ---------------- merge, page, count ---------------- */
  const webItems = webDocs.map((doc) => mapOrder(doc));
  const seen = new Set(webItems.map((order) => order.orderNo));
  const merged = [...webItems, ...erpItems.filter((order) => !seen.has(order.orderNo))].sort(
    (a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
  );
  // Each source was asked for its newest `page * limit` rows, so this window contains the whole
  // merged page even for page 2 and beyond (ERP rows are capped at 100 per page).
  const items = merged.slice((page - 1) * limit, page * limit);

  const counts: Record<string, number> = {};
  for (const row of webStatusRows) counts[row._id] = (counts[row._id] ?? 0) + row.count;
  for (const [key, value] of Object.entries(erpCounts)) counts[key] = (counts[key] ?? 0) + value;

  const erpAll = Object.values(erpCounts).reduce((sum, count) => sum + count, 0);
  const total = webTotal + erpTotal;

  return ok(items, {
    total,
    page,
    limit,
    pages: Math.max(1, Math.ceil(total / limit)),
    counts: {
      ...counts,
      all: webAllTotal + erpAll,
      awaitingPayment: webAwaiting + erpAwaiting,
    },
    sources: {
      web: { total: webTotal },
      erp: { total: erpTotal, error: erpError },
    },
    generatedAt: new Date().toISOString(),
  });
});
