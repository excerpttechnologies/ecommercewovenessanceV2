import { Schema, type Connection } from "mongoose";
import { ADDRESS_FIELDS as A, CUSTOMER_FIELDS as C, ERP_COLLECTIONS } from "@/lib/erp-mapping";
import { defineFromMapping, getModel, type AnyDoc } from "../_util";

/**
 * Customers are WEBSITE-OWNED today (they live in WEB_DB_NAME) but keep RetailERP
 * field names so they can be pushed into the ERP later without a transform.
 * No readOnlyGuard: the storefront must be able to register customers.
 */
export const AddressSchema = new Schema(
  defineFromMapping({
    [A.name]: String,
    [A.phone]: String,
    [A.line1]: String,
    [A.line2]: String,
    [A.city]: String,
    [A.state]: String,
    [A.pincode]: { type: String, index: true },
    [A.country]: { type: String, default: "India" },
    [A.isDefault]: { type: Boolean, default: false },
  }),
  { _id: false, strict: false },
);

export const CustomerSchema = new Schema(
  defineFromMapping({
    [C.name]: String,
    [C.mobile]: { type: String, index: true, unique: true, sparse: true },
    [C.email]: { type: String, index: true, sparse: true },
    [C.addresses]: [AddressSchema],
    [C.gstNumber]: String,
    [C.loyaltyPoints]: { type: Number, default: 0 },
    [C.isActive]: { type: Schema.Types.Mixed, default: true },
    [C.createdAt]: { type: Date, default: Date.now },
  }),
  { collection: ERP_COLLECTIONS.customers, strict: false, versionKey: false },
);

export const CustomerModel = (conn: Connection) => getModel<AnyDoc>(conn, "Customer", CustomerSchema);
