/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomUUID } from "node:crypto";
import { Types, type Model } from "mongoose";
import { getErpConnection, getWebConnection } from "@/lib/db";
import { BARCODE_LABEL_FIELDS as B, ERP_BARCODE_COLLECTIONS, toNum, toStr } from "@/lib/erp-mapping";
import { OrderModel } from "@/models/erp/order.model";
import {
  InventoryCommitmentModel,
  StockMovementModel,
  type StockMovementDirection,
  type StockMovementType,
} from "@/models/web/stock-movement.model";
import type { AnyDoc } from "@/models/_util";
import type { InventoryProcessingStatus, OrderInventoryLine } from "@/domain/types";

/**
 * Order → inventory synchronisation.
 *
 * Physical stock lives in RetailERP:
 *   - `barcodeLabel.qtyNum` + `status: "IN_STOCK"`  → per label / batch units the storefront sells
 *   - `items.inventory.availableStock|currentStock` → the ERP's own item roll-up (Admin → Inventory)
 *
 * The ERP database is read-only for this app (see models/_util.ts `readOnlyGuard` and the
 * secondaryPreferred ERP connection), so a website sale never edits ERP documents. Instead it
 * records a commitment:
 *
 *   stockMovements           append-only ledger, one row per order line + label
 *   inventoryCommitments     one atomic counter per label (committed units)
 *
 * Effective availability = ERP units on hand − committed units. That number is what the cart and
 * checkout enforce, so the storefront reflects a sale while the ERP's own record is untouched
 * (and corrected later by the ERP's normal sales/GRC flow).
 *
 * Idempotency: `inventory.processingKey` on the order is the order-level processing identifier and
 * every movement carries a unique `idempotencyKey`, so a retried or concurrent call can never
 * deduct the same quantity twice.
 */

const round = (value: number) => Math.round(value * 1000) / 1000;

/** A typed failure so callers can tell "sold out" apart from "the ERP/database is unavailable". */
export class InventoryError extends Error {
  readonly code: string;
  constructor(message: string, code: "INSUFFICIENT_STOCK" | "INVENTORY_FAILED" = "INVENTORY_FAILED") {
    super(message);
    this.name = "InventoryError";
    this.code = code;
  }
}

export interface AllocatableLabel {
  id: string;
  barcode: string;
  itemCode?: string;
  name?: string;
  companyId?: string;
  uom?: string;
  unitsOnHand: number;
  committed: number;
}

/**
 * Spread `qty` across the eligible labels of one product. Unique pieces (qtyNum = 1) take one
 * unit each; batch labels (a fabric roll, qtyNum = metres) are drained as far as needed. Labels
 * with nothing left after existing commitments are skipped. Pure — this is the allocation policy.
 */
export function allocateAcrossLabels(
  labels: AllocatableLabel[],
  qty: number,
): { allocations: { label: AllocatableLabel; qty: number }[]; shortfall: number } {
  const requested = Number(qty);
  const allocations: { label: AllocatableLabel; qty: number }[] = [];
  if (!Number.isFinite(requested) || requested <= 0) return { allocations, shortfall: 0 };

  let left = requested;
  const pool = labels
    .map((label) => ({ label, available: Math.max(0, round(label.unitsOnHand - label.committed)) }))
    .filter((row) => row.available > 0)
    // Biggest free quantity first keeps the number of partial labels small and the order stable.
    .sort((a, b) => b.available - a.available || a.label.barcode.localeCompare(b.label.barcode));

  for (const row of pool) {
    if (left <= 0) break;
    const take = Math.min(left, row.available);
    allocations.push({ label: row.label, qty: round(take) });
    left = round(left - take);
  }
  return { allocations, shortfall: left > 0.0005 ? left : 0 };
}

/** Indian financial year (April–March), e.g. "2026-2027". */
export function financialYear(at: Date = new Date()): string {
  const start = at.getMonth() + 1 >= 4 ? at.getFullYear() : at.getFullYear() - 1;
  return `${start}-${start + 1}`;
}

