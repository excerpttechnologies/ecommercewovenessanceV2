import { Schema, type Connection } from "mongoose";
import { BARCODE_LABEL_FIELDS as B, ERP_BARCODE_COLLECTIONS } from "@/lib/erp-mapping";
import { defineFromMapping, getModel, readOnlyGuard, type AnyDoc } from "../_util";

/**
 * RetailERP barcodeLabel — only the paths the website filters on are declared
 * (`strict: false` keeps the rest). No indexes are declared and autoIndex/autoCreate
 * are off, so the website never issues a write against the ERP database.
 */
export const BarcodeLabelSchema = new Schema(
  defineFromMapping({
    [B.barcode]: String,
    [B.itemCode]: String,
    [B.itemId]: Schema.Types.Mixed,
    [B.oldBarcode]: String,
    [B.itemName]: String,
    [B.description]: String,
    [B.printDescription]: String,
    [B.designNo]: String,
    [B.status]: String,
    [B.groupId]: String,
    [B.businessId]: String,
    [B.supplierId]: String,
    [B.uomType]: String,
  }),
  {
    collection: ERP_BARCODE_COLLECTIONS.labels,
    strict: false,
    versionKey: false,
    timestamps: false,
    autoIndex: false,
    autoCreate: false,
  },
);
readOnlyGuard(BarcodeLabelSchema, true);

export const BarcodeLabelModel = (conn: Connection) => getModel<AnyDoc>(conn, "ErpBarcodeLabel", BarcodeLabelSchema);
