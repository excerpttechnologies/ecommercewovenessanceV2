import { getErpConnection, getWebConnection } from "@/lib/db";
import { ORDER_FIELDS as O, ORDER_ITEM_FIELDS as OI, mapOrder } from "@/lib/erp-mapping";
import { OrderModel } from "@/models/erp/order.model";
import { CartModel, EnquiryModel, ReviewModel } from "@/models/web/commerce.models";
import { getErpOrders } from "@/repositories";
import type { AnyDoc } from "@/models/_util";
import type { Order } from "@/domain/types";
import type { ErpDashboardOrders } from "@/repositories/mongo/erp-order.repository";

const day = (d: Date) => d.toISOString().slice(0, 10);

const emptyDashboardOrders = (): ErpDashboardOrders => ({
  today: { orders: 0, revenue: 0 },
  last30: { orders: 0, revenue: 0, aov: 0 },
  statusCounts: {},
  series: [],
  topSkus: [],
  latestOrders: [],
  outForDelivery: [],
});

/** One failing source (RetailERP down, one bad legacy document) must not blank the whole dashboard. */
async function attemptSource<T>(label: string, fn: () => Promise<T>, errors: string[]): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    const message = (error as Error).message;
    console.error(`[admin] ${label} unavailable:`, message);
    errors.push(message);
    return null;
  }
}

/**
 * Website orders live in the web DB (orderNo WE-…). RetailERP's dashboard query only reads
 * RetailERP's own sales-order collection, so the dashboard used to show ₹0 / 0 orders while
 * customers were ordering on the site. Both sources are read independently and merged.
 */
async function webDashboardOrders(todayStart: Date, last30Start: Date): Promise<ErpDashboardOrders> {
  const Orders = OrderModel(await getWebConnection());
  const created = O.createdAt;
  const items = `$${O.items}`;
  const net = `$${O.netAmount}`;
  const revenue = { $sum: { $ifNull: [net, 0] } };
  const [todayRows, last30Rows, statusRows, byDay, topSkus, latest, outForDelivery] = await Promise.all([
    Orders.aggregate<{ orders: number; revenue: number }>([
      { $match: { [created]: { $gte: todayStart } } },
      { $group: { _id: null, orders: { $sum: 1 }, revenue } },
    ]),
    Orders.aggregate<{ orders: number; revenue: number }>([
      { $match: { [created]: { $gte: last30Start } } },
      { $group: { _id: null, orders: { $sum: 1 }, revenue } },
    ]),
    Orders.aggregate<{ _id: string; count: number }>([
      { $group: { _id: `$${O.orderStatus}`, count: { $sum: 1 } } },
    ]),
    Orders.aggregate<{ _id: string; orders: number; revenue: number }>([
      { $match: { [created]: { $gte: last30Start } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: `$${created}`, onNull: "?" } },
          orders: { $sum: 1 },
          revenue,
        },
      },
      { $match: { _id: { $ne: "?" } } },
      { $sort: { _id: 1 } },
    ]),
    Orders.aggregate<{ _id: string; name?: string; qty: number; revenue: number }>([
      { $match: { [created]: { $gte: last30Start } } },
      { $unwind: items },
      {
        $group: {
          _id: `${items}.${OI.sku}`,
          name: { $first: `${items}.${OI.name}` },
          qty: { $sum: `${items}.${OI.qty}` },
          revenue: { $sum: `${items}.${OI.amount}` },
        },
      },
      { $match: { _id: { $nin: [null, ""] } } },
      { $sort: { revenue: -1 } },
      { $limit: 8 },
    ]),
    Orders.find({}).sort({ [created]: -1 }).limit(5).lean<AnyDoc[]>(),
    Orders.find({ [O.orderStatus]: "Out for delivery" }).sort({ [created]: -1 }).limit(5).lean<AnyDoc[]>(),
  ]);
  const statusCounts: Record<string, number> = {};
  for (const row of statusRows) statusCounts[row._id] = (statusCounts[row._id] ?? 0) + row.count;
  const last30 = last30Rows[0] ?? { orders: 0, revenue: 0 };
  return {
    today: todayRows[0] ?? { orders: 0, revenue: 0 },
    last30: {
      orders: last30.orders,
      revenue: last30.revenue,
      aov: last30.orders ? Math.round(last30.revenue / last30.orders) : 0,
    },
    statusCounts,
    series: byDay.map((row) => ({ date: row._id, orders: row.orders, revenue: row.revenue })),
    topSkus: topSkus.map((row) => ({ sku: row._id, name: row.name ?? row._id, qty: row.qty, revenue: row.revenue })),
    latestOrders: latest.map((doc) => mapOrder(doc)),
    outForDelivery: outForDelivery.map((doc) => mapOrder(doc)),
  };
}