export interface InventoryResult {
  orderNo: string;
  status: InventoryProcessingStatus;
  changed: boolean;
  lines: OrderInventoryLine[];
  message?: string;
}

const LABEL_PROJECTION = {
  [B.barcode]: 1,
  [B.itemCode]: 1,
  [B.itemName]: 1,
  [B.description]: 1,
  [B.printDescription]: 1,
  [B.qty]: 1,
  [B.qtyText]: 1,
  [B.uom]: 1,
  [B.uomType]: 1,
  [B.businessId]: 1,
  [B.status]: 1,
  [B.groupId]: 1,
};

type OrderLineDraft = { index: number; sku: string; name?: string; qty: number; productId?: string };

interface PlannedAllocation {
  labelId: string;
  barcode: string;
  itemCode?: string;
  companyId?: string;
  uom?: string;
  qty: number;
  onHand?: number;
  availableStockAfter?: number;
}

/** Units a single label holds. qtyNum is numeric and preferred; the string `qty` is the fallback. */
function labelUnits(label: AnyDoc): number {
  const primary = toNum(label[B.qty], NaN);
  if (Number.isFinite(primary)) return round(primary);
  return round(toNum(label[B.qtyText]));
}

function labelName(label: AnyDoc): string | undefined {
  return (
    toStr(label[B.itemName]) ?? toStr(label[B.description]) ?? toStr(label[B.printDescription]) ?? undefined
  );
}

function labelMatchesLine(label: AnyDoc, line: OrderLineDraft): boolean {
  if (line.productId && String(label._id) === line.productId) return true;
  const sku = line.sku.trim();
  if (!sku) return false;
  return toStr(label[B.barcode]) === sku || toStr(label[B.itemCode]) === sku;
}

/** Every IN_STOCK barcode label that could satisfy one of the order's SKUs. */
async function loadErpLabels(skus: string[]): Promise<AnyDoc[]> {
  const wanted = [...new Set(skus.map((value) => String(value ?? "").trim()).filter(Boolean))];
  if (!wanted.length) return [];
  const connection = await getErpConnection();
  if (!connection.db) throw new Error("RetailERP database connection is not ready");
  const objectIds = wanted.filter((value) => Types.ObjectId.isValid(value)).map((value) => new Types.ObjectId(value));
  const query: AnyDoc = {
    [B.status]: "IN_STOCK",
    $or: [
      { [B.barcode]: { $in: wanted } },
      { [B.itemCode]: { $in: wanted } },
      ...(objectIds.length ? [{ _id: { $in: objectIds } }] : []),
    ],
  };
  return connection.db
    .collection(ERP_BARCODE_COLLECTIONS.labels)
    .find(query, { projection: LABEL_PROJECTION })
    .toArray() as Promise<AnyDoc[]>;
}

async function commitmentMap(keys: string[]): Promise<Map<string, number>> {
  if (!keys.length) return new Map();
  const Commitments = InventoryCommitmentModel(await getWebConnection());
  const rows = await Commitments.find({ _id: { $in: keys } }, { committed: 1 }).lean<AnyDoc[]>();
  return new Map(rows.map((row) => [String(row._id), round(Number(row.committed) || 0)]));
}

/**
 * Atomically reserve `qty` units on one label. The conditional filter is the oversell guard:
 * it only matches when the label still has that many units free, so two concurrent orders can
 * never both take the last piece.
 */
async function claimUnits(Commitments: Model<AnyDoc>, label: AllocatableLabel, qty: number): Promise<boolean> {
  const key = label.id;
  try {
    // Two concurrent first-time claims can both try to create the counter; the loser just retries
    // the conditional update below instead of failing the order.
    await Commitments.updateOne(
      { _id: key },
      { $setOnInsert: { committed: 0, createdAt: new Date() } },
      { upsert: true },
    );
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error;
  }
  const updated = await Commitments.findOneAndUpdate(
    { _id: key, committed: { $lte: round(label.unitsOnHand - qty) } },
    {
      $inc: { committed: qty },
      $set: {
        barcode: label.barcode,
        barcodeLabelId: key,
        itemCode: label.itemCode,
        companyId: label.companyId,
        onHand: label.unitsOnHand,
        updatedAt: new Date(),
      },
    },
    { new: true },
  ).lean<AnyDoc>();
  return Boolean(updated);
}

