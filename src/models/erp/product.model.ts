import { Schema, type Connection } from "mongoose";
import { ERP_COLLECTIONS, PRODUCT_FIELDS as P } from "@/lib/erp-mapping";
import { defineFromMapping, getModel, readOnlyGuard, type AnyDoc } from "../_util";

/**
 * Product schema generated from the ERP mapping. `strict: false` keeps every
 * extra ERP field intact; only queried/indexed fields are declared.
 */
export const ProductSchema = new Schema(
  defineFromMapping({
    [P.sku]: { type: String, index: true },
    [P.barcode]: String,
    [P.name]: { type: String, index: true },
    [P.description]: String,
    [P.category]: { type: String, index: true },
    [P.subCategory]: { type: String, index: true },
    [P.fabric]: { type: String, index: true },
    [P.weave]: { type: String, index: true },
    [P.craft]: String,
    [P.occasion]: Schema.Types.Mixed, // string, csv string or array in ERP
    [P.color]: { type: String, index: true },
    [P.motif]: String,
    [P.border]: String,
    [P.blouseIncluded]: Schema.Types.Mixed,
    [P.length]: Number,
    [P.width]: Number,
    [P.weight]: Number,
    [P.careInstructions]: String,
    [P.mrp]: Number,
    [P.sellingPrice]: { type: Number, index: true },
    [P.discountPercent]: Number,
    [P.gstPercent]: Number,
    [P.hsnCode]: String,
    [P.stockQty]: { type: Number, index: true },
    [P.storeId]: Schema.Types.Mixed,
    [P.images]: Schema.Types.Mixed,
    [P.videoUrl]: String,
    [P.tags]: [String],
    [P.isNewArrival]: Schema.Types.Mixed,
    [P.isActive]: Schema.Types.Mixed,
    [P.createdAt]: Date,
    [P.updatedAt]: Date,
  }),
  { collection: ERP_COLLECTIONS.products, strict: false, versionKey: false, timestamps: false },
);
readOnlyGuard(ProductSchema);

export const ProductModel = (conn: Connection) => getModel<AnyDoc>(conn, "ErpProduct", ProductSchema);
