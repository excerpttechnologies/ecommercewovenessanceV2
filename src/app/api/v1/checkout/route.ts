import type { NextRequest } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/api/body";
import { fail, handler, ok } from "@/lib/api/response";
import { getCustomerSession, requireCustomer } from "@/lib/auth";
import { clearCart, getCartToken, getCartView } from "@/lib/cart-server";
import { abandonPendingOrder, finalizePaidOrder, findOrderByGatewayId, recordCouponUse, setOrderCartToken } from "@/lib/order-payments";
import { processOrderInventory } from "@/lib/inventory/order-inventory";
import { createGatewayOrder, isRazorpayConfigured, verifyRazorpayPayment, type GatewayOrder } from "@/lib/payments";
import { buildOrderShippingSnapshot, chargedShipping, quoteForItems } from "@/lib/shiprocket";
import { getCustomers, getOrders, getSite } from "@/repositories";
import { getWebConnection } from "@/lib/db";
import { OrderModel } from "@/models/erp/order.model";

export const dynamic = "force-dynamic";

const AddressSchema = z.object({
  name: z.string().min(2).max(80),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile"),
  line1: z.string().min(3).max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(2).max(80),
  state: z.string().min(2).max(80),
  pincode: z.string().regex(/^[1-9][0-9]{5}$/),
  country: z.string().default("India"),
});

/**
 * COD orders are a real commitment: stock is deducted as soon as the order is saved.
 * A failure never blocks the sale — it is recorded on the order as inventory.status=Failed
 * so Admin → Orders can retry it (never a silent partial update).
 */
async function captureCodStock(orderNo: string) {
  try {
    return await processOrderInventory(orderNo, { kind: "deduct", trigger: "cod_order_placed", by: "checkout" });
  } catch (error) {
    console.error("[inventory] COD deduction failed for", orderNo, error);
    // Sold out is the customer's problem to see; an ERP/DB outage is ours to retry from the admin.
    if ((error as { code?: string }).code === "INSUFFICIENT_STOCK") throw error;
    return null;
  }
}

/** Online orders hold their stock until the payment is verified (deducted in finalizePaidOrder). */
async function holdOnlineStock(orderNo: string) {
  try {
    return await processOrderInventory(orderNo, { kind: "reserve", trigger: "online_order_placed", by: "checkout" });
  } catch (error) {
    console.error("[inventory] online reservation failed for", orderNo, error);
    if ((error as { code?: string }).code === "INSUFFICIENT_STOCK") throw error;
    return null;
  }
}

/** Nothing was paid: cancel the just-saved order so a sold-out line never reaches fulfilment. */
async function cancelOrderForStock(orderNo: string) {
  try {
    await OrderModel(await getWebConnection()).updateOne(
      { orderNo },
      {
        $set: { orderStatus: "Cancelled" },
        $push: { statusHistory: { status: "Cancelled", note: "Stock unavailable at checkout", by: "checkout", at: new Date() } },
      },
    );
  } catch (error) {
    console.error("[inventory] could not cancel sold-out order", orderNo, error);
  }
}

/**
 * POST /api/v1/checkout
 * Body: { address, paymentMode: "COD" | "RAZORPAY", email?, saveAddress?, payment?: {orderId,paymentId,signature}, abandonOrderId? }
 * Flow: server cart → validate stock/price → create customer (guest by mobile) → create order (ERP-shaped) → clear cart.
 * Online orders are saved as Pending/Placed with a gateway order, then finalised (Paid/Confirmed) after
 * the payment is verified — by the browser confirm step or by the Razorpay webhook.
 */