async function releaseUnits(Commitments: Model<AnyDoc>, key: string, qty: number): Promise<boolean> {
  const result = await Commitments.updateOne(
    { _id: key, committed: { $gte: qty } },
    { $inc: { committed: -qty }, $set: { updatedAt: new Date() } },
  );
  if (!result.matchedCount) {
    console.warn(`[inventory] commitment ${key} held less than ${qty}; nothing released`);
    return false;
  }
  return true;
}

/** A retry must not be blocked by unique keys; a genuinely different write error still throws. */
async function insertMovements(Movements: Model<AnyDoc>, docs: AnyDoc[]): Promise<void> {
  if (!docs.length) return;
  try {
    await Movements.insertMany(docs, { ordered: false });
  } catch (error) {
    const e = error as { code?: number; writeErrors?: { code?: number }[] };
    const duplicateOnly =
      e.code === 11000 ||
      (Array.isArray(e.writeErrors) && e.writeErrors.length > 0 && e.writeErrors.every((w) => w.code === 11000));
    if (!duplicateOnly) throw error;
  }
}

function statusFilter(status: InventoryProcessingStatus): AnyDoc {
  if (status !== "Pending") return { "inventory.status": status };
  return {
    $or: [
      { "inventory.status": "Pending" },
      { "inventory.status": { $exists: false } },
      { "inventory.status": null },
      { inventory: { $exists: false } },
    ],
  };
}

function processingFree(force?: boolean): AnyDoc | null {
  if (force) return null;
  return { $or: [{ "inventory.processingKey": { $exists: false } }, { "inventory.processingKey": null }] };
}

function lineOf(items: AnyDoc[], index: number): OrderLineDraft {
  const item = items[index] ?? {};
  return {
    index,
    sku: String(item.sku ?? "").trim(),
    name: toStr(item.productName) ?? toStr(item.name),
    qty: toNum(item.qty),
    productId: item.productId == null ? undefined : String(item.productId),
  };
}

/**
 * RESERVE  — hold stock for an order that is waiting for payment (online checkout).
 * DEDUCT   — turn the hold into a sale (payment verified), or take stock straight away (COD).
 */
