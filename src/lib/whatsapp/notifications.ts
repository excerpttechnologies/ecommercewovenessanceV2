import { getWebConnection } from "@/lib/db";
import { OrderModel } from "@/models/erp/order.model";
import {
  WhatsAppNotificationModel,
  type WhatsAppNotificationStatus,
} from "@/models/web/commerce.models";
import type { AnyDoc } from "@/models/_util";
import { getCustomers } from "@/repositories";
import {
  getWhatsAppConfig,
  ORDER_NOTIFICATION_MAX_ATTEMPTS,
  whatsappConfigurationSummary,
  type WhatsAppConfig,
} from "./config";
import { WhatsAppError, whatsAppErrorDiagnostics } from "./client";
import { normaliseWhatsAppNumber, maskWhatsAppNumber } from "./phone";
import { sendOrderPaymentTemplate, type OrderMessageSource } from "./templates";

/**
 * Idempotent order-payment WhatsApp notifications.
 *
 * The order row is the source of truth: a message is only ever sent when the
 * order's paymentStatus is "Paid" (set by finalizePaidOrder after the server
 * verified the payment). A unique `order_paid:<orderNo>` row in
 * whatsappNotifications is claimed atomically so webhook retries cannot send
 * duplicates.
 */

const CLAIM_TTL_MS = 2 * 60_000;
const ORDER_DEDUPE_PREFIX = "order_paid:";

export type OrderNotificationResult =
  | { status: "SENT"; messageId: string }
  | { status: "ALREADY_SENT"; messageId?: string }
  | { status: "IN_PROGRESS" }
  | { status: "SKIPPED"; reason: "ORDER_NOT_FOUND" | "ORDER_NOT_PAID" }
  | { status: "FAILED"; reason: string };

export interface WhatsAppNotificationView {
  id: string | null;
  orderNo: string | null;
  status: WhatsAppNotificationStatus;
  mobileMasked: string | null;
  templateName: string | null;
  providerMessageId: string | null;
  attempts: number;
  sentAt: string | null;
  lastAttemptAt: string | null;
  failureReason: string | null;
  retryable: boolean;
  canRetry: boolean;
}

const sanitizeFailure = (error: unknown) => {
  const message = error instanceof Error ? error.message : "WhatsApp delivery failed";
  const code = error instanceof WhatsAppError
    ? error.providerCode ?? error.diagnostics?.providerCode
    : undefined;
  const prefix = code === undefined ? "" : `[${code}] `;
  return `${prefix}${message}`.replace(/\s+/g, " ").trim().slice(0, 300);
};

const iso = (value: unknown) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const dedupeKeyFor = (orderNo: string) => `${ORDER_DEDUPE_PREFIX}${orderNo}`;

function notificationView(doc: AnyDoc | null): WhatsAppNotificationView | null {
  if (!doc) return null;
  return {
    id: doc._id ? String(doc._id) : null,
    orderNo: doc.orderNo ? String(doc.orderNo) : null,
    status: (doc.status as WhatsAppNotificationStatus) ?? "PENDING",
    mobileMasked: doc.mobile ? maskWhatsAppNumber(String(doc.mobile)) : null,
    templateName: doc.templateName ? String(doc.templateName) : null,
    providerMessageId: doc.providerMessageId ? String(doc.providerMessageId) : null,
    attempts: Number(doc.attempts ?? 0),
    sentAt: iso(doc.sentAt),
    lastAttemptAt: iso(doc.lastAttemptAt),
    failureReason: doc.failureReason ? String(doc.failureReason) : null,
    retryable: Boolean(doc.retryable),
    canRetry: doc.status !== "SENT",
  };
}

async function notifications() {
  return WhatsAppNotificationModel(await getWebConnection());
}

/** Latest order-payment notification for an order, safe for admin display. */
export async function getOrderWhatsAppNotification(orderNo: string): Promise<WhatsAppNotificationView | null> {
  const N = await notifications();
  const doc = await N.findOne({ type: "order_paid", orderNo }).lean<AnyDoc>();
  return notificationView(doc);
}

/** Resolve the recipient, preferring the shipping address captured with the order. */
async function recipientForOrder(order: AnyDoc): Promise<string | null> {
  const shippingPhone = order.shippingAddress?.phone;
  const fromAddress = normaliseWhatsAppNumber(String(shippingPhone ?? ""));
  if (fromAddress) return fromAddress.e164;

  if (order.customerId) {
    try {
      const customer = await getCustomers().getById(String(order.customerId));
      const fromCustomer = normaliseWhatsAppNumber(String(customer?.mobile ?? ""));
      if (fromCustomer) return fromCustomer.e164;
    } catch {
      // A lookup failure must not resend or throw.
    }
  }
  return null;
}

