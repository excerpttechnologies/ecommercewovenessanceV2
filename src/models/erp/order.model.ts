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

/** Shiprocket fulfilment data nested on the existing order (website-owned, migration-safe). */
export const OrderShippingSchema = new Schema(
  {
    status: { type: String, default: "not_created", index: true },
    provider: String,
    quotedCharge: Number,
    baseCharge: Number,
    codAvailable: Boolean,
    courierId: Schema.Types.Mixed,
    courierName: String,
    etaDays: Number,
    estimatedDelivery: String,
    trackingUrl: String,
    trackingStatus: String,
    trackingUpdatedAt: String,
    trackingEvents: { type: [Schema.Types.Mixed], default: [] },
    couriers: { type: [Schema.Types.Mixed], default: [] },
    package: { weight: Number, length: Number, breadth: Number, height: Number },
    shiprocketOrderId: { type: Number, index: true },
    shiprocketShipmentId: { type: Number, index: true },
    awbNo: { type: String, index: true },
    pickupRequested: Boolean,
    pickupScheduledDate: String,
    labelUrl: String,
    manifestUrl: String,
    invoiceUrl: String,
    lastError: { code: String, message: String, at: String },
    returnOrderId: Number,
    returnShipmentId: Number,
    returnAwb: String,
    returnStatus: String,
    returnRequestedAt: String,
    returnDeliveredAt: String,
    rtoInitiatedAt: String,
    rtoDeliveredAt: String,
    cancelledAt: String,
    events: { type: [String], default: [] },
    updatedAt: String,
  },
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
      [O.awbNo]: { type: String, index: true },
      [O.storeId]: Schema.Types.Mixed,
      [O.couponCode]: String,
      paymentGatewayOrderId: { type: String, unique: true, sparse: true },
      paymentTransactionId: { type: String, unique: true, sparse: true },
      [O.createdAt]: { type: Date, default: Date.now, index: true },
    }),
    // website-only audit trail (not ERP fields)
    statusHistory: [{ status: String, note: String, by: String, at: { type: Date, default: Date.now } }],
    internalNotes: [{ note: String, by: String, at: { type: Date, default: Date.now } }],
    // legacy top-level Shiprocket fields kept for compatibility; the nested `shipping`
    // object is the source of truth for new code.
    courierName: String,
    shiprocketOrderId: { type: Number, index: true },
    shiprocketShipmentId: { type: Number, index: true },
    shiprocketLock: Date,
    shipping: OrderShippingSchema,
  },
  { collection: ERP_COLLECTIONS.orders, strict: false, versionKey: false },
);

export const OrderModel = (conn: Connection) => getModel<AnyDoc>(conn, "Order", OrderSchema);