/** Combine website and RetailERP figures into one dashboard snapshot (either source may be null). */
export function mergeDashboardOrders(...sources: (ErpDashboardOrders | null)[]): ErpDashboardOrders {
  const merged = emptyDashboardOrders();
  const series = new Map<string, { date: string; orders: number; revenue: number }>();
  const skus = new Map<string, { sku: string; name: string; qty: number; revenue: number }>();
  const latest = new Map<string, Order>();
  const delivery = new Map<string, Order>();
  for (const source of sources) {
    if (!source) continue;
    merged.today.orders += source.today.orders;
    merged.today.revenue += source.today.revenue;
    merged.last30.orders += source.last30.orders;
    merged.last30.revenue += source.last30.revenue;
    for (const [status, count] of Object.entries(source.statusCounts)) {
      merged.statusCounts[status] = (merged.statusCounts[status] ?? 0) + count;
    }
    for (const row of source.series) {
      const current = series.get(row.date) ?? { date: row.date, orders: 0, revenue: 0 };
      current.orders += row.orders;
      current.revenue += row.revenue;
      series.set(row.date, current);
    }
    for (const row of source.topSkus) {
      const current = skus.get(row.sku) ?? { sku: row.sku, name: row.name, qty: 0, revenue: 0 };
      current.qty += row.qty;
      current.revenue += row.revenue;
      if (row.name) current.name = row.name;
      skus.set(row.sku, current);
    }
    for (const order of source.latestOrders) if (!latest.has(order.orderNo)) latest.set(order.orderNo, order);
    for (const order of source.outForDelivery) if (!delivery.has(order.orderNo)) delivery.set(order.orderNo, order);
  }
  const byNewest = (a: Order, b: Order) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
  merged.last30.aov = merged.last30.orders ? Math.round(merged.last30.revenue / merged.last30.orders) : 0;
  merged.series = [...series.values()].sort((a, b) => a.date.localeCompare(b.date));
  merged.topSkus = [...skus.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 8);
  merged.latestOrders = [...latest.values()].sort(byNewest).slice(0, 5);
  merged.outForDelivery = [...delivery.values()].sort(byNewest).slice(0, 5);
  return merged;
}

export async function erpStockSummary() {
  const connection = await getErpConnection();
  if (!connection.db) throw new Error("RetailERP database connection is not ready");
  const [row] = await connection.db.collection("items").aggregate<{
    total: number;
    outOfStock: number;
    lowStock: number;
  }>([
    { $match: { status: "active" } },
    {
      $project: {
        quantity: {
          $convert: {
            input: { $ifNull: ["$inventory.availableStock", "$inventory.currentStock"] },
            to: "double",
            onError: 0,
            onNull: 0,
          },
        },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        outOfStock: { $sum: { $cond: [{ $lte: ["$quantity", 0] }, 1, 0] } },
        lowStock: {
          $sum: {
            $cond: [{ $and: [{ $gt: ["$quantity", 0] }, { $lte: ["$quantity", 3] }] }, 1, 0],
          },
        },
      },
    },
  ]).toArray();
  const total = row?.total ?? 0;
  const outOfStock = row?.outOfStock ?? 0;
  return {
    total,
    inStock: total - outOfStock,
    lowStock: row?.lowStock ?? 0,
    outOfStock,
  };
}

export interface ErpInventoryRow {
  id: string;
  itemCode: string;
  barcode: string;
  name: string;
  category: string;
  qty: number;
}

export function resolveInventoryCategory(productType: unknown, productName: unknown): string {
  const name = typeof productName === "string" ? productName.trim() : "";
  if (/\bPLAIN\s+FABRICS?\b/i.test(name)) return "Plain Fabrics";
  if (/\bFABRICS?\b/i.test(name)) return "Fabrics";

  const type = typeof productType === "string" ? productType.trim() : "";
  return /^(?:generic|general|erp products?)$/i.test(type) ? "—" : type || "—";
}

