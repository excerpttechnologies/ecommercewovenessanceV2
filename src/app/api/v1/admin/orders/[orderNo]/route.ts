import type { NextRequest } from "next/server";
import { fail, handler, ok } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth";
import { getCustomers, getErpOrders } from "@/repositories";
import { getWebConnection } from "@/lib/db";
import { mapOrder } from "@/lib/erp-mapping";
import { OrderModel } from "@/models/erp/order.model";
import type { AnyDoc } from "@/models/_util";
import { getOrderWhatsAppNotification } from "@/lib/whatsapp/notifications";
import { currentStockForLabels, releaseOrderInventory, stockMovementsForOrder } from "@/lib/inventory/order-inventory";
import type { Customer, Order, OrderInventory } from "@/domain/types";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ orderNo: string }> };

/** Allowed next status for WEBSITE orders only. Packed/Returned close the fulfilment loop. */
const NEXT: Record<string, string[]> = {
  Placed: ["Confirmed", "Cancelled"],
  Confirmed: ["Packed", "Cancelled"],
  Packed: ["Shipped", "Cancelled"],
  Shipped: ["Out for delivery", "Delivered"],
  "Out for delivery": ["Delivered"],
  Delivered: ["Returned"],
};

async function loadCustomer(customerId?: string): Promise<Customer | null> {
  if (!customerId) return null;
  try {
    return await getCustomers().getById(customerId);
  } catch {
    return null;
  }
}

/** Order-level stock state plus live on-hand for every label the order touched. */
async function inventoryView(order: Order, doc: AnyDoc) {
  const state: OrderInventory = order.inventory ?? { status: "Pending" };
  const lines = state.lines ?? [];
  let stock = new Map<string, { onHand: number; committed: number; available: number }>();
  try {
    stock = await currentStockForLabels(lines.flatMap((line) => line.allocations ?? []));
  } catch (error) {
    // ERP unavailable: the recorded allocation is still shown, only "available now" is missing.
    console.warn("[admin/orders] live stock unavailable:", (error as Error).message);
  }
  return {
    status: state.status,
    trigger: state.trigger ?? null,
    attempts: state.attempts ?? 0,
    processedAt: state.processedAt ?? null,
    restoredAt: state.restoredAt ?? null,
    restoredBy: state.restoredBy ?? null,
    lastError: state.lastError ?? null,
    processing: Boolean(doc?.inventory?.processingKey),
    lines: lines.map((line) => ({
      ...line,
      allocations: (line.allocations ?? []).map((allocation) => ({
        ...allocation,
        current: stock.get(String(allocation.barcodeLabelId)) ?? null,
      })),
    })),
  };
}

export const GET = handler(async (_req: NextRequest, ctx: Ctx) => {
  await requireAdmin("orders:read");
  const { orderNo } = await ctx.params;

  // 1. Website database first: these are the orders this store creates and owns.
  const Orders = OrderModel(await getWebConnection());
  const doc = await Orders.findOne({ orderNo }).lean<AnyDoc>();
  if (doc) {
    const order = mapOrder(doc);
    const [customer, movements, stock] = await Promise.all([
      loadCustomer(order.customerId),
      stockMovementsForOrder(orderNo),
      inventoryView(order, doc),
    ]);
    return ok({
      ...order,
      awbNo: doc.awbNo ?? order.awbNo ?? null,
      courierName: doc.courierName ?? null,
      shiprocketShipmentId: doc.shiprocketShipmentId ?? null,
      customer,
      allowedTransitions: NEXT[order.orderStatus] ?? [],
      isWebsite: true,
      stock,
      stockMovements: movements,
      whatsappNotification: await getOrderWhatsAppNotification(orderNo),
    });
  }

  // 2. RetailERP sales orders are shown read-only. For this single lookup a failing ERP call is
  //    the only possible answer, so it is reported separately instead of looking like "not found".
  let erp: Order | null = null;
  let erpError: string | null = null;
  try {
    erp = await getErpOrders().getByOrderNo(orderNo);
  } catch (error) {
    erpError = (error as Error).message;
  }
  if (erp) {
    return ok({
      ...erp,
      customer: null,
      allowedTransitions: [],
      isWebsite: false,
      stock: null,
      stockMovements: [],
      whatsappNotification: null,
    });
  }
  if (erpError) return fail("ERP_UNAVAILABLE", `RetailERP orders could not be read: ${erpError}`, 503);
  return fail("NOT_FOUND", "Order not found", 404);
});

/** Website orders: change status (and keep stock in step). ERP orders stay read-only. */
export const PATCH = handler(async (req: NextRequest, ctx: Ctx) => {
  const session = await requireAdmin("orders:write");
  const { orderNo } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { status?: string };
  const status = String(body.status ?? "");

  const M = OrderModel(await getWebConnection());
  const doc = await M.findOne({ orderNo }).lean<AnyDoc>();
  if (!doc) return fail("READ_ONLY", "RetailERP orders are read-only here. Update this order in RetailERP.", 409);

  const current = mapOrder(doc).orderStatus;
  if (!(NEXT[current] ?? []).includes(status)) {
    return fail("BAD_TRANSITION", `Cannot change ${current} to ${status}.`, 409);
  }

  const now = new Date();
  const set: Record<string, unknown> = { orderStatus: status };
  if (status === "Delivered" && doc.paymentMode === "COD") set.paymentStatus = "Paid";

  await M.updateOne(
    { orderNo },
    {
      $set: set,
      $push: { statusHistory: { status, note: "Updated by admin", by: session.email ?? "admin", at: now } },
    },
  );

  // [INVENTORY] Cancelling or returning an order gives its stock back exactly once: a hold is
  // released, a deduction is restored. Packed/Shipped/Delivered never touch stock again.
  if (status === "Cancelled" || status === "Returned") {
    try {
      const released = await releaseOrderInventory(orderNo, {
        trigger: status === "Cancelled" ? "order_cancelled" : "order_returned",
        by: session.email ?? "admin",
      });
      if (!released.changed) console.info(`[inventory] ${orderNo}: ${released.message ?? "no stock change"}`);
    } catch (error) {
      const message = (error as Error).message;
      console.error(`[inventory] ${orderNo}: stock could not be released`, message);
      return ok({
        orderNo,
        orderStatus: status,
        inventory: "Failed",
        warning: `Order updated, but stock could not be released: ${message}. Retry from the order page.`,
      });
    }
  }

  // [SHIPROCKET] COD orders ship only after acceptance (Confirmed), never before.
  if (status === "Confirmed" && doc.paymentMode === "COD") {
    try {
      const { autoShipmentsEnabled, scheduleShipment } = await import("@/lib/shiprocket/auto");
      if (await autoShipmentsEnabled()) await scheduleShipment(orderNo, { trigger: "cod_acceptance" });
    } catch (error) {
      console.warn("[shiprocket] could not schedule COD shipment", error instanceof Error ? error.message : error);
    }
  }
  return ok({ orderNo, orderStatus: status });
});
