import type { NextRequest } from "next/server";
import { fail, handler, ok } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth";
import { getWebConnection } from "@/lib/db";
import { mapOrder } from "@/lib/erp-mapping";
import {
  applyTrackingToOrder,
  assignAwb,
  cancelShiprocketOrder,
  createReturnShipment,
  createShipmentForOrder,
  fetchCourierOptions,
  generateLabel,
  generateManifest,
  getShippingContext,
  getTracking,
  requestPickup,
  shiprocketDate,
  type ShipmentResult,
} from "@/lib/shiprocket";
import { OrderModel } from "@/models/erp/order.model";
import type { AnyDoc } from "@/models/_util";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ orderNo: string }> };

const ACTIONS = ["create", "awb", "pickup", "label", "manifest", "tracking", "cancel", "return", "couriers"] as const;
type Action = (typeof ACTIONS)[number];

/**
 * POST /api/v1/admin/orders/:orderNo/ship
 * Body: { action?: "create" | "awb" | "pickup" | "label" | "manifest" |
 *                 "tracking" | "cancel" | "return" | "couriers", courierId?, refresh? }
 *
 * One endpoint for the whole admin fulfilment panel. Every action is safe to
 * repeat: shipment creation is claimed atomically, AWB/pickup are only applied
 * once, and labels/manifests are regenerated (never duplicated in Shiprocket).
 * Only website orders are touched; ERP data is never written.
 */
