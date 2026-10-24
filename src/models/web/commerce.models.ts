import { Schema, type Connection, type InferSchemaType } from "mongoose";
import { getModel } from "../_util";

/* ---------------- Cart (guest token or customer) ---------------- */
export const CartSchema = new Schema(
  {
    token: { type: String, required: true, unique: true }, // httpOnly cookie for guests
    customerId: { type: Schema.Types.Mixed, index: true },
    items: [
      {
        _id: false,
        sku: { type: String, required: true },
        qty: { type: Number, required: true, min: 1 },
        addedAt: { type: Date, default: Date.now },
      },
    ],
    couponCode: String,
    lastActivityAt: { type: Date, default: Date.now, index: true },
    abandonedNotifiedAt: Date,
  },
  { collection: "carts", timestamps: true },
);
export type CartDoc = InferSchemaType<typeof CartSchema>;
export const CartModel = (c: Connection) => getModel<CartDoc>(c, "Cart", CartSchema);

/* ---------------- Wishlist ---------------- */
export const WishlistSchema = new Schema(
  {
    token: { type: String, index: true },
    customerId: { type: Schema.Types.Mixed, index: true },
    skus: { type: [String], default: [] },
  },
  { collection: "wishlists", timestamps: true },
);
export type WishlistDoc = InferSchemaType<typeof WishlistSchema>;
export const WishlistModel = (c: Connection) => getModel<WishlistDoc>(c, "Wishlist", WishlistSchema);

/* ---------------- Coupons ---------------- */
export const CouponSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true },
    description: String,
    type: { type: String, enum: ["percent", "flat", "bogo"], required: true },
    value: { type: Number, required: true },
    minCart: { type: Number, default: 0 },
    maxDiscount: Number,
    usageLimit: Number,
    usedCount: { type: Number, default: 0 },
    perCustomerLimit: { type: Number, default: 1 },
    applicableCategories: { type: [String], default: [] },
    validFrom: Date,
    validTo: Date,
    isActive: { type: Boolean, default: true },
    isAdvertised: { type: Boolean, default: false },
  },
  { collection: "coupons", timestamps: true },
);
export type CouponDoc = InferSchemaType<typeof CouponSchema>;
export const CouponModel = (c: Connection) => getModel<CouponDoc>(c, "Coupon", CouponSchema);

/* ---------------- Reviews (moderated) ---------------- */
export const ReviewSchema = new Schema(
  {
    sku: { type: String, required: true, index: true },
    customerId: Schema.Types.Mixed,
    customerName: { type: String, required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    title: String,
    body: { type: String, required: true },
    images: { type: [String], default: [] },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
    isVerifiedPurchase: { type: Boolean, default: false },
  },
  { collection: "reviews", timestamps: true },
);
export type ReviewDoc = InferSchemaType<typeof ReviewSchema>;
export const ReviewModel = (c: Connection) => getModel<ReviewDoc>(c, "Review", ReviewSchema);

/* ---------------- Enquiries (contact form, WhatsApp, product enquiry) ---------------- */
export const EnquirySchema = new Schema(
  {
    type: { type: String, enum: ["contact", "support", "product", "whatsapp", "newsletter"], default: "contact" },
    name: String,
    mobile: String,
    email: String,
    message: String,
    sku: String,
    status: { type: String, enum: ["new", "in_progress", "closed"], default: "new", index: true },
  },
  { collection: "enquiries", timestamps: true },
);
export type EnquiryDoc = InferSchemaType<typeof EnquirySchema>;
export const EnquiryModel = (c: Connection) => {
  const existing = c.models.Enquiry;
  const typeEnum = existing?.schema.path("type") as { enumValues?: string[] } | undefined;
  if (existing && !typeEnum?.enumValues?.includes("support")) c.deleteModel("Enquiry");
  return getModel<EnquiryDoc>(c, "Enquiry", EnquirySchema);
};

/* ---------------- OTP codes for mobile login ---------------- */
export const OtpSchema = new Schema(
  {
    mobile: { type: String, required: true, index: true },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { collection: "otpCodes" },
);
export type OtpDoc = InferSchemaType<typeof OtpSchema>;
export const OtpModel = (c: Connection) => getModel<OtpDoc>(c, "Otp", OtpSchema);

/* ---------------- Customer email + password logins ---------------- */
// Kept apart from the ERP-shaped customer record so password hashes never travel with it,
// and so login emails can be unique (guest checkouts may share an email on customer records).
export const CustomerAccountSchema = new Schema(
  {
    customerId: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    failedAttempts: { type: Number, default: 0 },
    lockedUntil: Date,
    lastLoginAt: Date,
  },
  { collection: "customerAccounts", timestamps: true },
);
export type CustomerAccountDoc = InferSchemaType<typeof CustomerAccountSchema> & { _id: Schema.Types.ObjectId };
export const CustomerAccountModel = (c: Connection) => getModel<CustomerAccountDoc>(c, "CustomerAccount", CustomerAccountSchema);

/* ---------------- Atomic counters (order numbers etc.) ---------------- */
export const CounterSchema = new Schema(
  { _id: String, seq: { type: Number, default: 0 } },
  { collection: "counters", versionKey: false },
);
export const CounterModel = (c: Connection) => getModel<{ _id: string; seq: number }>(c, "Counter", CounterSchema);

/* ---------------- Admin users, roles, audit ---------------- */
export const RoleSchema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true }, // admin | manager | staff | custom
    permissions: { type: [String], default: [] }, // "products:read", "orders:write", "*"
    isSystem: { type: Boolean, default: false },
  },
  { collection: "roles", timestamps: true },
);
export type RoleDoc = InferSchemaType<typeof RoleSchema> & { _id: Schema.Types.ObjectId };
export const RoleModel = (c: Connection) => getModel<RoleDoc>(c, "Role", RoleSchema);