async function recordInvalidRecipient(order: AnyDoc): Promise<OrderNotificationResult> {
  const orderNo = String(order.orderNo);
  const N = await notifications();
  const existing = await N.findOne({ dedupeKey: dedupeKeyFor(orderNo) }).lean<AnyDoc>();
  if (existing?.status === "SENT") return { status: "ALREADY_SENT", messageId: existing.providerMessageId };
  const now = new Date();
  await N.updateOne(
    { dedupeKey: dedupeKeyFor(orderNo) },
    {
      $setOnInsert: { type: "order_paid" },
      $set: {
        orderNo,
        customerId: order.customerId ? String(order.customerId) : undefined,
        status: "FAILED",
        failureReason: "INVALID_WHATSAPP_NUMBER",
        retryable: false,
        lastAttemptAt: now,
        templateName: getWhatsAppConfig().orderTemplate || null,
        messageType: "order_paid",
      },
    },
    { upsert: true },
  );
  return { status: "FAILED", reason: "INVALID_WHATSAPP_NUMBER" };
}

/**
 * Send the payment-success message once per order.
 *
 * Safe to call from a webhook retry: returns ALREADY_SENT when a previous
 * attempt succeeded and never sends twice. Delivery failures are recorded and
 * returned — they never throw into the payment flow.
 */
export async function sendOrderPaymentSuccessMessage(
  orderNo: string,
  options: { force?: boolean } = {},
): Promise<OrderNotificationResult> {
  const M = OrderModel(await getWebConnection());
  const order = await M.findOne({ orderNo }).lean<AnyDoc>();
  if (!order) return { status: "SKIPPED", reason: "ORDER_NOT_FOUND" };

  // Never send before the server has marked the order paid.
  if (String(order.paymentStatus) !== "Paid") return { status: "SKIPPED", reason: "ORDER_NOT_PAID" };

  const recipient = await recipientForOrder(order);
  if (!recipient) return recordInvalidRecipient(order);

  const N = await notifications();
  const key = dedupeKeyFor(orderNo);
  const existing = await N.findOne({ dedupeKey: key }).lean<AnyDoc>();
  if (existing?.status === "SENT") {
    return { status: "ALREADY_SENT", messageId: existing.providerMessageId };
  }
  if (
    existing?.status === "PENDING" &&
    existing.claimedAt &&
    Date.now() - new Date(existing.claimedAt).getTime() < CLAIM_TTL_MS
  ) {
    return { status: "IN_PROGRESS" };
  }
  if (existing?.status === "FAILED" && !existing.retryable && !options.force) {
    return { status: "FAILED", reason: String(existing.failureReason ?? "WHATSAPP_DELIVERY_FAILED") };
  }
  if (Number(existing?.attempts ?? 0) >= ORDER_NOTIFICATION_MAX_ATTEMPTS && !options.force) {
    return { status: "FAILED", reason: String(existing?.failureReason ?? "MAX_ATTEMPTS") };
  }

  const config: WhatsAppConfig = getWhatsAppConfig();
  const now = new Date();
  const staleBefore = new Date(now.getTime() - CLAIM_TTL_MS);
  let claimed: AnyDoc | null = null;
  try {
    // Claim atomically. A fresh PENDING row belongs to another in-flight send and
    // must not be stolen (that race would deliver the message twice). A stale
    // PENDING row is reclaimable so a crashed request can be recovered.
    claimed = await N.findOneAndUpdate(
      {
        dedupeKey: key,
        $or: [
          { status: "FAILED" },
          { status: "PENDING", claimedAt: { $lt: staleBefore } },
          { status: "PENDING", claimedAt: { $exists: false } },
        ],
      },
      {
        $setOnInsert: { type: "order_paid" },
        $set: {
          orderNo,
          customerId: order.customerId ? String(order.customerId) : undefined,
          mobile: recipient,
          templateName: config.orderTemplate || null,
          messageType: "order_paid",
          status: "PENDING",
          claimedAt: now,
          lastAttemptAt: now,
          failureReason: null,
          retryable: false,
          metadata: {
            amount: Number(order.netAmount ?? 0),
            paymentReference: order.paymentTransactionId ?? order.paymentGatewayOrderId ?? null,
            orderStatus: order.paymentStatus,
          },
        },
        $inc: { attempts: 1 },
      },
      { upsert: true, new: true },
    ).lean<AnyDoc>();
  } catch (error) {
    // A concurrent request may have inserted/sent the unique row.
    if ((error as { code?: number }).code === 11000) {
      const latest = await N.findOne({ dedupeKey: key }).lean<AnyDoc>();
      if (latest?.status === "SENT") return { status: "ALREADY_SENT", messageId: latest.providerMessageId };
      return { status: "IN_PROGRESS" };
    }
    throw error;
  }

  if (!claimed) {
    const latest = await N.findOne({ dedupeKey: key }).lean<AnyDoc>();
    if (latest?.status === "SENT") return { status: "ALREADY_SENT", messageId: latest.providerMessageId };
    return { status: "IN_PROGRESS" };
  }

  const source: OrderMessageSource = {
    orderNo: String(order.orderNo),
    createdAt: order.createdAt,
    paymentMode: order.paymentMode,
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus,
    netAmount: Number(order.netAmount ?? 0),
    paymentTransactionId: order.paymentTransactionId,
    paymentGatewayOrderId: order.paymentGatewayOrderId,
    shippingAddress: order.shippingAddress,
  };

  try {
    const sent = await sendOrderPaymentTemplate(recipient, source, config);
    await N.updateOne(
      { _id: claimed._id, status: "PENDING" },
      {
        $set: {
          status: "SENT",
          providerMessageId: sent.messageId,
          sentAt: new Date(),
          failureReason: null,
          retryable: false,
        },
        $unset: { claimedAt: 1 },
      },
    );
    return { status: "SENT", messageId: sent.messageId };
  } catch (error) {
    const reason = sanitizeFailure(error);
    console.error("[whatsapp] order notification failed", {
      orderNo,
      ...whatsAppErrorDiagnostics(error),
      reason,
    });
    const retryable = error instanceof WhatsAppError ? error.retryable : false;
    await N.updateOne(
      { _id: claimed._id, status: "PENDING" },
      {
        $set: { status: "FAILED", failureReason: reason, retryable },
        $unset: { claimedAt: 1 },
      },
    ).catch(() => undefined);
    return { status: "FAILED", reason };
  }
}

