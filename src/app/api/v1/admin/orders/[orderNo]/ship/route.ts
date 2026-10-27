import type { NextRequest } from "next/server";
import { fail, handler, ok } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth";
import { getWebConnection } from "@/lib/db";
import { mapOrder } from "@/lib/erp-mapping";
import { shipOrder } from "@/lib/shiprocket";
import { OrderModel } from "@/models/erp/order.model";
import type { AnyDoc } from "@/models/_util";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ orderNo: string }> };

/**
 * NEW: POST /api/v1/admin/orders/:orderNo/ship
 * Sends one WEBSITE order to Shiprocket. Safe to click twice — it never creates two shipments.
 * Only writes extra fields (awbNo, shiprocket*) on the website order; ERP data is never touched.
 */
export const POST = handler(async (_req: NextRequest, ctx: Ctx) => {
  const session = await requireAdmin("orders:write");
  const { orderNo } = await ctx.params;
  const M = OrderModel(await getWebConnection());

  const doc = await M.findOne({ orderNo }).lean<AnyDoc>();
  if (!doc) return fail("NOT_FOUND", "Website order not found", 404);
  if (doc.shiprocketShipmentId) {
    return ok({ alreadyShipped: true, awbNo: doc.awbNo ?? null, shipmentId: doc.shiprocketShipmentId });
  }

  const order = mapOrder(doc);
  if (order.orderStatus === "Cancelled") return fail("NOT_SHIPPABLE", "This order is cancelled.", 409);
  if (order.paymentMode !== "COD" && order.paymentStatus !== "Paid") {
    return fail("NOT_SHIPPABLE", "Online order is not paid yet.", 409);
  }

  // Claim the order atomically so a double click can't create two shipments.
  const claimed = await M.findOneAndUpdate(
    { orderNo, shiprocketShipmentId: { $exists: false }, shiprocketLock: { $exists: false } },
    { $set: { shiprocketLock: new Date() } },
    { new: false },
  ).lean<AnyDoc>();
  if (!claimed) return fail("IN_PROGRESS", "Shipment is already being created. Refresh in a moment.", 409);

  try {
    const result = await shipOrder({
      orderNo: order.orderNo,
      createdAt: order.createdAt,
      paymentMode: order.paymentMode,
      netAmount: order.netAmount,
      subTotal: order.subTotal,
      shippingCharge: order.shippingCharge,
      items: order.items.map((i) => ({ name: i.name, sku: i.sku, qty: i.qty, rate: i.rate, discount: i.discount })),
      address: order.shippingAddress,
    });

    const now = new Date();
    await M.updateOne(
      { orderNo },
      {
        $set: {
          shiprocketOrderId: result.shiprocketOrderId,
          shiprocketShipmentId: result.shipmentId,
          ...(result.awbNo ? { awbNo: result.awbNo } : {}),
          ...(result.courierName ? { courierName: result.courierName } : {}),
          orderStatus: order.orderStatus === "Placed" || order.orderStatus === "Confirmed" ? "Packed" : order.orderStatus,
        },
        $unset: { shiprocketLock: "" },
        $push: {
          statusHistory: {
            status: "Packed",
            note: `Sent to Shiprocket${result.awbNo ? ` · AWB ${result.awbNo}` : " (AWB pending)"}${result.courierName ? ` · ${result.courierName}` : ""}`,
            by: session.email ?? "admin",
            at: now,
          },
        },
      },
    );
    return ok({ ...result });
  } catch (e) {
    await M.updateOne({ orderNo }, { $unset: { shiprocketLock: "" } }); // allow retry
    throw e;
  }
});
