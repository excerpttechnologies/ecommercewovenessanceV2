import { Schema, type Connection, type InferSchemaType } from "mongoose";
import { getModel } from "../_util";

const ClassificationOptionSchema = new Schema(
  {
    productType: { type: String, required: true },
    field: { type: String, required: true },
    value: { type: String, required: true },
  },
  { _id: false },
);

/* ---------------- Site settings (singleton, key = "default") ---------------- */
export const SiteSettingsSchema = new Schema(
  {
    key: { type: String, default: "default", unique: true },
    storeName: { type: String, default: "Woven Essence" },
    legalName: { type: String, default: "Temple Fabrics" },
    tagline: { type: String, default: "Tradition in Every Weave" },
    logo: {
      light: { type: String, default: "/mock/logo-placeholder.svg" },
      dark: { type: String, default: "/mock/logo-placeholder.svg" },
      favicon: { type: String, default: "/mock/favicon-placeholder.svg" },
    },
    theme: {
      ivory: { type: String, default: "#FBF7EF" },
      olive: { type: String, default: "#3E4A2A" },
      gold: { type: String, default: "#B8893B" },
      maroon: { type: String, default: "#7A1F2B" },
      ink: { type: String, default: "#2A2A26" },
      muted: { type: String, default: "#6E6A60" },
      line: { type: String, default: "#E6DFD0" },
      headingFont: { type: String, default: "Cormorant Garamond" },
      bodyFont: { type: String, default: "Inter" },
    },
    currency: { type: String, default: "INR" },
    supportedCurrencies: { type: [String], default: ["INR", "USD", "GBP", "AED"] },
    defaultStoreId: String,
    whatsappNumber: { type: String, default: "919999999999" },
    contact: {
      phone: String,
      email: String,
      address: String,
      hours: String,
    },
    social: { instagram: String, facebook: String, youtube: String },
    seo: {
      defaultTitle: { type: String, default: "Woven Essence by Temple Fabrics" },
      defaultDescription: String,
      ogImage: String,
    },
    commerce: {
      lowStockThreshold: { type: Number, default: 3 },
      freeShippingAbove: { type: Number, default: 4999 },
      shippingCharge: { type: Number, default: 149 },
      codEnabled: { type: Boolean, default: true },
      razorpayEnabled: { type: Boolean, default: true },
      serviceablePincodePrefixes: { type: [String], default: [] }, // [] = all India
    },
    trustBadges: [{ title: String, text: String, icon: String }],
    classificationOptions: { type: [ClassificationOptionSchema], default: [] },
    deletedClassificationOptions: { type: [ClassificationOptionSchema], default: [] },
    erp: {
      lastSyncAt: Date,
      lastSyncStatus: String,
    },
  },
  { collection: "siteSettings", timestamps: true },
);
export type SiteSettingsDoc = InferSchemaType<typeof SiteSettingsSchema>;
export const SiteSettingsModel = (c: Connection) => getModel<SiteSettingsDoc>(c, "SiteSettings", SiteSettingsSchema);

/* ---------------- Mega-menu items (flat list, parentId builds the tree) ---------------- */
export const MenuItemSchema = new Schema(
  {
    label: { type: String, required: true },
    /** top = header bar item; group = a column heading inside a mega menu; link = leaf */
    kind: { type: String, enum: ["top", "group", "link"], required: true },
    parentId: { type: Schema.Types.ObjectId, ref: "MenuItem", default: null, index: true },
    href: String,
    /** For attribute links: /collections/<categorySlug>?<filterKey>=<filterValue> */
    categorySlug: String,
    filterKey: String,
    filterValue: String,
    image: String,
    badge: String,
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { collection: "menuItems", timestamps: true },
);
export type MenuItemDoc = InferSchemaType<typeof MenuItemSchema> & { _id: Schema.Types.ObjectId };
export const MenuItemModel = (c: Connection) => getModel<MenuItemDoc>(c, "MenuItem", MenuItemSchema);

/* ---------------- Banners (hero slider, lifestyle, category strips) ---------------- */
export const BannerSchema = new Schema(
  {
    placement: { type: String, enum: ["hero", "lifestyle", "category", "promo"], required: true, index: true },
    title: String,
    subtitle: String,
    ctaLabel: String,
    ctaHref: String,
    image: { desktop: { type: String, required: true }, mobile: String, alt: String },
    align: { type: String, enum: ["left", "center", "right"], default: "left" },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    startsAt: Date,
    endsAt: Date,
  },
  { collection: "banners", timestamps: true },
);
export type BannerDoc = InferSchemaType<typeof BannerSchema> & { _id: Schema.Types.ObjectId };
export const BannerModel = (c: Connection) => getModel<BannerDoc>(c, "Banner", BannerSchema);

/* ---------------- Curated collections (manual or rule-based) ---------------- */
export const CollectionRuleSchema = new Schema(
  {
    /** UI key from ProductListParams / FilterKey: fabric, motif, occasion, category, priceMax, discountMin, tags… */
    key: { type: String, required: true },
    op: { type: String, enum: ["eq", "in", "contains", "gte", "lte"], default: "in" },
    value: Schema.Types.Mixed,
  },
  { _id: false },
);
export const CollectionSchema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: String,
    type: { type: String, enum: ["manual", "rule"], default: "rule" },
    skus: { type: [String], default: [] },
    rules: { type: [CollectionRuleSchema], default: [] },
    banner: { desktop: String, mobile: String },
    seoTitle: String,
    seoDescription: String,
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { collection: "collections", timestamps: true },
);
export type CollectionDoc = InferSchemaType<typeof CollectionSchema> & { _id: Schema.Types.ObjectId };
export const CollectionModel = (c: Connection) => getModel<CollectionDoc>(c, "Collection", CollectionSchema);