export async function processOrderInventory(
  orderNo: string,
  options: { kind: "reserve" | "deduct"; trigger?: string; by?: string; force?: boolean } = { kind: "deduct" },
): Promise<InventoryResult> {
  const kind = options.kind;
  const web = await getWebConnection();
  const Orders = OrderModel(web);
  const Movements = StockMovementModel(web);
  const Commitments = InventoryCommitmentModel(web);

  const before = await Orders.findOne({ orderNo }).lean<AnyDoc>();
  if (!before) return { orderNo, status: "Pending", changed: false, lines: [], message: "Order not found" };
  const previous = ((before.inventory?.status as InventoryProcessingStatus | undefined) ?? "Pending") as InventoryProcessingStatus;
  const allowed: InventoryProcessingStatus[] = kind === "reserve" ? ["Pending", "Failed"] : ["Pending", "Reserved", "Failed"];
  if (!allowed.includes(previous)) {
    return { orderNo, status: previous, changed: false, lines: [], message: `Stock already ${previous.toLowerCase()}` };
  }

  const processKey = `${orderNo}:${kind}:${randomUUID()}`;
  const and: AnyDoc[] = [statusFilter(previous)];
  const lockFree = processingFree(options.force);
  if (lockFree) and.push(lockFree);

  const claimed = await Orders.findOneAndUpdate(
    { orderNo, $and: and },
    {
      $set: {
        "inventory.processingKey": processKey,
        "inventory.processingAt": new Date(),
        "inventory.trigger": options.trigger ?? "system",
        "inventory.requestedBy": options.by ?? "system",
        "inventory.updatedAt": new Date(),
      },
    },
    { new: true },
  ).lean<AnyDoc>();
  if (!claimed) {
    return { orderNo, status: previous, changed: false, lines: [], message: "Stock processing is already running for this order" };
  }

  const items: AnyDoc[] = Array.isArray(claimed.items) ? claimed.items : [];
  const drafts = items.map((_, index) => lineOf(items, index));
  const existingLines = (claimed.inventory?.lines ?? []) as OrderInventoryLine[];

  // A DEDUCT that follows a RESERVE converts the SAME hold into the sale: the units are already
  // committed, so they must not be claimed a second time (that would double the commitment and
  // leave phantom stock held forever).
  const reuseHold = kind === "deduct" && previous === "Reserved" && existingLines.length > 0;

  const claimedUnits: { key: string; qty: number }[] = [];
  const writtenKeys: string[] = [];
  let supersededAt: Date | null = null;

  try {
    const plannedByLine: { line: OrderLineDraft; allocations: PlannedAllocation[] }[] = [];
    // Final committed figure per label, used for "available after" in the recorded allocations.
    let finalCommitted: Map<string, number> | null = null;

    if (reuseHold) {
      for (const line of existingLines) {
        plannedByLine.push({
          line: { index: line.index, sku: line.sku, name: line.name, qty: line.qty },
          allocations: (line.allocations ?? []).map((allocation) => ({
            labelId: String(allocation.barcodeLabelId),
            barcode: allocation.barcode,
            itemCode: allocation.itemCode,
            companyId: allocation.companyId,
            uom: allocation.uom,
            qty: allocation.qty,
            onHand: allocation.onHand,
            availableStockAfter: allocation.availableStockAfter,
          })),
        });
      }
    } else {
      const labels = await loadErpLabels(drafts.flatMap((line) => [line.sku, line.productId ?? ""]));
      const pending = await commitmentMap(labels.map((label) => String(label._id)));

      for (const line of drafts) {
        const pool: AllocatableLabel[] = labels
          .filter((label) => labelMatchesLine(label, line))
          .map((label) => ({
            id: String(label._id),
            barcode: toStr(label[B.barcode]) ?? "",
            itemCode: toStr(label[B.itemCode]),
            name: labelName(label),
            companyId: toStr(label[B.businessId]),
            uom: toStr(label[B.uom]) ?? toStr(label[B.uomType]),
            unitsOnHand: labelUnits(label),
            committed: pending.get(String(label._id)) ?? 0,
          }));

        const { allocations, shortfall } = allocateAcrossLabels(pool, line.qty);
        if (!allocations.length || shortfall > 0) {
          throw new InventoryError(
            `Not enough stock for ${line.sku || "(missing SKU)"}: ${line.qty} requested, ${round(line.qty - shortfall)} available`,
            "INSUFFICIENT_STOCK",
          );
        }

        const planned: PlannedAllocation[] = [];
        for (const allocation of allocations) {
          if (!(await claimUnits(Commitments, allocation.label, allocation.qty))) {
            throw new InventoryError(
              `Stock for ${allocation.label.barcode || allocation.label.id} changed while processing ${line.sku}`,
              "INSUFFICIENT_STOCK",
            );
          }
          claimedUnits.push({ key: allocation.label.id, qty: allocation.qty });
          pending.set(allocation.label.id, round((pending.get(allocation.label.id) ?? 0) + allocation.qty));
          planned.push({
            labelId: allocation.label.id,
            barcode: allocation.label.barcode,
            itemCode: allocation.label.itemCode,
            companyId: allocation.label.companyId,
            uom: allocation.label.uom,
            qty: allocation.qty,
            onHand: allocation.label.unitsOnHand,
          });
        }
        plannedByLine.push({ line, allocations: planned });
      }
      finalCommitted = pending;
    }

    const lines: OrderInventoryLine[] = plannedByLine.map(({ line, allocations }) => ({
      index: line.index,
      sku: line.sku,
      name: line.name,
      qty: line.qty,
      availableStockAfter: allocations.length
        ? Math.min(
            ...allocations.map((allocation) =>
              finalCommitted
                ? round((allocation.onHand ?? 0) - (finalCommitted.get(allocation.labelId) ?? 0))
                : (allocation.availableStockAfter ?? 0),
            ),
          )
        : null,
      allocations: allocations.map((allocation) => ({
        barcodeLabelId: allocation.labelId,
        barcode: allocation.barcode,
        itemCode: allocation.itemCode,
        companyId: allocation.companyId,
        uom: allocation.uom,
        qty: allocation.qty,
        onHand: allocation.onHand,
        availableStockAfter: finalCommitted
          ? round((allocation.onHand ?? 0) - (finalCommitted.get(allocation.labelId) ?? 0))
          : allocation.availableStockAfter,
      })),
    }));

    const now = new Date();
    const fy = financialYear(before.createdAt ? new Date(before.createdAt) : now);
    const movementType: StockMovementType = kind === "reserve" ? "RESERVE" : "DEDUCT";
    const direction: StockMovementDirection = "OUT";

    const movements = plannedByLine.flatMap(({ line, allocations }) =>
      allocations.map((allocation) => ({
        idempotencyKey: `${orderNo}:${line.index}:${allocation.labelId}:${movementType}`,
        movementType,
        direction,
        status: "POSTED",
        source: "web_order",
        orderNo,
        orderId: claimed._id,
        orderItemIndex: line.index,
        sku: line.sku,
        productId: line.productId,
        barcode: allocation.barcode,
        barcodeLabelId: allocation.labelId,
        qty: allocation.qty,
        uom: allocation.uom,
        companyId: allocation.companyId,
        financialYear: fy,
        onHandAfter: allocation.availableStockAfter,
        referenceType: "order",
        referenceNo: orderNo,
        createdBy: options.by ?? "system",
        createdAt: now,
      })),
    );

    if (kind === "deduct") {
      // The hold becomes the sale: keep the RESERVE row for the audit trail, stop counting it.
      const superseded = await Movements.updateMany(
        { orderNo, movementType: "RESERVE", status: "POSTED" },
        { $set: { status: "SUPERSEDED", supersededAt: now } },
      );
      supersededAt = superseded.modifiedCount ? now : null;
    }
    await insertMovements(Movements, movements);
    writtenKeys.push(...movements.map((movement) => movement.idempotencyKey));

    await Orders.updateOne(
      { orderNo, "inventory.processingKey": processKey },
      {
        $set: {
          "inventory.status": kind === "reserve" ? "Reserved" : "Deducted",
          "inventory.lines": lines,
          "inventory.processedAt": now,
          "inventory.attempts": Number(before.inventory?.attempts ?? 0) + 1,
          "inventory.updatedAt": now,
          ...(kind === "deduct" ? { "inventory.deductedAt": now } : {}),
        },
        $unset: { "inventory.processingKey": "", "inventory.lastError": "" },
      },
    );

    return { orderNo, status: kind === "reserve" ? "Reserved" : "Deducted", changed: true, lines };
  } catch (error) {
    // Full unwind: drop the ledger rows we wrote, un-supersede the hold, give the units back,
    // and leave a visible, retryable Failed state. Never a silent partial hold.
    if (writtenKeys.length) {
      await Movements.deleteMany({ idempotencyKey: { $in: writtenKeys } }).catch(() => undefined);
    }
    if (supersededAt) {
      await Movements.updateMany(
        { orderNo, movementType: "RESERVE", status: "SUPERSEDED", supersededAt },
        { $set: { status: "POSTED" }, $unset: { supersededAt: "" } },
      ).catch(() => undefined);
    }
    for (const unit of [...claimedUnits].reverse()) {
      await releaseUnits(Commitments, unit.key, unit.qty).catch(() => undefined);
    }
    const message = error instanceof Error ? error.message : "Inventory processing failed";
    await Orders.updateOne(
      { orderNo, "inventory.processingKey": processKey },
      {
        $set: { "inventory.status": "Failed", "inventory.lastError": message.slice(0, 500), "inventory.failedAt": new Date() },
        $inc: { "inventory.attempts": 1 },
        $unset: { "inventory.processingKey": "" },
      },
    ).catch(() => undefined);
    throw error instanceof InventoryError ? error : new InventoryError(message);
  }
}

