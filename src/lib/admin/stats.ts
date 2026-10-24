import { getErpConnection, getWebConnection } from "@/lib/db";
import { ORDER_FIELDS as O, ORDER_ITEM_FIELDS as OI } from "@/lib/erp-mapping";
import { OrderModel } from "@/models/erp/order.model";
import { CartModel, EnquiryModel, ReviewModel } from "@/models/web/commerce.models";
import { getErpOrders } from "@/repositories";

const day = (d: Date) => d.toISOString().slice(0, 10);

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

/** ERP sales, customers and stock are live; customer engagement remains website-owned. */
export async function dashboardStats() {
  const webConn = await getWebConnection();
  const now = new Date();
  const start30 = new Date(now.getTime() - 30 * 864e5);
  const startToday = new Date(now.toISOString().slice(0, 10));
  const [orders, pendingReviews, newEnquiries, abandonedCarts, customers, stock] = await Promise.all([
    getErpOrders().getDashboardOrders(startToday, start30),
    ReviewModel(webConn).countDocuments({ status: "pending" }),
    EnquiryModel(webConn).countDocuments({ status: "new" }),
    CartModel(webConn).countDocuments({ "items.0": { $exists: true }, lastActivityAt: { $lt: new Date(now.getTime() - 864e5) } }),
    getErpConnection().then((connection) => {
      if (!connection.db) throw new Error("RetailERP database connection is not ready");
      return connection.db.collection("customers").countDocuments({});
    }),
    erpStockSummary(),
  ]);

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
