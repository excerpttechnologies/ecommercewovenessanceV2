import { Schema, type Connection } from "mongoose";
import { ERP_COLLECTIONS, ORDER_FIELDS as O, ORDER_ITEM_FIELDS as I } from "@/lib/erp-mapping";
import { defineFromMapping, getModel, type AnyDoc } from "../_util";
import { AddressSchema } from "./customer.model";

/**
 * Web orders — WEBSITE-OWNED (WEB_DB_NAME) but ERP-shaped for future write-back.
 */
export const OrderItemSchema = new Schema(
  defineFromMapping({
    [I.productId]: Schema.Types.Mixed,
    [I.sku]: { type: String, required: true },
    [I.name]: String,
    [I.image]: String,
    [I.qty]: { type: Number, required: true, min: 1 },
    [I.rate]: { type: Number, required: true },
    [I.discount]: { type: Number, default: 0 },
    [I.gst]: { type: Number, default: 0 },
    [I.amount]: { type: Number, required: true },
  }),
  { _id: false, strict: false },
);

export const OrderSchema = new Schema(
  {
    ...defineFromMapping({
      [O.orderNo]: { type: String, required: true, unique: true, index: true },
      [O.customerId]: { type: Schema.Types.Mixed, index: true },
      [O.items]: [OrderItemSchema],
      [O.subTotal]: Number,
      [O.discountTotal]: { type: Number, default: 0 },
      [O.gstTotal]: { type: Number, default: 0 },
      [O.shippingCharge]: { type: Number, default: 0 },
      [O.netAmount]: Number,
      [O.paymentMode]: { type: String, default: "COD" },
      [O.paymentStatus]: { type: String, default: "Pending", index: true },
      [O.orderStatus]: { type: String, default: "Placed", index: true },
      [O.shippingAddress]: AddressSchema,
      [O.awbNo]: String,
      [O.storeId]: Schema.Types.Mixed,
      [O.couponCode]: String,
      paymentGatewayOrderId: { type: String, unique: true, sparse: true },
      paymentTransactionId: { type: String, unique: true, sparse: true },
      [O.createdAt]: { type: Date, default: Date.now, index: true },
    }),
    // website-only audit trail (not ERP fields)
    statusHistory: [{ status: String, note: String, by: String, at: { type: Date, default: Date.now } }],
    internalNotes: [{ note: String, by: String, at: { type: Date, default: Date.now } }],
  },
  { collection: ERP_COLLECTIONS.orders, strict: false, versionKey: false },
);

export const OrderModel = (conn: Connection) => getModel<AnyDoc>(conn, "Order", OrderSchema);
