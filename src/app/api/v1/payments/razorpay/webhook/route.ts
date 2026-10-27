import { NextResponse, type NextRequest } from "next/server";
import { finalizePaidOrder, findOrderByGatewayId, markPaymentFailed } from "@/lib/order-payments";
import { verifyWebhookSignature } from "@/lib/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PaymentEntity {
  id?: string;
  order_id?: string;
  amount?: number;
  currency?: string;
  error_description?: string;
}

/**
 * POST /api/v1/payments/razorpay/webhook
 * [CHG-10] NEW FILE / FUNCTION: POST. WHY: Razorpay calls this even if the customer closes the tab after paying,
 * so a paid order is never left Pending. ERROR HINTS: HTTP 400 = wrong/missing RAZORPAY_WEBHOOK_SECRET or tampered body;
 * HTTP 500 = database problem (Razorpay retries automatically). Dashboard: Account & Settings > Webhooks > delivery log.
 * Razorpay calls this even if the customer closes the tab after paying, so a paid order is never left unconfirmed.
 * The signature is over the RAW body, hence req.text(). Safe to receive repeats: finalizePaidOrder is idempotent.
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verifyWebhookSignature(raw, req.headers.get("x-razorpay-signature") ?? "")) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  let event: { event?: string; payload?: { payment?: { entity?: PaymentEntity } } };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const payment = event.payload?.payment?.entity;
  try {
    if ((event.event === "payment.captured" || event.event === "order.paid") && payment?.id && payment.order_id) {
      const saved = await findOrderByGatewayId(payment.order_id);
      if (!saved) {
        console.warn("[razorpay-webhook] no order for gateway order", payment.order_id);
      } else if (payment.amount !== Math.round(saved.netAmount * 100) || payment.currency !== "INR") {
        // [CHG-10] WHY: never mark an order Paid if the captured amount differs from what we saved for that order.
        console.error("[razorpay-webhook] amount mismatch for", saved.orderNo);
      } else {
        await finalizePaidOrder(payment.order_id, payment.id);
      }
    } else if (event.event === "payment.failed" && payment?.order_id) {
      await markPaymentFailed(payment.order_id, payment.error_description);
    }
  } catch (err) {
    console.error("[razorpay-webhook] processing failed", (err as Error).message);
    return NextResponse.json({ ok: false }, { status: 500 }); // Razorpay retries on 5xx
  }
  return NextResponse.json({ ok: true });
}