export async function erpInventory(threshold: number) {
  const connection = await getErpConnection();
  if (!connection.db) throw new Error("RetailERP database connection is not ready");
  const [result] = await connection.db.collection("items").aggregate<{
    summary: { total: number; inStock: number; lowStock: number; outOfStock: number }[];
    lowStock: (ErpInventoryRow & { productType?: string })[];
    outOfStock: (ErpInventoryRow & { productType?: string })[];
  }>([
    { $match: { status: "active" } },
    {
      $lookup: {
        from: "barcodeLabel",
        localField: "barcodeManagement.sourceBarcodeLabel",
        foreignField: "_id",
        as: "_sourceLabel",
      },
    },
    { $set: { _sourceLabel: { $first: "$_sourceLabel" } } },
    {
      $project: {
        _id: 1,
        itemCode: {
          $ifNull: [
            "$identity.itemCode",
            { $ifNull: ["$_sourceLabel.itemCode", { $ifNull: ["$itemCode", { $ifNull: ["$code", "$sku"] }] }] },
          ],
        },
        barcode: {
          $ifNull: ["$_sourceLabel.barcodeNo", ""],
        },
        name: {
          $ifNull: [
            "$identity.productName",
            {
              $ifNull: [
                "$_sourceLabel.supplierDescription",
                {
                  $ifNull: [
                    "$_sourceLabel.printDescription",
                    {
                      $ifNull: [
                        "$_sourceLabel.itemName",
                        {
                          $ifNull: [
                            "$name",
                            {
                              $ifNull: [
                                "$itemName",
                                { $ifNull: ["$productName", { $ifNull: ["$_sourceLabel.itemCode", "$_sourceLabel.barcodeNo"] }] },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        category: {
          $convert: {
            input: {
              $ifNull: [
                "$identity.productType",
                { $ifNull: ["$categoryName", "$groupName"] },
              ],
            },
            to: "string",
            onError: "—",
            onNull: "—",
          },
        },
        qty: {
          $convert: {
            input: { $ifNull: ["$inventory.availableStock", "$inventory.currentStock"] },
            to: "double",
            onError: 0,
            onNull: 0,
          },
        },
      },
    },
    {
      $facet: {
        summary: [
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              inStock: { $sum: { $cond: [{ $gt: ["$qty", 0] }, 1, 0] } },
              lowStock: { $sum: { $cond: [{ $and: [{ $gt: ["$qty", 0] }, { $lte: ["$qty", threshold] }] }, 1, 0] } },
              outOfStock: { $sum: { $cond: [{ $lte: ["$qty", 0] }, 1, 0] } },
            },
          },
          { $project: { _id: 0, total: 1, inStock: 1, lowStock: 1, outOfStock: 1 } },
        ],
        lowStock: [{ $match: { qty: { $gt: 0, $lte: threshold } } }, { $sort: { qty: 1, itemCode: 1 } }, { $limit: 50 }],
        outOfStock: [{ $match: { qty: { $lte: 0 } } }, { $sort: { itemCode: 1 } }, { $limit: 50 }],
      },
    },
  ]).toArray();
  const row = result?.summary[0] ?? { total: 0, inStock: 0, lowStock: 0, outOfStock: 0 };
  const mapItem = (item: ErpInventoryRow & { _id?: unknown; productType?: string }): ErpInventoryRow => ({
    id: String(item._id ?? item.itemCode),
    itemCode: String(item.itemCode ?? "").trim() || "—",
    barcode: String(item.barcode ?? "").trim() || "—",
    name: String(item.name ?? "").trim() || item.itemCode || item.barcode || "Unnamed item",
    category: resolveInventoryCategory(item.category ?? item.productType, item.name),
    qty: Number(item.qty ?? 0),
  });
  return {
    summary: row,
    lowStock: result?.lowStock.map(mapItem) ?? [],
    outOfStock: result?.outOfStock.map(mapItem) ?? [],
  };
}

export async function erpOverview() {
  const connection = await getErpConnection();
  if (!connection.db) throw new Error("RetailERP database connection is not ready");
  const [products, customers, statusCounts, stock] = await Promise.all([
    connection.db.collection("items").countDocuments({ status: "active" }),
    connection.db.collection("customers").countDocuments({}),
    getErpOrders().getStatusCounts(),
    erpStockSummary(),
  ]);
  return {
    dataSource: "RetailERP" as const,
    dbName: connection.name,
    fetchedAt: new Date().toISOString(),
    products,
    customers,
    orders: Object.values(statusCounts).reduce((total, count) => total + count, 0),
    stock,
  };
}

/** Website orders and engagement are live from the web DB; RetailERP sales, customers and stock are merged in. */
export async function dashboardStats() {
  const webConn = await getWebConnection();
  const now = new Date();
  const start30 = new Date(now.getTime() - 30 * 864e5);
  const startToday = new Date(now.toISOString().slice(0, 10));
  // ERP_MONGO_URI is the alias the RetailERP backend's .env uses. With neither set, the ERP
  // connection falls back to MONGODB_URI and every ERP figure is a truthful-but-useless zero.
  const erpConfigured = Boolean((process.env.ERP_MONGODB_URI ?? process.env.ERP_MONGO_URI ?? "").trim());
  const webErrors: string[] = [];
  const erpErrors: string[] = [];
  const [webOrders, erpOrders, pendingReviews, newEnquiries, abandonedCarts, customers, stock] = await Promise.all([
    attemptSource("Website order stats", () => webDashboardOrders(startToday, start30), webErrors),
    attemptSource("RetailERP order stats", () => getErpOrders().getDashboardOrders(startToday, start30), erpErrors),
    ReviewModel(webConn).countDocuments({ status: "pending" }),
    EnquiryModel(webConn).countDocuments({ status: "new" }),
    CartModel(webConn).countDocuments({ "items.0": { $exists: true }, lastActivityAt: { $lt: new Date(now.getTime() - 864e5) } }),
    attemptSource("RetailERP customers", async () => {
      const connection = await getErpConnection();
      if (!connection.db) throw new Error("RetailERP database connection is not ready");
      return connection.db.collection("customers").countDocuments({});
    }, erpErrors),
    attemptSource("RetailERP stock", () => erpStockSummary(), erpErrors),
  ]);
  const orders = mergeDashboardOrders(webOrders, erpOrders);

  // Fill missing days so the chart always spans the full 30-day window.
  const series: { date: string; orders: number; revenue: number }[] = [];
  const map = new Map(orders.series.map((row) => [row.date, row]));
  for (let i = 29; i >= 0; i--) {
    const d = day(new Date(now.getTime() - i * 864e5));
    const row = map.get(d);
    series.push({ date: d, orders: row?.orders ?? 0, revenue: row?.revenue ?? 0 });
  }

  return {
    today: orders.today,
    last30: orders.last30,
    statusCounts: orders.statusCounts,
    series,
    pendingReviews,
    newEnquiries,
    abandonedCarts,
    customers,
    stock,
    topSkus: orders.topSkus,
    latestOrders: orders.latestOrders,
    outForDelivery: orders.outForDelivery,
    sources: {
      web: { ok: webOrders !== null, error: webErrors[0] ?? null },
      erp: {
        configured: erpConfigured,
        ok: erpOrders !== null,
        stock: stock !== null,
        // Connected, but the ERP database itself has no catalogue and no customers.
        empty: customers === 0 && (stock?.total ?? 0) === 0,
        error: erpErrors[0] ?? null,
      },
    },
  };
}

export async function reports(from: Date, to: Date) {
  const conn = await getWebConnection();
  const Orders = OrderModel(conn);
  const created = O.createdAt;
  const match = { [created]: { $gte: from, $lte: to }, [O.orderStatus]: { $ne: "Cancelled" } };
  const net = `$${O.netAmount}`;
  const [byDay, byPayment, byStatus, byCategory, byCoupon, byCity] = await Promise.all([
    Orders.aggregate([{ $match: match }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: `$${created}` } }, orders: { $sum: 1 }, revenue: { $sum: net } } }, { $sort: { _id: 1 } }]),
    Orders.aggregate([{ $match: match }, { $group: { _id: `$${O.paymentMode}`, orders: { $sum: 1 }, revenue: { $sum: net } } }]),
    Orders.aggregate([{ $match: match }, { $group: { _id: `$${O.orderStatus}`, orders: { $sum: 1 } } }]),
    Orders.aggregate([{ $match: match }, { $unwind: `$${O.items}` }, { $group: { _id: `$${O.items}.${OI.sku}`, qty: { $sum: `$${O.items}.${OI.qty}` }, revenue: { $sum: `$${O.items}.${OI.amount}` }, name: { $first: `$${O.items}.${OI.name}` } } }, { $sort: { revenue: -1 } }, { $limit: 20 }]),
    Orders.aggregate([{ $match: { ...match, [O.couponCode]: { $nin: [null, ""] } } }, { $group: { _id: `$${O.couponCode}`, orders: { $sum: 1 }, discount: { $sum: `$${O.discountTotal}` } } }]),
    Orders.aggregate([{ $match: match }, { $group: { _id: `$${O.shippingAddress}.city`, orders: { $sum: 1 }, revenue: { $sum: net } } }, { $sort: { revenue: -1 } }, { $limit: 10 }]),
  ]);
  return { byDay, byPayment, byStatus, topProducts: byCategory, byCoupon, byCity };
}