export const POST = handler(async (req: NextRequest, ctx: Ctx) => {
  const session = await requireAdmin("orders:write");
  const { orderNo } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    courierId?: number | string;
    refresh?: boolean;
  };
  const action = (ACTIONS as readonly string[]).includes(String(body.action)) ? (body.action as Action) : "create";

  const M = OrderModel(await getWebConnection());
  const doc = await M.findOne({ orderNo }).lean<AnyDoc>();
  if (!doc) return fail("NOT_FOUND", "Website order not found", 404);

  const order = mapOrder(doc);
  if (order.orderStatus === "Cancelled" && !["tracking", "return"].includes(action)) {
    return fail("NOT_SHIPPABLE", "This order is cancelled.", 409);
  }
  const shipping = order.shipping;
  const shiprocketOrderId = shipping.shiprocketOrderId ?? order.shiprocketOrderId;
  const shipmentId = shipping.shiprocketShipmentId ?? order.shiprocketShipmentId;
  const awbNo = shipping.awbNo ?? order.awbNo;
  const actor = session.email ?? "admin";
  const now = new Date();

  const persist = async (set: Record<string, unknown>, note?: string) =>
    M.updateOne(
      { orderNo },
      {
        $set: { ...set, "shipping.updatedAt": now.toISOString() },
        ...(note
          ? { $push: { statusHistory: { status: String(set.orderStatus ?? order.orderStatus), note, by: actor, at: now } } }
          : {}),
      },
    );

  if (action === "create") {
    const result: ShipmentResult = await createShipmentForOrder(orderNo, {
      trigger: "admin",
      courierId: body.courierId,
      throwOnError: true,
    });
    if (result.skipped) return fail("NOT_SHIPPABLE", `Shipment not created: ${result.reason ?? "not eligible"}.`, 409);
    return ok({ ...result });
  }

  // Everything else needs Shiprocket and an existing shipment.
  const context = await getShippingContext();
  if (!context.config) {
    return fail("SHIPROCKET_NOT_CONFIGURED", "Shiprocket is not configured on the server.", 503);
  }

  if (action === "couriers") {
    if (!order.shippingAddress.pincode) return fail("BAD_ADDRESS", "This order has no delivery pincode.", 422);
    const pkg = shipping.package ?? {
      weight: context.config.defaultWeightKg,
      length: context.config.defaultLengthCm,
      breadth: context.config.defaultBreadthCm,
      height: context.config.defaultHeightCm,
    };
    const couriers = await fetchCourierOptions(context, {
      deliveryPincode: order.shippingAddress.pincode,
      weightKg: pkg.weight,
      cod: order.paymentMode === "COD",
      declaredValue: order.netAmount,
    });
    return ok({ couriers, package: pkg });
  }

  if (action === "tracking") {
    if (!awbNo && !shipmentId) return fail("NO_SHIPMENT", "Create the shipment first.", 409);
    const tracking = await getTracking(
      context,
      { awb: awbNo ?? undefined, shipmentId: shipmentId ?? undefined },
      { refresh: body.refresh !== false },
    );
    await applyTrackingToOrder(orderNo, tracking);
    return ok({ tracking });
  }

  if (action === "return") {
    if (!order.items.length) return fail("BAD_ITEMS", "This order has no items to return.", 422);
    if (shipping.returnOrderId) return ok({ alreadyExisted: true, returnOrderId: shipping.returnOrderId, returnAwb: shipping.returnAwb });
    const pkg = shipping.package ?? {
      weight: context.config.defaultWeightKg,
      length: context.config.defaultLengthCm,
      breadth: context.config.defaultBreadthCm,
      height: context.config.defaultHeightCm,
    };
    const result = await createReturnShipment(context, {
      orderNo,
      createdAt: new Date(),
      paymentMode: order.paymentMode,
      netAmount: order.netAmount,
      subTotal: order.subTotal,
      items: order.items.map((item) => ({
        name: item.name,
        sku: item.sku,
        qty: item.qty,
        rate: item.rate,
        discount: item.discount,
        tax: item.gst,
      })),
      address: order.shippingAddress,
      package: pkg,
    });
    await persist(
      {
        "shipping.returnOrderId": result.returnOrderId,
        "shipping.returnShipmentId": result.returnShipmentId,
        "shipping.returnAwb": result.returnAwb,
        "shipping.returnStatus": "return_created",
        "shipping.returnRequestedAt": now.toISOString(),
      },
      `Return requested in Shiprocket${result.returnAwb ? ` · AWB ${result.returnAwb}` : ""}`,
    );
    return ok({ ...result });
  }

  if (!shipmentId) return fail("NO_SHIPMENT", "Create the Shiprocket shipment first.", 409);

  if (action === "awb") {
    if (awbNo) return ok({ alreadyExisted: true, awbNo, courierName: shipping.courierName });
    const assigned = await assignAwb(context, { shipmentId, courierId: body.courierId });
    let pickupRequested = false;
    let pickupScheduledDate: string | undefined;
    if (context.shipping.autoRequestPickup) {
      try {
        const pickup = await requestPickup(context, shipmentId);
        pickupRequested = true;
        pickupScheduledDate = pickup.pickupScheduledDate;
      } catch {
        // The AWB is the important part; pickup can be retried separately.
      }
    }
    await persist(
      {
        awbNo: assigned.awbNo,
        courierName: assigned.courierName,
        "shipping.awbNo": assigned.awbNo,
        "shipping.courierName": assigned.courierName,
        "shipping.courierId": assigned.courierId,
        "shipping.status": pickupRequested ? "pickup_scheduled" : "awb_assigned",
        "shipping.pickupRequested": pickupRequested,
        ...(pickupScheduledDate ? { "shipping.pickupScheduledDate": pickupScheduledDate } : {}),
      },
      `AWB assigned in Shiprocket${assigned.courierName ? ` · ${assigned.courierName}` : ""}`,
    );
    return ok({ awbNo: assigned.awbNo, courierName: assigned.courierName, pickupRequested });
  }

  if (action === "pickup") {
    if (!awbNo) return fail("NO_AWB", "Assign an AWB before scheduling pickup.", 409);
    const pickup = await requestPickup(context, shipmentId);
    await persist(
      {
        "shipping.pickupRequested": true,
        "shipping.pickupScheduledDate": pickup.pickupScheduledDate,
        "shipping.status": "pickup_scheduled",
      },
      "Pickup scheduled with Shiprocket",
    );
    return ok({ pickupScheduledDate: pickup.pickupScheduledDate, pickupToken: pickup.pickupToken });
  }

  if (action === "label") {
    const labelUrl = await generateLabel(context, shipmentId);
    await persist({ "shipping.labelUrl": labelUrl });
    return ok({ labelUrl });
  }

  if (action === "manifest") {
    const manifestUrl = await generateManifest(context, shipmentId);
    await persist({ "shipping.manifestUrl": manifestUrl });
    return ok({ manifestUrl });
  }

  if (action === "cancel") {
    if (!shiprocketOrderId) return fail("NO_SHIPMENT", "This order has no Shiprocket order to cancel.", 409);
    if (order.orderStatus === "Delivered") return fail("NOT_CANCELLABLE", "Delivered orders cannot be cancelled.", 409);
    await cancelShiprocketOrder(context, shiprocketOrderId);
    await M.updateOne(
      { orderNo },
      {
        $set: {
          orderStatus: "Cancelled",
          "shipping.status": "cancelled",
          "shipping.cancelledAt": now.toISOString(),
          "shipping.updatedAt": now.toISOString(),
        },
        $push: { statusHistory: { status: "Cancelled", note: "Shipment cancelled in Shiprocket", by: actor, at: now } },
      },
    );
    return ok({ cancelled: true, at: shiprocketDate(now) });
  }

  return fail("BAD_ACTION", `Unknown action: ${action}`, 400);
});
