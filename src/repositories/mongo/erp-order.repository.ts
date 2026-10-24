import type { Connection } from "mongoose";
import { ERP_COLLECTIONS } from "@/lib/erp-mapping";
import { escapeRegex } from "@/lib/utils";
import type { Address, Order, OrderItem, OrderStatus, Paginated, PaymentMode, PaymentStatus } from "@/domain/types";

type ErpRecord = Record<string, unknown>;

const STATUS_VALUES: Record<OrderStatus, string[]> = {
  Placed: ["placed", "pending_payment"],
  Confirmed: ["confirmed"],
  Packed: ["packed"],
  Shipped: ["shipped"],
  "Out for delivery": ["out_for_delivery"],
  Delivered: ["delivered"],
  Cancelled: ["cancelled", "canceled"],
  Returned: ["returned"],
};

function record(value: unknown): ErpRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as ErpRecord
    : {};
}

function text(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  if (value && typeof value === "object" && "toString" in value) {
    const result = String(value);
    if (result !== "[object Object]") return result;
  }
  return undefined;
}

function amount(value: unknown): number {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : 0;
}

function isoDate(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function token(value: unknown): string {
  return (text(value) ?? "").toLowerCase().trim().replace(/[\s-]+/g, "_");
}

export function mapErpOrderStatus(value: unknown): OrderStatus {
  switch (token(value)) {
    case "placed":
    case "pending_payment":
      return "Placed";
    case "confirmed":
      return "Confirmed";
    case "packed":
      return "Packed";
    case "shipped":
      return "Shipped";
    case "out_for_delivery":
      return "Out for delivery";
    case "delivered":
      return "Delivered";
    case "cancelled":
    case "canceled":
      return "Cancelled";
    case "returned":
      return "Returned";
    default:
      throw new Error(`Unsupported RetailERP order status: ${text(value) ?? "(empty)"}`);
  }
}

function mapPaymentMode(value: unknown): PaymentMode {
  switch (token(value)) {
    case "cod":
    case "cash_on_delivery":
      return "COD";
    case "razorpay":
      return "RAZORPAY";
    case "upi":
      return "UPI";
    case "card":
      return "CARD";
    default:
      throw new Error(`Unsupported RetailERP payment method: ${text(value) ?? "(empty)"}`);
  }
}

function mapPaymentStatus(value: unknown): PaymentStatus {
  switch (token(value)) {
    case "pending":
    case "cod_pending":
      return "Pending";
    case "paid":
    case "cod_collected":
      return "Paid";
    case "failed":
      return "Failed";
    case "refunded":
      return "Refunded";
    default:
      throw new Error(`Unsupported RetailERP payment status: ${text(value) ?? "(empty)"}`);
  }
}

function mapAddress(value: unknown, order: ErpRecord): Address {
  const address = record(value);
  return {
    name: text(address.fullName) ?? text(order.customerName),
    phone: text(address.phone) ?? text(order.customerPhone) ?? "",
    line1: text(address.line1) ?? "",
    line2: text(address.line2),
    city: text(address.city) ?? "",
    state: text(address.state) ?? "",
    pincode: text(address.pincode) ?? "",
    country: text(address.country) ?? "India",
    isDefault: false,
  };
}

function mapItem(value: unknown): OrderItem {
  const item = record(value);
  return {
    productId: text(item.item),
    sku: text(item.itemCode) ?? text(item.sku) ?? text(item.barcode) ?? "",
    name: text(item.productName) ?? text(item.itemName) ?? text(item.name) ?? text(item.description),
    image: text(item.imageUrl) ?? text(item.image),
    qty: amount(item.quantity ?? item.qty),
    rate: amount(item.unitPrice ?? item.rate),
    discount: amount(item.discount),
    gst: amount(item.gstAmount),
    amount: amount(item.lineSubtotal ?? item.netAmount),
  };
}

export function mapErpOrder(rawValue: unknown): Order {
  const raw = record(rawValue);
  const amounts = record(raw.amounts);
  const payment = record(raw.payment);
  const timeline = Array.isArray(raw.timeline) ? raw.timeline : [];
  const orderNo = text(raw.orderNumber);
  if (!orderNo) throw new Error("RetailERP order is missing its orderNumber");

  return {
    id: text(raw._id) ?? orderNo,
    orderNo,
    customerId: text(raw.customer) ?? "",
    items: Array.isArray(raw.lines) ? raw.lines.map(mapItem) : [],
    subTotal: amount(amounts.subtotal),
    discountTotal: amount(amounts.discount) + amount(amounts.couponDiscount),
    gstTotal: amount(amounts.gstTotal),
    shippingCharge: amount(amounts.shippingCharge),
    netAmount: amount(amounts.grandTotal),
    paymentMode: mapPaymentMode(payment.method),
    paymentStatus: mapPaymentStatus(payment.status),
    orderStatus: mapErpOrderStatus(raw.status),
    shippingAddress: mapAddress(raw.shippingAddress, raw),
    awbNo: text(raw.awbNo),
    storeId: text(raw.storeId),
    couponCode: text(record(raw.coupon).code),
    statusHistory: timeline.map((entryValue) => {
      const entry = record(entryValue);
      return {
        status: mapErpOrderStatus(entry.status),
        note: text(entry.note),
        by: text(entry.by),
        at: isoDate(entry.at),
      };
    }),
    createdAt: isoDate(raw.createdAt),
  };
}

export interface ErpOrderListParams {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  q?: string;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}

export interface ErpDashboardOrders {
  today: { orders: number; revenue: number };
  last30: { orders: number; revenue: number; aov: number };
  statusCounts: Record<string, number>;
  series: { date: string; orders: number; revenue: number }[];
  topSkus: { sku: string; name: string; qty: number; revenue: number }[];
  latestOrders: Order[];
  outForDelivery: Order[];
}

export class MongoErpOrderRepository {
  constructor(private readonly conn: () => Promise<Connection>) {}

  private async collection() {
    const connection = await this.conn();
    if (!connection.db) throw new Error("RetailERP database connection is not ready");
    return connection.db.collection(ERP_COLLECTIONS.orders);
  }

  async getByOrderNo(orderNo: string): Promise<Order | null> {
    const raw = await (await this.collection()).findOne({ orderNumber: orderNo });
    return raw ? mapErpOrder(raw) : null;
  }

  async list(params: ErpOrderListParams = {}): Promise<Paginated<Order>> {
    const match: ErpRecord = {};
    const statusFilters: ErpRecord[] = [];
    if (params.status) {
      const values = STATUS_VALUES[params.status];
      if (!values) throw new Error(`Unsupported RetailERP order filter: ${params.status}`);
      statusFilters.push({ status: { $in: values } });
    }
    if (params.paymentStatus) {
      match["payment.status"] = params.paymentStatus === "Pending"
        ? { $in: ["pending", "cod_pending"] }
        : params.paymentStatus === "Paid"
          ? { $in: ["paid", "cod_collected"] }
          : token(params.paymentStatus);
      if (params.paymentStatus === "Pending") {
        statusFilters.push({ status: { $nin: ["cancelled", "canceled", "returned"] } });
      }
    }
    if (statusFilters.length === 1) Object.assign(match, statusFilters[0]);
    if (statusFilters.length > 1) match.$and = statusFilters;
    if (params.q?.trim()) {
      const query = new RegExp(escapeRegex(params.q.trim()), "i");
      match.$or = [
        { orderNumber: query },
        { customerName: query },
        { customerPhone: query },
        { "shippingAddress.fullName": query },
        { "shippingAddress.phone": query },
      ];
    }
    if (params.from || params.to) {
      const createdAt: ErpRecord = {};
      if (params.from) createdAt.$gte = params.from;
      if (params.to) createdAt.$lte = params.to;
      match.createdAt = createdAt;
    }

    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 25));
    const collection = await this.collection();
    const [records, total] = await Promise.all([
      collection.find(match).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).toArray(),
      collection.countDocuments(match),
    ]);
    return {
      items: records.map(mapErpOrder),
      total,
      page,
      limit,
      pages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async getStatusCounts(): Promise<Record<string, number>> {
    const collection = await this.collection();
    const rows = await collection.aggregate<{ _id: string; count: number }>([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]).toArray();
    const counts: Record<string, number> = {};
    for (const row of rows) {
      const status = mapErpOrderStatus(row._id);
      counts[status] = (counts[status] ?? 0) + row.count;
    }
    return counts;
  }

  async countAwaitingPayment(): Promise<number> {
    return (await this.collection()).countDocuments({
      "payment.status": { $in: ["pending", "cod_pending"] },
      status: { $nin: ["cancelled", "canceled", "returned"] },
    });
  }

  async getDashboardOrders(todayStart: Date, last30Start: Date): Promise<ErpDashboardOrders> {
    const collection = await this.collection();
    const revenueGroup = (start: Date) => [
      { $match: { createdAt: { $gte: start } } },
      { $group: { _id: null, orders: { $sum: 1 }, revenue: { $sum: { $ifNull: ["$amounts.grandTotal", 0] } } } },
    ];
    const [
      todayRows,
      last30Rows,
      statusRows,
      byDay,
      topSkus,
      latest,
      outForDelivery,
    ] = await Promise.all([
      collection.aggregate<{ orders: number; revenue: number }>(revenueGroup(todayStart)).toArray(),
      collection.aggregate<{ orders: number; revenue: number }>(revenueGroup(last30Start)).toArray(),
      collection.aggregate<{ _id: string; count: number }>([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]).toArray(),
      collection.aggregate<{ _id: string; orders: number; revenue: number }>([
        { $match: { createdAt: { $gte: last30Start } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            orders: { $sum: 1 },
            revenue: { $sum: { $ifNull: ["$amounts.grandTotal", 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]).toArray(),
      collection.aggregate<{ _id: string; name?: string; qty: number; revenue: number }>([
        { $match: { createdAt: { $gte: last30Start } } },
        { $unwind: "$lines" },
        {
          $group: {
            _id: { $ifNull: ["$lines.itemCode", "$lines.sku"] },
            name: { $first: { $ifNull: ["$lines.productName", "$lines.itemName"] } },
            qty: { $sum: { $ifNull: ["$lines.quantity", "$lines.qty"] } },
            revenue: { $sum: { $ifNull: ["$lines.lineSubtotal", "$lines.netAmount"] } },
          },
        },
        { $match: { _id: { $nin: [null, ""] } } },
        { $sort: { revenue: -1 } },
        { $limit: 8 },
      ]).toArray(),
      collection.find({}).sort({ createdAt: -1 }).limit(5).toArray(),
      collection.find({ status: "out_for_delivery" }).sort({ createdAt: -1 }).limit(5).toArray(),
    ]);
    const countByStatus: Record<string, number> = {};
    for (const row of statusRows) {
      const status = mapErpOrderStatus(row._id);
      countByStatus[status] = (countByStatus[status] ?? 0) + row.count;
    }
    const today = todayRows[0] ?? { orders: 0, revenue: 0 };
    const last30 = last30Rows[0] ?? { orders: 0, revenue: 0 };

    return {
      today: { orders: today.orders, revenue: today.revenue },
      last30: {
        orders: last30.orders,
        revenue: last30.revenue,
        aov: last30.orders ? Math.round(last30.revenue / last30.orders) : 0,
      },
      statusCounts: countByStatus,
      series: byDay.map((row) => ({ date: row._id, orders: row.orders, revenue: row.revenue })),
      topSkus: topSkus.map((row) => ({
        sku: row._id,
        name: row.name ?? row._id,
        qty: row.qty,
        revenue: row.revenue,
      })),
      latestOrders: latest.map(mapErpOrder),
      outForDelivery: outForDelivery.map(mapErpOrder),
    };
  }
}
