import type { NextRequest } from "next/server";
import { fail, handler, ok } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth";
import { getWebConnection } from "@/lib/db";
import { OrderModel } from "@/models/erp/order.model";
import { processOrderInventory, releaseOrderInventory } from "@/lib/inventory/order-inventory";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ orderNo: string }> };

/**
 * POST /api/v1/admin/orders/:orderNo/inventory
 * Body: { action: "process" | "restore", force?: boolean }
 *
 * Recovery path for website orders whose stock processing failed (or was left mid-flight by a
 * restart). Both operations are idempotent: the order's inventory state is the guard, and every
 * StockMovement carries a unique idempotency key, so retrying can never deduct twice.
 * `force` clears a stale processing lock — an explicit administrator decision.
 */
export const POST = handler(async (req: NextRequest, ctx: Ctx) => {
  const session = await requireAdmin("inventory:sync");
  const { orderNo } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { action?: string; force?: boolean };
  const action = String(body.action ?? "process");

  const Orders = OrderModel(await getWebConnection());
  if (!(await Orders.countDocuments({ orderNo }))) {
    return fail("NOT_FOUND", "Only website orders use website inventory; RetailERP orders are read-only.", 404);
  }

  const by = session.email ?? "admin";

  if (action === "restore") {
    try {
      const result = await releaseOrderInventory(orderNo, { trigger: "admin_manual", by, force: body.force === true });
      return ok(result);
    } catch (error) {
      console.error(`[inventory] ${orderNo}: manual restore failed`, error);
      return fail("INVENTORY_FAILED", (error as Error).message, 409);
    }
  }

  if (action !== "process") return fail("VALIDATION_ERROR", "action must be process or restore", 400);

  try {
    const result = await processOrderInventory(orderNo, {
      kind: "deduct",
      trigger: "admin_manual",
      by,
      force: body.force === true,
    });
    if (!result.changed) return ok(result, { warning: result.message });
    return ok(result);
  } catch (error) {
    console.error(`[inventory] ${orderNo}: manual processing failed`, error);
    return fail("INVENTORY_FAILED", (error as Error).message, 409);
  }
});
