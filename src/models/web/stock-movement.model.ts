import { Schema, type Connection } from "mongoose";
import { getModel, type AnyDoc } from "../_util";

/**
 * Website-owned stock ledger. RetailERP (`barcodeLabel`, `items`) stays read-only —
 * `readOnlyGuard` and a secondaryPreferred connection make sure of it — so every
 * commitment the website makes against ERP physical stock is recorded here instead
 * of mutating ERP documents.
 *
 * One document per (order, line, barcode label, movement). `idempotencyKey` is unique,
 * which is what makes repeated processing of the same order safe.
 */

export const STOCK_MOVEMENT_TYPES = ["RESERVE", "DEDUCT", "RELEASE", "RESTORE"] as const;
export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number];

/** OUT = stock leaves the warehouse (reserve/deduct). IN = stock comes back (release/restore). */
export const STOCK_MOVEMENT_DIRECTIONS = ["OUT", "IN"] as const;
export type StockMovementDirection = (typeof STOCK_MOVEMENT_DIRECTIONS)[number];

/**
 * POSTED    — counted in the open commitment for its label.
 * SUPERSEDED — a reservation replaced by the matching DEDUCT movement (not counted).
 * RELEASED  — a reservation given back without a sale (not counted).
 */
export const STOCK_MOVEMENT_STATUSES = ["POSTED", "SUPERSEDED", "RELEASED"] as const;
export type StockMovementStatus = (typeof STOCK_MOVEMENT_STATUSES)[number];

const StockMovementSchema = new Schema(
  {
    idempotencyKey: { type: String, required: true, unique: true },
    movementType: { type: String, enum: [...STOCK_MOVEMENT_TYPES], required: true, index: true },
    direction: { type: String, enum: [...STOCK_MOVEMENT_DIRECTIONS], required: true },
    status: { type: String, enum: [...STOCK_MOVEMENT_STATUSES], default: "POSTED", index: true },
    source: { type: String, default: "web_order", index: true },
    orderNo: { type: String, required: true, index: true },
    orderId: Schema.Types.Mixed,
    orderItemIndex: Number,
    sku: { type: String, required: true, index: true },
    productId: Schema.Types.Mixed,
    barcode: { type: String, index: true },
    barcodeLabelId: { type: Schema.Types.Mixed, index: true },
    qty: { type: Number, required: true },
    uom: String,
    companyId: String,
    companyName: String,
    locationType: { type: String, default: "warehouse" },
    financialYear: String,
    onHandAfter: Number,
    referenceType: { type: String, default: "order" },
    referenceNo: String,
    note: String,
    createdBy: { type: String, default: "system" },
    createdAt: { type: Date, default: Date.now, index: true },
    supersededAt: Date,
    releasedAt: Date,
  },
  { collection: "stockMovements", versionKey: false, timestamps: false },
);

export const StockMovementModel = (c: Connection) => getModel<AnyDoc>(c, "StockMovement", StockMovementSchema);

/**
 * One atomic counter per physical barcode label. `committed` is raised with a
 * conditional `$inc` that only matches when the remaining quantity is available,
 * which is how concurrent orders are stopped from overselling the same units
 * (single-document atomic update — no transactions needed, works on standalone MongoDB).
 */
const InventoryCommitmentSchema = new Schema(
  {
    _id: { type: String },
    barcode: { type: String, index: true },
    barcodeLabelId: Schema.Types.Mixed,
    itemCode: String,
    companyId: String,
    committed: { type: Number, default: 0 },
    onHand: Number,
    createdAt: Date,
    updatedAt: Date,
  },
  { collection: "inventoryCommitments", versionKey: false, timestamps: false },
);

export const InventoryCommitmentModel = (c: Connection) =>
  getModel<AnyDoc>(c, "InventoryCommitment", InventoryCommitmentSchema);