export const POST = handler(async (req: NextRequest) => {
  await requireCustomer();
  const b = await parseBody(
    req,
    z.object({
      address: AddressSchema,
      paymentMode: z.enum(["COD", "RAZORPAY"]),
      email: z.string().email().optional(),
      saveAddress: z.boolean().default(true),
      payment: z.object({
        orderId: z.string().min(1).max(100),
        paymentId: z.string().min(1).max(100),
        signature: z.string().regex(/^[a-f\d]{64}$/i),
      }).optional(),
      // [CHG-03] sent by the browser when the Razorpay window is closed without paying.
      abandonOrderId: z.string().min(1).max(100).optional(),
    }),
  );
  if (!b.ok) return b.res;

  // [CHG-03] cancel the unpaid Pending order (and release its reserved stock) when the payment
  // window is closed without paying.
  if (b.data.abandonOrderId) {
    await abandonPendingOrder(b.data.abandonOrderId);
    return ok({ step: "abandoned" });
  }

  // [CHG-04] confirm step: verify signature + amount against the SAVED order, then finalise it
  // (idempotent, shared with the webhook). Runs BEFORE the cart checks because the webhook may
  // already have paid the order and emptied the cart.
  if (b.data.paymentMode === "RAZORPAY" && b.data.payment) {
    const saved = await findOrderByGatewayId(b.data.payment.orderId);
    if (!saved) return fail("ORDER_NOT_FOUND", "We could not find this payment's order. If money was deducted, please contact support.", 404);
    if (saved.paymentStatus === "Paid") return ok({ step: "done", orderNo: saved.orderNo, netAmount: saved.netAmount });
    if (!(await verifyRazorpayPayment(b.data.payment, saved.netAmount))) {
      return fail("PAYMENT_INVALID", "Payment could not be verified for this order amount. Please retry or contact support.", 402);
    }
    const done = await finalizePaidOrder(b.data.payment.orderId, b.data.payment.paymentId);
    if (!done) return fail("ORDER_NOT_PAYABLE", "This order can no longer accept payment. If money was deducted, please contact support.", 409);
    return ok({ step: "done", orderNo: done.orderNo, netAmount: saved.netAmount }, undefined, { status: 201 });
  }

  const token = await getCartToken(false);
  if (!token) return fail("EMPTY_CART", "Your bag is empty", 409);
  const cart = await getCartView(token);
  if (!cart.lines.length) return fail("EMPTY_CART", "Your bag is empty", 409);
  if (cart.unavailable.length) return fail("UNAVAILABLE", "Some items in your bag are no longer available", 409, cart.unavailable);
  if (cart.totals.couponError) return fail("COUPON_INVALID", cart.totals.couponError, 422);

  const settings = await getSite().settings();
  const serviceablePrefixes = settings.commerce?.serviceablePincodePrefixes ?? [];
  if (serviceablePrefixes.length && !serviceablePrefixes.some((prefix) => b.data.address.pincode.startsWith(prefix))) {
    return fail("PINCODE_UNSERVICEABLE", "We do not deliver to this pincode", 422);
  }
  if (b.data.paymentMode === "COD" && settings.commerce?.codEnabled === false) return fail("COD_DISABLED", "Cash on delivery is not available", 422);
  if (b.data.paymentMode === "RAZORPAY" && settings.commerce?.razorpayEnabled !== true) {
    return fail("ONLINE_PAYMENT_DISABLED", "Online payment is currently unavailable. Please choose cash on delivery.", 422);
  }
  if (b.data.paymentMode === "RAZORPAY" && !isRazorpayConfigured()) {
    return fail("ONLINE_PAYMENT_UNAVAILABLE", "Online payment is not configured yet. Please choose cash on delivery or contact support.", 503);
  }

  // [SHIPROCKET] Shipping is quoted on the SERVER for this address, payment mode and package.
  // Amounts sent by the browser are never trusted.
  const payableSubtotal = Math.max(0, Math.round((cart.totals.subTotal - cart.totals.couponDiscount) * 100) / 100);
  const quote = await quoteForItems({
    items: cart.lines.map((line) => ({ sku: line.sku, qty: line.qty })),
    deliveryPincode: b.data.address.pincode,
    paymentMode: b.data.paymentMode === "COD" ? "COD" : "PREPAID",
    payableSubtotal,
  });
  if (!quote.serviceable) {
    return fail("PINCODE_UNSERVICEABLE", "Delivery is not available to this pincode right now. Please try another address or contact us.", 422, { reason: quote.reason });
  }
  if (b.data.paymentMode === "COD" && !quote.codAvailable) {
    return fail("COD_UNAVAILABLE", "Cash on delivery is not available for this pincode. Please pay online.", 422);
  }
  const shippingCharge = chargedShipping(quote);
  const netAmount = Math.round((payableSubtotal + shippingCharge) * 100) / 100;

  const session = await getCustomerSession();
  const customers = getCustomers();
  const customer = session ? await customers.getById(session.sub) : null;
  const cust = customer ?? (await customers.upsertByMobile({ mobile: b.data.address.phone, name: b.data.address.name, email: b.data.email }));
  if (b.data.saveAddress) {
    const exists = cust.addresses.some((a) => a.pincode === b.data.address.pincode && a.line1 === b.data.address.line1);
    if (!exists) await customers.setAddresses(cust.id, [...cust.addresses, { ...b.data.address, isDefault: cust.addresses.length === 0 }]);
  }

  // [CHG-05] The Razorpay order is created here, and the website order is saved right after as
  // paymentStatus=Pending / orderStatus=Placed WITH paymentGatewayOrderId. Amount comes from the
  // server-priced cart only.
  const online = b.data.paymentMode === "RAZORPAY";
  let gateway: GatewayOrder | undefined;
  if (online) gateway = await createGatewayOrder(netAmount, token.slice(0, 12));

  const order = await getOrders().create({
    customerId: cust.id,
    items: cart.lines.map((l) => {
      const rate = l.product.pricing.sellingPrice;
      const gross = rate * l.qty;
      const gstRate = l.product.pricing.gstPercent ?? 5;
      return { productId: l.product.id, sku: l.sku, name: l.product.name, image: l.product.images[0], qty: l.qty, rate, discount: 0, gst: Math.round((gross - gross / (1 + gstRate / 100)) * 100) / 100, amount: gross };
    }),
    subTotal: cart.totals.subTotal,
    discountTotal: cart.totals.couponDiscount,
    gstTotal: cart.totals.gstTotal,
    shippingCharge,
    netAmount,
    shipping: buildOrderShippingSnapshot(quote),
    paymentMode: b.data.paymentMode,
    paymentStatus: "Pending", // set to Paid by finalizePaidOrder() after verification
    orderStatus: "Placed",    // finalizePaidOrder() sets Confirmed
    paymentGatewayOrderId: gateway?.gatewayOrderId,
    shippingAddress: b.data.address,
    storeId: settings.defaultStoreId ?? undefined,
    couponCode: cart.couponCode,
  });

  // [CHG-06] Online orders must NOT clear the cart or count the coupon yet (payment may still fail);
  // both happen in finalizePaidOrder() when payment lands. COD does them now, counted ONCE.
  // [INVENTORY] Online orders reserve their stock now and deduct it when the payment is verified;
  // COD orders deduct immediately because the order is already a commitment.
  if (online) {
    try {
      await holdOnlineStock(order.orderNo);
    } catch {
      await cancelOrderForStock(order.orderNo);
      return fail("OUT_OF_STOCK", "One or more items in your bag just sold out. No payment was taken.", 409);
    }
    await setOrderCartToken(order.orderNo, token);
    return ok({ step: "payment", orderNo: order.orderNo, gateway }, undefined, { status: 201 });
  }

  try {
    await captureCodStock(order.orderNo);
  } catch {
    await cancelOrderForStock(order.orderNo);
    return fail("OUT_OF_STOCK", "One or more items in your bag just sold out. Please adjust your bag and try again.", 409);
  }
  await recordCouponUse(cart.couponCode);
  await clearCart(token);

  return ok({ step: "done", orderNo: order.orderNo, netAmount: order.netAmount }, undefined, { status: 201 });
});
