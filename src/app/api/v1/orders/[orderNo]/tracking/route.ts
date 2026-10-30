import type { NextRequest } from "next/server";
import { fail, handler, ok } from "@/lib/api/response";
import { getCustomerSession } from "@/lib/auth";
import { getOrders } from "@/repositories";
import { applyTrackingToOrder, getTracking, getShippingContext } from "@/lib/shiprocket";
import { safeError } from "@/lib/shiprocket";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/orders/:orderNo/tracking?phone=…[&refresh=1]
 * Customer-facing tracking for their own order (session owner or matching phone).
 * Server-side fetch with caching; `refresh=1` bypasses the cache.
 */
export const GET = handler(async (req: NextRequest, ctx: { params: Promise<{ orderNo: string }> }) => {
  const { orderNo } = await ctx.params;
  const order = await getOrders().getByOrderNo(orderNo);
  if (!order) return fail("NOT_FOUND", "Order not found", 404);

  const session = await getCustomerSession();
  const phone = req.nextUrl.searchParams.get("phone");
  const owner = session?.sub === order.customerId || (phone && order.shippingAddress.phone === phone.replace(/\D/g, "").slice(-10));
  if (!owner) return fail("FORBIDDEN", "Enter the phone number used on the order to view it", 403);

  const awb = order.shipping?.awbNo ?? order.awbNo;
  const shipmentId = order.shipping?.shiprocketShipmentId ?? order.shiprocketShipmentId;
  if (!awb && !shipmentId) {
    return ok({
      available: false,
      status: order.shipping?.status ?? "not_created",
      message: order.shipping?.status === "failed" ? "Shipment could not be created. Our team is on it." : "Tracking will appear once your order is handed to the courier.",
      shipping: order.shipping,
    });
  }

  try {
    const context = await getShippingContext();
    const refresh = req.nextUrl.searchParams.get("refresh") === "1";
    const tracking = await getTracking(context, { awb: awb ?? undefined, shipmentId: shipmentId ?? undefined }, { refresh });
    await applyTrackingToOrder(orderNo, tracking);
    return ok({ available: true, tracking, shipping: order.shipping }, { cache: "no-store" });
  } catch (error) {
    const safe = safeError(error);
    return ok(
      {
        available: false,
        status: order.shipping?.status ?? "not_created",
        message: safe.message,
        trackingUrl: order.shipping?.trackingUrl,
        trackingEvents: order.shipping?.trackingEvents ?? [],
        etaDays: order.shipping?.etaDays,
        estimatedDelivery: order.shipping?.estimatedDelivery,
      },
      { cache: "no-store" },
    );
  }
});