/**
 * Give the held stock back. Reserved → the hold is released; Deducted → a RESTORE movement
 * brings the units back. Both are safe to call repeatedly: the order's status is the claim.
 */
export async function releaseOrderInventory(
  orderNo: string,
  options: { trigger?: string; by?: string; force?: boolean } = {},
): Promise<InventoryResult> {
  const web = await getWebConnection();
  const Orders = OrderModel(web);
  const Movements = StockMovementModel(web);
  const Commitments = InventoryCommitmentModel(web);

  const before = await Orders.findOne({ orderNo }).lean<AnyDoc>();
  if (!before) return { orderNo, status: "Pending", changed: false, lines: [], message: "Order not found" };
  const previous = ((before.inventory?.status as InventoryProcessingStatus | undefined) ?? "Pending") as InventoryProcessingStatus;
  if (previous !== "Reserved" && previous !== "Deducted") {
    return { orderNo, status: previous, changed: false, lines: [], message: "No stock is held for this order" };
  }

  const processKey = `${orderNo}:release:${randomUUID()}`;
  const and: AnyDoc[] = [{ "inventory.status": previous }];
  const lockFree = processingFree(options.force);
  if (lockFree) and.push(lockFree);

  const claimed = await Orders.findOneAndUpdate(
    { orderNo, $and: and },
    { $set: { "inventory.processingKey": processKey, "inventory.processingAt": new Date() } },
    { new: true },
  ).lean<AnyDoc>();
  if (!claimed) {
    return { orderNo, status: previous, changed: false, lines: [], message: "Stock release is already running for this order" };
  }

  const lines = (claimed.inventory?.lines ?? []) as OrderInventoryLine[];
  const now = new Date();
  const movementType: StockMovementType = previous === "Deducted" ? "RESTORE" : "RELEASE";
  const writtenKeys: string[] = [];
  const releasedUnits: { key: string; qty: number }[] = [];
  let reserveReleased = false;

  try {
    const movements = lines.flatMap((line) =>
      (line.allocations ?? []).map((allocation) => ({
        idempotencyKey: `${orderNo}:${line.index}:${String(allocation.barcodeLabelId)}:${movementType}`,
        movementType,
        direction: "IN" as StockMovementDirection,
        status: "POSTED",
        source: "web_order",
        orderNo,
        orderId: claimed._id,
        orderItemIndex: line.index,
        sku: line.sku,
        barcode: allocation.barcode,
        barcodeLabelId: String(allocation.barcodeLabelId),
        qty: allocation.qty,
        uom: allocation.uom,
        companyId: allocation.companyId,
        financialYear: financialYear(claimed.createdAt ? new Date(claimed.createdAt) : now),
        referenceType: "order",
        referenceNo: orderNo,
        note: options.trigger ?? "stock released",
        createdBy: options.by ?? "system",
        createdAt: now,
      })),
    );

    for (const line of lines) {
      for (const allocation of line.allocations ?? []) {
        const key = String(allocation.barcodeLabelId);
        if (await releaseUnits(Commitments, key, allocation.qty)) releasedUnits.push({ key, qty: allocation.qty });
      }
    }
    if (previous === "Reserved") {
      const result = await Movements.updateMany(
        { orderNo, movementType: "RESERVE", status: "POSTED" },
        { $set: { status: "RELEASED", releasedAt: now } },
      );
      reserveReleased = result.modifiedCount > 0;
    }
    await insertMovements(Movements, movements);
    writtenKeys.push(...movements.map((movement) => movement.idempotencyKey));

    await Orders.updateOne(
      { orderNo, "inventory.processingKey": processKey },
      {
        $set: {
          "inventory.status": "Restored",
          "inventory.restoredAt": now,
          "inventory.restoredBy": movementType,
          "inventory.trigger": options.trigger ?? "system",
          "inventory.updatedAt": now,
        },
        $unset: { "inventory.processingKey": "", "inventory.lastError": "" },
      },
    );

    return { orderNo, status: "Restored", changed: true, lines };
  } catch (error) {
    // Put everything back so the release can simply be retried.
    if (writtenKeys.length) {
      await Movements.deleteMany({ idempotencyKey: { $in: writtenKeys } }).catch(() => undefined);
    }
    if (reserveReleased) {
      await Movements.updateMany(
        { orderNo, movementType: "RESERVE", status: "RELEASED", releasedAt: now },
        { $set: { status: "POSTED" }, $unset: { releasedAt: "" } },
      ).catch(() => undefined);
    }
    const Commitments2 = InventoryCommitmentModel(web);
    for (const unit of releasedUnits) {
      await Commitments2.updateOne(
        { _id: unit.key },
        { $inc: { committed: unit.qty }, $set: { updatedAt: new Date() } },
      ).catch(() => undefined);
    }
    const message = error instanceof Error ? error.message : "Stock release failed";
    await Orders.updateOne(
      { orderNo, "inventory.processingKey": processKey },
      { $set: { "inventory.status": previous, "inventory.lastError": message.slice(0, 500) }, $unset: { "inventory.processingKey": "" } },
    ).catch(() => undefined);
    throw error instanceof InventoryError ? error : new InventoryError(message);
  }
}

