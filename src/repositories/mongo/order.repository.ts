import type { Connection } from "mongoose";
import { ORDER_FIELDS as O, addressToDoc, buildOrderDoc, buildOrderItemDoc, mapOrder } from "@/lib/erp-mapping";
import { toObjectIdOrString } from "@/lib/db";
import { escapeRegex } from "@/lib/utils";
import { OrderModel } from "@/models/erp/order.model";
import { CounterModel } from "@/models/web/commerce.models";
import type { AnyDoc } from "@/models/_util";
import type { Order, OrderStatus, Paginated } from "@/domain/types";
import type { CreateOrderInput, OrderRepository } from "../types";

/** Website-owned orders stored with RetailERP field names (see erp-mapping.ts). */
export class MongoOrderRepository implements OrderRepository {
  constructor(private readonly conn: () => Promise<Connection>) {}
  private async M() {
    return OrderModel(await this.conn());
  }

  private async nextOrderNo(): Promise<string> {
    const Counter = CounterModel(await this.conn());
    const today = new Date();
    const ymd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
    const c = await Counter.findOneAndUpdate({ _id: `orderNo:${ymd}` }, { $inc: { seq: 1 } }, { upsert: true, new: true });
    return `WE-${ymd}-${String(c!.seq).padStart(4, "0")}`;
  }

  async create(input: CreateOrderInput): Promise<Order> {
    const M = await this.M();
    const orderNo = await this.nextOrderNo();
    const initialStatus = input.orderStatus ?? "Placed";
    const doc = buildOrderDoc({
      orderNo,
      customerId: toObjectIdOrString(input.customerId),
      items: input.items.map((i) =>
        buildOrderItemDoc({
          productId: i.productId ? toObjectIdOrString(i.productId) : undefined,
          sku: i.sku,
          name: i.name,
          image: i.image,
          qty: i.qty,
          rate: i.rate,
          discount: i.discount,
          gst: i.gst,
          amount: i.amount,
        }),
      ),
      subTotal: input.subTotal,
      discountTotal: input.discountTotal,
      gstTotal: input.gstTotal,
      shippingCharge: input.shippingCharge,
      netAmount: input.netAmount,
      paymentMode: input.paymentMode,
      paymentStatus: input.paymentStatus ?? "Pending",
      orderStatus: initialStatus,
      shippingAddress: addressToDoc(input.shippingAddress),
      awbNo: undefined,
      storeId: input.storeId ? toObjectIdOrString(input.storeId) : undefined,
      couponCode: input.couponCode,
      createdAt: new Date(),
    });
    const created = await M.create({
      ...doc,
      ...(input.paymentGatewayOrderId ? { paymentGatewayOrderId: input.paymentGatewayOrderId } : {}),
      ...(input.paymentTransactionId ? { paymentTransactionId: input.paymentTransactionId } : {}),
      statusHistory: [{
        status: initialStatus,
        by: "system",
        at: new Date(),
        ...(input.paymentTransactionId ? { note: "Paid online via Razorpay" } : {}),
      }],
    });
    return mapOrder(created.toObject());
  }

  async getByOrderNo(orderNo: string): Promise<Order | null> {
    const doc = await (await this.M()).findOne({ [O.orderNo]: orderNo }).lean<AnyDoc>();
    return doc ? mapOrder(doc) : null;
  }

  async listByCustomer(customerId: string, params: { page?: number; limit?: number } = {}): Promise<Paginated<Order>> {
    return this.paginate({ [O.customerId]: toObjectIdOrString(customerId) }, params);
  }

  async list(params: { status?: OrderStatus; paymentStatus?: Order["paymentStatus"]; q?: string; from?: Date; to?: Date; page?: number; limit?: number }) {
    const match: AnyDoc = {};
    if (params.status) match[O.orderStatus] = params.status;
    if (params.paymentStatus) {
      match[O.paymentStatus] = params.paymentStatus;
      if (params.paymentStatus === "Pending") match[O.orderStatus] = { $nin: ["Cancelled", "Returned"] };
    }
    if (params.q?.trim()) match[O.orderNo] = new RegExp(escapeRegex(params.q.trim()), "i");
    if (params.from || params.to) {
      match[O.createdAt] = {};
      if (params.from) match[O.createdAt].$gte = params.from;
      if (params.to) match[O.createdAt].$lte = params.to;
    }
    return this.paginate(match, params);
  }

  private async paginate(match: AnyDoc, params: { page?: number; limit?: number }): Promise<Paginated<Order>> {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 25));
    const M = await this.M();
    const [docs, total] = await Promise.all([
      M.find(match).sort({ [O.createdAt]: -1 }).skip((page - 1) * limit).limit(limit).lean<AnyDoc[]>(),
      M.countDocuments(match),
    ]);
    return { items: docs.map(mapOrder), total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) };
  }

  async updateStatus(orderNo: string, status: OrderStatus, note?: string, by = "admin"): Promise<Order | null> {
    const doc = await (await this.M())
      .findOneAndUpdate(
        { [O.orderNo]: orderNo },
        { $set: { [O.orderStatus]: status }, $push: { statusHistory: { status, note, by, at: new Date() } } },
        { new: true },
      )
      .lean<AnyDoc>();
    return doc ? mapOrder(doc) : null;
  }

  async setAwb(orderNo: string, awbNo: string): Promise<Order | null> {
    const doc = await (await this.M())
      .findOneAndUpdate({ [O.orderNo]: orderNo }, { $set: { [O.awbNo]: awbNo } }, { new: true })
      .lean<AnyDoc>();
    return doc ? mapOrder(doc) : null;
  }
}