/* ---------------- CMS pages, FAQs, policies, blog ---------------- */
export const CmsPageSchema = new Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    type: { type: String, enum: ["page", "policy", "faq", "blog"], default: "page", index: true },
    body: { type: String, default: "" }, // markdown
    excerpt: String,
    coverImage: String,
    seoTitle: String,
    seoDescription: String,
    isPublished: { type: Boolean, default: true },
    publishedAt: Date,
    sortOrder: { type: Number, default: 0 },
  },
  { collection: "cmsPages", timestamps: true },
);
export type CmsPageDoc = InferSchemaType<typeof CmsPageSchema> & { _id: Schema.Types.ObjectId };
export const CmsPageModel = (c: Connection) => getModel<CmsPageDoc>(c, "CmsPage", CmsPageSchema);

/* ---------------- Testimonials ---------------- */
export const TestimonialSchema = new Schema(
  {
    name: { type: String, required: true },
    city: String,
    rating: { type: Number, min: 1, max: 5, default: 5 },
    text: { type: String, required: true },
    image: String,
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { collection: "testimonials", timestamps: true },
);
export type TestimonialDoc = InferSchemaType<typeof TestimonialSchema> & { _id: Schema.Types.ObjectId };
export const TestimonialModel = (c: Connection) => getModel<TestimonialDoc>(c, "Testimonial", TestimonialSchema);

/* ---------------- Homepage section builder ---------------- */
export const HomepageSectionSchema = new Schema(
  {
    key: { type: String, required: true, unique: true }, // hero, trust, categories, featuredCollections…
    title: String,
    subtitle: String,
    config: { type: Schema.Types.Mixed, default: {} }, // e.g. { collectionSlugs: [...], limit: 8 }
    sortOrder: { type: Number, default: 0 },
    isVisible: { type: Boolean, default: true },
  },
  { collection: "homepageSections", timestamps: true },
);
export type HomepageSectionDoc = InferSchemaType<typeof HomepageSectionSchema> & { _id: Schema.Types.ObjectId };
export const HomepageSectionModel = (c: Connection) =>
  getModel<HomepageSectionDoc>(c, "HomepageSection", HomepageSectionSchema);

/* ---------------- Product web-meta (website-owned overlay on ERP products) ---------------- */
export const ProductWebMetaSchema = new Schema(
  {
    sku: { type: String, required: true, unique: true },
    itemCode: String,
    slug: { type: String, required: true, unique: true },
    seoTitle: String,
    seoDescription: String,
    barcodePriceOverride: { type: Number, min: 0 },
    barcodeQtyOverride: { type: Number, min: 0 },
    barcodeStatusOverride: String,
    productName: String,
    itemName: String,
    barcodeName: String,
    productType: String,
    itemType: String,
    weaveDescription: String,
    fabricDescription: String,
    craftDescription: String,
    occasionDescription: String,
    colorDescription: String,
    groupNameOverride: String,
    supplierCodeOverride: String,
    supplierNameOverride: String,
    printDescriptionOverride: String,
    ecommOffPercent: { type: Number, min: 0, max: 100 },
    cardTitle: String,
    cardDescription: String,
    priceOverride: { type: Number, min: 0.01 },
    extraImages: { type: [String], default: [] },
    webTags: { type: [String], default: [] },
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    sortWeight: { type: Number, default: 0 },
    salesCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
  },
  { collection: "productWebMeta", timestamps: true },
);
export type ProductWebMetaDoc = InferSchemaType<typeof ProductWebMetaSchema>;
export const ProductWebMetaModel = (c: Connection) =>
  getModel<ProductWebMetaDoc>(c, "ProductWebMeta", ProductWebMetaSchema);