/**
 * Schedule the notification after the HTTP response. Never lets a WhatsApp
 * problem affect checkout or the Razorpay webhook response.
 */
export async function queueOrderPaymentSuccessMessage(orderNo: string): Promise<void> {
  const run = async () => {
    try {
      await sendOrderPaymentSuccessMessage(orderNo);
    } catch (error) {
      console.warn("[whatsapp] order notification failed", error instanceof Error ? error.message : error);
    }
  };
  try {
    const { after } = await import("next/server");
    // `after` keeps the request alive until this promise settles in serverless
    // deployments, so the send must be awaited inside the callback.
    after(run);
  } catch {
    // Outside a Next request scope (scripts/tests): run without blocking the caller.
    void run();
  }
}

export interface WhatsAppAdminStatus {
  config: ReturnType<typeof whatsappConfigurationSummary>;
  orderCounts: Record<WhatsAppNotificationStatus, number>;
  otpCounts: Record<WhatsAppNotificationStatus, number>;
  recentOrders: WhatsAppNotificationView[];
  recentOtp: Array<{
    id: string | null;
    status: WhatsAppNotificationStatus;
    mobileMasked: string | null;
    sentAt: string | null;
    failureReason: string | null;
  }>;
}

/** Admin → Settings WhatsApp panel: configuration + recent delivery status. */
export async function getWhatsAppAdminStatus(limit = 10): Promise<WhatsAppAdminStatus> {
  const config = whatsappConfigurationSummary();
  const empty = (): Record<WhatsAppNotificationStatus, number> => ({
    PENDING: 0,
    SENT: 0,
    FAILED: 0,
    SKIPPED: 0,
  });
  const orderCounts = empty();
  const otpCounts = empty();

  try {
    const N = await notifications();
    const [orderAgg, otpAgg, recentOrders, recentOtp] = await Promise.all([
      N.aggregate<{ _id: WhatsAppNotificationStatus; count: number }>([
        { $match: { type: "order_paid" } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      N.aggregate<{ _id: WhatsAppNotificationStatus; count: number }>([
        { $match: { type: "otp" } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      N.find({ type: "order_paid" }).sort({ createdAt: -1 }).limit(limit).lean<AnyDoc[]>(),
      N.find({ type: "otp" }).sort({ createdAt: -1 }).limit(limit).lean<AnyDoc[]>(),
    ]);
    for (const row of orderAgg) if (row._id in orderCounts) orderCounts[row._id] = row.count;
    for (const row of otpAgg) if (row._id in otpCounts) otpCounts[row._id] = row.count;
    return {
      config,
      orderCounts,
      otpCounts,
      recentOrders: recentOrders.map(notificationView).filter((row): row is WhatsAppNotificationView => Boolean(row)),
      recentOtp: recentOtp.map((row) => ({
        id: row._id ? String(row._id) : null,
        status: (row.status as WhatsAppNotificationStatus) ?? "PENDING",
        mobileMasked: row.mobile ? maskWhatsAppNumber(String(row.mobile)) : null,
        sentAt: iso(row.sentAt),
        failureReason: row.failureReason ? String(row.failureReason) : null,
      })),
    };
  } catch {
    return { config, orderCounts, otpCounts, recentOrders: [], recentOtp: [] };
  }
}
