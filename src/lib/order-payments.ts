import { clearCart } from "@/lib/cart-server";
import { getWebConnection } from "@/lib/db";
import { processOrderInventory, releaseOrderInventory } from "@/lib/inventory/order-inventory";
import { OrderModel } from "@/models/erp/order.model";
import { CouponModel } from "@/models/web/commerce.models";
import type { AnyDoc } from "@/models/_util";

/**
 * Payment-state changes for website orders. Every transition is a single atomic
 * conditional update, so the browser "verify" call and the Razorpay webhook can
 * both run (even at the same moment) and the order is still finalised once.
 * Touches only website orders / carts / coupons / the website stock ledger — never ERP documents.
 */

export interface GatewayOrderRef {
  orderNo: string;
  netAmount: number;
  paymentStatus: string;
}

/** Fire-and-forget auto shipment creation for a newly paid order. */
async function schedulePaidShipment(orderNo: string) {
  try {
    const { autoShipmentsEnabled, scheduleShipment } = await import("@/lib/shiprocket/auto");
    if (!(await autoShipmentsEnabled())) return;
    await scheduleShipment(orderNo, { trigger: "payment" });
  } catch (error) {
    console.warn("[shiprocket] could not schedule shipment", error instanceof Error ? error.message : error);
  }
}

async function orders() {
  return OrderModel(await getWebConnection());
}

/**
 * [CHG-02] findOrderByGatewayId(gatewayOrderId)
 * The order exists BEFORE payment, so after payment we find it by the Razorpay order id
 * (used by the checkout confirm step and by the webhook). Null => ORDER_NOT_FOUND.
 */
export async function findOrderByGatewayId(gatewayOrderId: string): Promise<GatewayOrderRef | null> {
  const doc = await (await orders())
    .findOne({ paymentGatewayOrderId: gatewayOrderId })
    .lean<AnyDoc>();
  if (!doc) return null;
  return { orderNo: String(doc.orderNo), netAmount: Number(doc.netAmount), paymentStatus: String(doc.paymentStatus) };
}

/**
 * [CHG-02] setOrderCartToken(orderNo, cartToken)
 * The cart is emptied only after payment succeeds. The webhook has no browser cookie, so the cart token
 * is saved on the order and used later by finalizePaidOrder() to empty the right cart.
 */
export async function setOrderCartToken(orderNo: string, cartToken: string) {
  await (await orders()).updateOne({ orderNo }, { $set: { cartToken } });
}

/**
 * [CHG-02] recordCouponUse(code)
 * Called exactly once per paying order (COD in the checkout route, online in finalizePaidOrder).
 */
export async function recordCouponUse(code?: string | null) {
  if (!code) return;
  await CouponModel(await getWebConnection()).updateOne({ code }, { $inc: { usedCount: 1 } });
}

/** Queue the idempotent WhatsApp payment confirmation (never blocks payment processing). */
async function queuePaymentNotification(orderNo: string) {
  try {
    const { queueOrderPaymentSuccessMessage } = await import("@/lib/whatsapp/notifications");
    await queueOrderPaymentSuccessMessage(orderNo);
  } catch (error) {
    console.warn("[whatsapp] could not queue payment notification", error instanceof Error ? error.message : error);
  }
}

/**
 * Pending/Failed -> Paid + Confirmed, exactly once. Returns `changed: false`
 * when the order was already paid (repeat call / webhook retry).
 *
 * [INVENTORY] The hold taken when the order was saved becomes the sale here: the deduction is
 * triggered only by the call that actually flipped the order, and the inventory service is
 * idempotent, so a repeated webhook cannot deduct twice.
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
    if (existing?.paymentStatus !== "Paid") return null;
    // Repeated webhook/confirm calls are a safe retry trigger: the notification
    // claim still guarantees at most one delivered message per order.
    await queuePaymentNotification(existing.orderNo);
    return { orderNo: existing.orderNo, changed: false };
  }

  // Only the call that actually flipped the order gets here.
  try {
    await processOrderInventory(String(updated.orderNo), { kind: "deduct", trigger: "payment_paid", by: "payment" });
  } catch (error) {
    // The order is paid either way; the failure is recorded on the order as Failed so an
    // administrator can retry from Admin → Orders instead of the sale being lost silently.
    console.error("[inventory] deduction failed after payment", updated.orderNo, error);
  }
  await recordCouponUse(updated.couponCode);
  if (updated.cartToken) await clearCart(String(updated.cartToken));
  // [SHIPROCKET] Prepaid orders create their shipment only after a verified payment.
  await schedulePaidShipment(String(updated.orderNo));

  // [WHATSAPP] Payment-success message is queued only from this function, i.e.
  // only after the server verified the payment and marked the order Paid.
  await queuePaymentNotification(String(updated.orderNo));

  return { orderNo: String(updated.orderNo), changed: true };
}

/**
 * markPaymentFailed(gatewayOrderId, reason?) — called by the webhook on payment.failed.
 * Keeps the order open (Razorpay lets the customer retry on the same gateway order), so the
 * stock hold stays in place.
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
 * abandonPendingOrder(gatewayOrderId) — the customer closed the Razorpay window.
 * Cancels the unpaid order and hands its reserved stock back (RELEASE movement), so the
 * units are sellable again straight away.
 */
export async function abandonPendingOrder(gatewayOrderId: string) {
  const now = new Date();
  const abandoned = await (await orders())
    .findOneAndUpdate(
      { paymentGatewayOrderId: gatewayOrderId, paymentStatus: "Pending" },
      {
        $set: { paymentStatus: "Failed", orderStatus: "Cancelled" },
        $push: { statusHistory: { status: "Cancelled", note: "Payment window closed without payment", by: "customer", at: now } },
      },
      { new: true },
    )
    .lean<AnyDoc>();
  if (!abandoned) return;
  try {
    await releaseOrderInventory(String(abandoned.orderNo), { trigger: "payment_abandoned", by: "customer" });
  } catch (error) {
    console.error("[inventory] could not release stock for abandoned order", abandoned.orderNo, error);
  }
}
