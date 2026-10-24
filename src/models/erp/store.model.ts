import { Schema, type Connection } from "mongoose";
import { ERP_COLLECTIONS, STORE_FIELDS as S } from "@/lib/erp-mapping";
import { defineFromMapping, getModel, readOnlyGuard, type AnyDoc } from "../_util";

export const StoreSchema = new Schema(
  defineFromMapping({
    [S.name]: String,
    [S.address]: Schema.Types.Mixed,
    [S.phone]: String,
    [S.city]: String,
  }),
  { collection: ERP_COLLECTIONS.stores, strict: false, versionKey: false },
);
readOnlyGuard(StoreSchema);

export const StoreModel = (conn: Connection) => getModel<AnyDoc>(conn, "ErpStore", StoreSchema);