/** Units the website is currently holding for this order's SKUs (used by cart/checkout). */
export async function committedStockByBarcode(barcodes: string[]): Promise<Map<string, number>> {
  const wanted = [...new Set(barcodes.map((value) => String(value ?? "").trim()).filter(Boolean))];
  if (!wanted.length) return new Map();
  const Commitments = InventoryCommitmentModel(await getWebConnection());
  const rows = await Commitments.aggregate<{ _id: string; committed: number }>([
    { $match: { barcode: { $in: wanted } } },
    { $group: { _id: "$barcode", committed: { $sum: "$committed" } } },
  ]);
  return new Map(rows.map((row) => [row._id, round(Number(row.committed) || 0)]));
}

/** Live ERP on-hand vs. website commitments for the labels an order touched. */
export async function currentStockForLabels(
  labels: { barcodeLabelId?: string; barcode?: string }[],
): Promise<Map<string, { onHand: number; committed: number; available: number }>> {
  const ids = [...new Set(labels.map((label) => String(label.barcodeLabelId ?? "")).filter(Boolean))];
  if (!ids.length) return new Map();
  const objectIds = ids.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));
  // ERP label _ids are ObjectIds; a few records may hold a non-ObjectId reference, so fall back to strings.
  const idFilter = { $in: (objectIds.length ? objectIds : ids) as unknown as Types.ObjectId[] };
  const connection = await getErpConnection();
  if (!connection.db) throw new Error("RetailERP database connection is not ready");
  const [docs, commitments] = await Promise.all([
    connection.db
      .collection(ERP_BARCODE_COLLECTIONS.labels)
      .find({ _id: idFilter }, { projection: LABEL_PROJECTION })
      .toArray() as Promise<AnyDoc[]>,
    commitmentMap(ids),
  ]);
  const out = new Map<string, { onHand: number; committed: number; available: number }>();
  for (const doc of docs) {
    const key = String(doc._id);
    const onHand = labelUnits(doc);
    const committed = commitments.get(key) ?? 0;
    out.set(key, { onHand, committed, available: round(Math.max(0, onHand - committed)) });
  }
  return out;
}

/** Full ledger for one order, oldest first — the audit trail shown in Admin → Orders. */
export async function stockMovementsForOrder(orderNo: string): Promise<AnyDoc[]> {
  const Movements = StockMovementModel(await getWebConnection());
  return Movements.find({ orderNo }).sort({ createdAt: 1 }).lean<AnyDoc[]>();
}