const StaffProfileSchema = new Schema(
  {
    designation: String,
    branch: String,
    mobile: String,
    joiningDate: Date,
    photoUrl: String,
    address: String,
    emergencyContact: String,
    notes: String,
  },
  { _id: false },
);

export const AdminUserSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    roleId: { type: Schema.Types.ObjectId, ref: "Role", required: true },
    isActive: { type: Boolean, default: true },
    profile: { type: StaffProfileSchema },
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: String,
    failedAttempts: { type: Number, default: 0 },
    lockedUntil: Date,
    lastLoginAt: Date,
    sessions: [{ _id: false, id: String, ip: String, userAgent: String, createdAt: Date, lastSeenAt: Date }],
  },
  { collection: "adminUsers", timestamps: true },
);
export type AdminUserDoc = InferSchemaType<typeof AdminUserSchema> & { _id: Schema.Types.ObjectId };
export const AdminUserModel = (c: Connection) => {
  const existing = c.models.AdminUser;
  if (existing && !existing.schema.path("profile")) c.deleteModel("AdminUser");
  return getModel<AdminUserDoc>(c, "AdminUser", AdminUserSchema);
};

export const AuditLogSchema = new Schema(
  {
    actorId: Schema.Types.Mixed,
    actorEmail: String,
    action: { type: String, required: true, index: true }, // product.update, order.status, settings.update…
    entity: { type: String, index: true },
    entityId: Schema.Types.Mixed,
    before: Schema.Types.Mixed,
    after: Schema.Types.Mixed,
    ip: String,
    userAgent: String,
  },
  { collection: "auditLogs", timestamps: { createdAt: true, updatedAt: false } },
);
export type AuditLogDoc = InferSchemaType<typeof AuditLogSchema>;
export const AuditLogModel = (c: Connection) => getModel<AuditLogDoc>(c, "AuditLog", AuditLogSchema);

/** Permission catalogue used by the RBAC matrix editor. */
export const PERMISSIONS = [
  "dashboard:read",
  "products:read",
  "products:write",
  "categories:write",
  "menu:write",
  "collections:write",
  "inventory:read",
  "inventory:sync",
  "orders:read",
  "orders:write",
  "orders:refund",
  "customers:read",
  "customers:write",
  "marketing:write",
  "content:write",
  "reviews:moderate",
  "reports:read",
  "settings:write",
  "users:write",
  "audit:read",
] as const;
export type Permission = (typeof PERMISSIONS)[number] | "*";
