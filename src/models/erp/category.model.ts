import { Schema, type Connection } from "mongoose";
import { CATEGORY_FIELDS as C, ERP_COLLECTIONS } from "@/lib/erp-mapping";
import { defineFromMapping, getModel, readOnlyGuard, type AnyDoc } from "../_util";

export const CategorySchema = new Schema(
  defineFromMapping({
    [C.name]: { type: String, index: true },
    [C.parentId]: Schema.Types.Mixed,
    [C.slug]: { type: String, index: true },
    [C.image]: String,
    [C.sortOrder]: Number,
    [C.isActive]: Schema.Types.Mixed,
  }),
  { collection: ERP_COLLECTIONS.categories, strict: false, versionKey: false },
);
readOnlyGuard(CategorySchema);

export const CategoryModel = (conn: Connection) => getModel<AnyDoc>(conn, "ErpCategory", CategorySchema);
