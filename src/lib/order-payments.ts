import { clearCart } from "@/lib/cart-server";
import { getWebConnection } from "@/lib/db";
import { OrderModel } from "@/models/erp/order.model";
import { CouponModel } from "@/models/web/commerce.models";
import type { AnyDoc } from "@/models/_util";

/**
 * Payment-state changes for website orders. Every transition is a single atomic
 * conditional update, so the browser "verify" call and the Razorpay webhook can
 * both run (even at the same moment) and the order is still finalised once.
 * Touches only website orders / carts / coupons — never ERP data or stock.
 */

export interface GatewayOrderRef {
  orderNo: string;
  netAmount: number;
  paymentStatus: string;
}

async function orders() {
  return OrderModel(await getWebConnection());
}

/**
 * [CHG-02] NEW FUNCTION: findOrderByGatewayId(gatewayOrderId)
 * WHY: the order now exists BEFORE payment, so after payment we find it by the Razorpay order id
 * (used by checkout confirm step and by the webhook). Returns { orderNo, netAmount, paymentStatus } or null.
 * ERROR HINT: "ORDER_NOT_FOUND" from checkout means no website order has this paymentGatewayOrderId.
 */
export async function findOrderByGatewayId(gatewayOrderId: string): Promise<GatewayOrderRef | null> {
  const doc = await (await orders())
    .findOne({ paymentGatewayOrderId: gatewayOrderId })
    .lean<AnyDoc>();
  if (!doc) return null;
  return { orderNo: String(doc.orderNo), netAmount: Number(doc.netAmount), paymentStatus: String(doc.paymentStatus) };
}

/**
 * [CHG-02] NEW FUNCTION: setOrderCartToken(orderNo, cartToken)
 * WHY: the cart is emptied only after payment succeeds. The webhook has no browser cookie, so the cart token
 * is saved on the order and used later by finalizePaidOrder() to empty the right cart.
 */
export async function setOrderCartToken(orderNo: string, cartToken: string) {
  await (await orders()).updateOne({ orderNo }, { $set: { cartToken } });
}

/**
 * [CHG-02] NEW FUNCTION: recordCouponUse(code)
 * WHY: the old checkout route counted the coupon TWICE (duplicated line). Now one helper, called exactly once:
 * COD -> in checkout route; online -> inside finalizePaidOrder() when the order flips to Paid.
 */
export async function recordCouponUse(code?: string | null) {
  if (!code) return;
  await CouponModel(await getWebConnection()).updateOne({ code }, { $inc: { usedCount: 1 } });
}

/**
 * Pending/Failed -> Paid + Confirmed, exactly once. Returns `changed: false`
 * when the order was already paid (repeat call / webhook retry).
 * [CHG-02] NEW FUNCTION: finalizePaidOrder(gatewayOrderId, paymentId)
 * WHY: both the browser confirm step and the Razorpay webhook can arrive (even together). One atomic
 * conditional update (only Pending/Failed -> Paid) means the order, coupon count and cart clearing happen ONCE.
 * ERROR HINT: returns null => order not found or not payable (e.g. already Cancelled and not Pending/Failed).
 */
export async function finalizePaidOrder(
  gatewayOrderId: string,
  paymentId: string,
): Promise<{ orderNo: string; changed: boolean } | null> {
  const M = await orders();
  const now = new Date();
  const updated = await M.findOneAndUpdate(
    { paymentGatewayOrderId: gatewayOrderId, paymentStatus: { $in: ["Pending", "Failed"] } },
    {
      $set: { paymentStatus: "Paid", orderStatus: "Confirmed", paymentTransactionId: paymentId, paidAt: now },
      $push: { statusHistory: { status: "Confirmed", note: "Paid online via Razorpay", by: "payment", at: now } },
    },
    { new: true },
  ).lean<AnyDoc>();

  if (!updated) {
    const existing = await findOrderByGatewayId(gatewayOrderId);
    return existing?.paymentStatus === "Paid" ? { orderNo: existing.orderNo, changed: false } : null;
  }

  // Only the call that actually flipped the order gets here.
  await recordCouponUse(updated.couponCode);
  if (updated.cartToken) await clearCart(String(updated.cartToken));
  return { orderNo: String(updated.orderNo), changed: true };
}

/**
 * [CHG-02] NEW FUNCTION: markPaymentFailed(gatewayOrderId, reason?)
 * WHY: called by the webhook on payment.failed. Sets paymentStatus=Failed but keeps the order open, because
 * Razorpay lets the customer retry on the same gateway order (finalizePaidOrder accepts Failed -> Paid).
 */
export async function markPaymentFailed(gatewayOrderId: string, reason?: string) {
  const now = new Date();
  await (await orders()).updateOne(
    { paymentGatewayOrderId: gatewayOrderId, paymentStatus: "Pending" },
    {
      $set: { paymentStatus: "Failed" },
      $push: { statusHistory: { status: "Placed", note: `Payment failed${reason ? `: ${reason}`.slice(0, 160) : ""}`, by: "payment", at: now } },
    },
  );
}

/**
 * [CHG-02] NEW FUNCTION: abandonPendingOrder(gatewayOrderId)
 * WHY: the order is created before payment, so if the customer closes the Razorpay window we cancel that unpaid
 * order (paymentStatus=Failed, orderStatus=Cancelled) instead of leaving a Pending order in the admin lists.
 * Only touches orders still Pending, so a paid order is never cancelled by this.
 */
export async function abandonPendingOrder(gatewayOrderId: string) {
  const now = new Date();
  await (await orders()).updateOne(
    { paymentGatewayOrderId: gatewayOrderId, paymentStatus: "Pending" },
    {
      $set: { paymentStatus: "Failed", orderStatus: "Cancelled" },
      $push: { statusHistory: { status: "Cancelled", note: "Payment window closed without payment", by: "customer", at: now } },
    },
  );
}
