/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * =============================================================================
 *  ERP MAPPING — THE ONLY FILE THAT KNOWS RetailERP FIELD NAMES
 * =============================================================================
 *
 *  Rules:
 *   1. UI components never read raw DB documents. They only see the domain
 *      types in src/domain/types.ts.
 *   2. Repositories build queries with the constants below and convert results
 *      with the map* functions below.
 *   3. To point the site at the real RetailERP database you edit:
 *        - ERP_COLLECTIONS   (collection names)
 *        - *_FIELDS          (field paths — dotted paths like "pricing.mrp" are fine)
 *        - PRODUCT_CATEGORY_REF (how products reference categories)
 *      …and the env vars ERP_MONGODB_URI / ERP_DB_NAME / DATA_SOURCE=erp.
 *
 *  Every name below is a PLACEHOLDER taken from the master prompt.
 *  Run `npm run erp:introspect -- "<uri>" grooretailerp1` and paste the
 *  output of erp-introspection.json to replace them.
 * =============================================================================
 */

import { getPath, setPath, slugify } from "./utils";
import type {
  Address,
  BarcodeProduct,
  Category,
  Customer,
  DataSource,
  FilterKey,
  Order,
  OrderItem,
  Product,
  ProductCard,
  SortKey,
  StockStatus,
  Store,
} from "@/domain/types";

/* ---------------------------------------------------------------------------
 * Collection names
 * ------------------------------------------------------------------------- */
export const ERP_COLLECTIONS = {
  products: "products", // TODO: verify against RetailERP
  categories: "categories", // TODO: verify against RetailERP
  customers: "customers", // TODO: verify against RetailERP
  orders: "orders", // verified: Admin Orders reads RetailERP online orders
  stores: "stores", // TODO: verify against RetailERP
} as const;

/* ---------------------------------------------------------------------------
 * Field paths — LEFT side = UI key (never changes), RIGHT side = ERP path
 * ------------------------------------------------------------------------- */
export const PRODUCT_FIELDS = {
  id: "_id", // TODO: verify against RetailERP
  sku: "sku", // TODO: verify against RetailERP
  barcode: "barcode", // TODO: verify against RetailERP
  name: "productName", // TODO: verify against RetailERP
  description: "description", // TODO: verify against RetailERP
  category: "category", // TODO: verify against RetailERP
  subCategory: "subCategory", // TODO: verify against RetailERP
  fabric: "fabric", // TODO: verify against RetailERP
  weave: "weave", // TODO: verify against RetailERP
  craft: "craft", // TODO: verify against RetailERP
  occasion: "occasion", // TODO: verify against RetailERP (string, csv string or array)
  color: "color", // TODO: verify against RetailERP
  motif: "pattern", // TODO: verify against RetailERP (spec says "pattern/motif")
  border: "border", // TODO: verify against RetailERP
  blouseIncluded: "blouseIncluded", // TODO: verify against RetailERP
  length: "length", // TODO: verify against RetailERP
  width: "width", // TODO: verify against RetailERP
  weight: "weight", // TODO: verify against RetailERP
  careInstructions: "careInstructions", // TODO: verify against RetailERP
  mrp: "mrp", // TODO: verify against RetailERP
  sellingPrice: "sellingPrice", // TODO: verify against RetailERP
  discountPercent: "discountPercent", // TODO: verify against RetailERP
  gstPercent: "gstPercent", // TODO: verify against RetailERP
  hsnCode: "hsnCode", // TODO: verify against RetailERP
  stockQty: "stockQty", // TODO: verify against RetailERP
  storeId: "storeId", // TODO: verify against RetailERP
  images: "images", // TODO: verify against RetailERP (string[] or {url}[])
  videoUrl: "videoUrl", // TODO: verify against RetailERP
  tags: "tags", // TODO: verify against RetailERP
  isNewArrival: "isNewArrival", // TODO: verify against RetailERP
  isActive: "isActive", // TODO: verify against RetailERP (bool, 0/1 or "Y"/"N" all handled)
  createdAt: "createdAt", // TODO: verify against RetailERP
  updatedAt: "updatedAt", // TODO: verify against RetailERP
} as const;
export type ProductFieldKey = keyof typeof PRODUCT_FIELDS;

export const CATEGORY_FIELDS = {
  id: "_id", // TODO: verify against RetailERP
  name: "categoryName", // TODO: verify against RetailERP
  parentId: "parentId", // TODO: verify against RetailERP
  slug: "slug", // TODO: verify against RetailERP (derived from name if absent)
  image: "image", // TODO: verify against RetailERP
  sortOrder: "sortOrder", // TODO: verify against RetailERP
  isActive: "isActive", // TODO: verify against RetailERP
} as const;
export type CategoryFieldKey = keyof typeof CATEGORY_FIELDS;

export const CUSTOMER_FIELDS = {
  id: "_id", // TODO: verify against RetailERP
  name: "customerName", // TODO: verify against RetailERP
  mobile: "mobile", // TODO: verify against RetailERP
  email: "email", // TODO: verify against RetailERP
  addresses: "addresses", // TODO: verify against RetailERP
  gstNumber: "gstNumber", // TODO: verify against RetailERP
  loyaltyPoints: "loyaltyPoints", // TODO: verify against RetailERP
  isActive: "isActive", // TODO: verify against RetailERP
  createdAt: "createdAt", // TODO: verify against RetailERP
} as const;
export type CustomerFieldKey = keyof typeof CUSTOMER_FIELDS;

export const ADDRESS_FIELDS = {
  name: "name", // TODO: verify against RetailERP
  phone: "phone", // TODO: verify against RetailERP
  line1: "line1", // TODO: verify against RetailERP
  line2: "line2", // TODO: verify against RetailERP
  city: "city", // TODO: verify against RetailERP
  state: "state", // TODO: verify against RetailERP
  pincode: "pincode", // TODO: verify against RetailERP
  country: "country", // TODO: verify against RetailERP
  isDefault: "isDefault", // TODO: verify against RetailERP
} as const;
export type AddressFieldKey = keyof typeof ADDRESS_FIELDS;

export const ORDER_FIELDS = {
  id: "_id", // TODO: verify against RetailERP
  orderNo: "orderNo", // TODO: verify against RetailERP
  customerId: "customerId", // TODO: verify against RetailERP
  items: "items", // TODO: verify against RetailERP
  subTotal: "subTotal", // TODO: verify against RetailERP
  discountTotal: "discountTotal", // TODO: verify against RetailERP
  gstTotal: "gstTotal", // TODO: verify against RetailERP
  shippingCharge: "shippingCharge", // TODO: verify against RetailERP
  netAmount: "netAmount", // TODO: verify against RetailERP
  paymentMode: "paymentMode", // TODO: verify against RetailERP
  paymentStatus: "paymentStatus", // TODO: verify against RetailERP
  orderStatus: "orderStatus", // TODO: verify against RetailERP
  shippingAddress: "shippingAddress", // TODO: verify against RetailERP
  awbNo: "awbNo", // TODO: verify against RetailERP
  storeId: "storeId", // TODO: verify against RetailERP
  couponCode: "couponCode", // website-only field (not in ERP)
  createdAt: "createdAt", // TODO: verify against RetailERP
} as const;
export type OrderFieldKey = keyof typeof ORDER_FIELDS;

export const ORDER_ITEM_FIELDS = {
  productId: "productId", // TODO: verify against RetailERP
  sku: "sku", // TODO: verify against RetailERP
  name: "productName", // website convenience copy
  image: "image", // website convenience copy
  qty: "qty", // TODO: verify against RetailERP
  rate: "rate", // TODO: verify against RetailERP
  discount: "discount", // TODO: verify against RetailERP
  gst: "gst", // TODO: verify against RetailERP
  amount: "amount", // TODO: verify against RetailERP
} as const;
export type OrderItemFieldKey = keyof typeof ORDER_ITEM_FIELDS;

export const STORE_FIELDS = {
  id: "_id", // TODO: verify against RetailERP
  name: "storeName", // TODO: verify against RetailERP
  address: "address", // TODO: verify against RetailERP
  phone: "phone", // TODO: verify against RetailERP
  city: "city", // TODO: verify against RetailERP
} as const;
export type StoreFieldKey = keyof typeof STORE_FIELDS;

/* ---------------------------------------------------------------------------
 * barcodeLabel — VERIFIED against grooretailerp1 (27,487 documents, 2026-10-01).
 * Unlike the placeholders above, every name here was read from real documents.
 * Coverage, relationships and image rules: docs/barcodeLabel-product-mapping.md
 * Kept out of ERP_COLLECTIONS / ALL_FIELD_MAPS so the public /erp/status
 * endpoint does not start describing it.
 * ------------------------------------------------------------------------- */
export const ERP_BARCODE_COLLECTIONS = {
  labels: "barcodeLabel",
  productGroups: "productgroup", // barcodeLabel.groupId    -> productgroup._id (hex string)
  businesses: "business", // barcodeLabel.businessId -> business._id (hex string)
  suppliers: "supplier",
  ecommerceProducts: "ecommerceproduct",
  productClassificationOptions: "productclassificationoption",
} as const;

export const BARCODE_LABEL_FIELDS = {
  id: "_id",
  barcode: "barcodeNo", // 100%; 4–10 printable ASCII chars; NOT unique (234 barcodes on several labels, even within one business)
  itemCode: "itemCode", // 100%; == barcodeNo on 77% of labels, else a shared item code ("FX-CRB")
  itemId: "itemId", // ERP Item reference used by ecommerceproduct together with businessId
  oldBarcode: "oldBarcode", // 87%; supplier / legacy barcode
  itemName: "itemName", // 23%; denormalised copy of item.name (itemId -> item), so item is not joined
  description: "supplierDescription", // 100%
  printDescription: "printDescription", // 99%; usually == supplierDescription
  designNo: "designNo",
  qty: "qtyNum", // 100%, numeric — preferred
  qtyText: "qty", // string; disagrees with qtyNum on 1,146 docs, used only when qtyNum is missing
  uom: "uom", // 24%; free text ("PCS", "Pc(s)", "Mtr")
  uomType: "uomType", // 100%; "PC" | "MTR"
  retailPrice: "retailPrice", // 100%; string or number (RetailERP backend uses ERP_PRICE_FIELD=retailPrice)
  offerPrice: "offerPrice", // 23%
  hsnCode: "hsn",
  gstPercent: "gst",
  status: "status", // IN_STOCK | SOLD | VOID | IN_TRANSIT | HISTORY
  batchType: "batchType", // unique | batch
  grcNo: "grcNo",
  groupId: "groupId",
  businessId: "businessId",
  supplierId: "supplierId",
  imageUrl: "imageUrl", // 86%; see src/lib/erp-images.ts
  filePath: "filePath", // rare upload path; second image candidate
  createdAt: "createdAt",
  updatedAt: "updatedAt",
} as const;
export type BarcodeLabelFieldKey = keyof typeof BARCODE_LABEL_FIELDS;

export const PRODUCT_GROUP_FIELDS = { name: "name", businessId: "businessId" } as const; // businessId is an ObjectId here
export const BUSINESS_FIELDS = { name: "name" } as const;
export const SUPPLIER_FIELDS = { code: "accountNo", name: "businessName", alternateName: "shortName" } as const;

/** Fields the admin Products search box matches (case-insensitive substring). */
export const BARCODE_SEARCH_FIELDS = [
  BARCODE_LABEL_FIELDS.barcode,
  BARCODE_LABEL_FIELDS.itemCode,
  BARCODE_LABEL_FIELDS.oldBarcode,
  BARCODE_LABEL_FIELDS.itemName,
  BARCODE_LABEL_FIELDS.description,
  BARCODE_LABEL_FIELDS.printDescription,
  BARCODE_LABEL_FIELDS.designNo,
] as const;

/** Names joined in by the repository's $lookup stages. */
export const BARCODE_JOINED = {
  groupName: "_groupName",
  businessName: "_businessName",
  supplierCode: "_supplierCode",
  supplierName: "_supplierName",
} as const;

/**
 * barcodeLabel document (+ joined group/business names) -> domain object.
 * Image fields are resolved separately (they need network checks), see erp-images.ts.
 * Throws only when the record has no barcode at all.
 */
export function mapBarcodeLabel(raw: any): BarcodeProduct {
  const g = (k: BarcodeLabelFieldKey) => getPath(raw, BARCODE_LABEL_FIELDS[k]);
  const optNum = (v: unknown) => (v == null || v === "" ? undefined : Number.isFinite(toNum(v, NaN)) ? toNum(v) : undefined);
  const same = (a?: string, b?: string) => !!a && !!b && a.toLowerCase() === b.toLowerCase();

  const barcode = toStr(g("barcode"));
  if (!barcode) throw new Error(`barcodeLabel ${toId(g("id")) || "(no _id)"} has no ${BARCODE_LABEL_FIELDS.barcode}`);
  const itemCode = toStr(g("itemCode"));
  const oldBarcode = toStr(g("oldBarcode"));
  const description = toStr(g("description"));
  const printDescription = toStr(g("printDescription"));
  const itemName = toStr(g("itemName"));
  const name = description ?? printDescription ?? itemName ?? itemCode ?? barcode;
  const offerPrice = optNum(g("offerPrice"));
  const qty = optNum(g("qty")) ?? optNum(g("qtyText"));

  return {
    id: toId(g("id")),
    barcode,
    itemId: toStr(g("itemId")),
    itemCode,
    oldBarcode: oldBarcode && !same(oldBarcode, barcode) ? oldBarcode : undefined,
    name,
    itemName: itemName && !same(itemName, name) ? itemName : undefined,
    printDescription: printDescription || undefined,
    group: toStr(raw?.[BARCODE_JOINED.groupName]),
    groupId: toStr(g("groupId")),
    business: toStr(raw?.[BARCODE_JOINED.businessName]),
    businessId: toStr(g("businessId")),
    supplierCode: toStr(raw?.[BARCODE_JOINED.supplierCode]),
    supplierName: toStr(raw?.[BARCODE_JOINED.supplierName]),
    qty: qty == null ? undefined : Math.round(qty * 1000) / 1000, // ERP stores float noise like 0.04999999999999999
    uom: toStr(g("uom")) ?? toStr(g("uomType")),
    uomType: toStr(g("uomType")),
    price: optNum(g("retailPrice")),
    offerPrice: offerPrice && offerPrice > 0 ? offerPrice : undefined,
    hsnCode: toStr(g("hsnCode")),
    gstPercent: optNum(g("gstPercent")),
    status: toStr(g("status")),
    batchType: toStr(g("batchType")),
    grcNo: toStr(g("grcNo")),
    slug: productSlug(name, barcode),
    createdAt: toISO(g("createdAt")),
    updatedAt: toISO(g("updatedAt")),
  };
}

export function barcodeProductToProduct(item: BarcodeProduct): Product {
  const mrp = item.price ?? item.offerPrice ?? 0;
  const sellingPrice = item.offerPrice != null && item.offerPrice > 0 && item.offerPrice < mrp ? item.offerPrice : mrp;
  const qty = item.qty ?? (item.status === "IN_STOCK" ? 1 : 0);
  const category = item.business ?? item.group ?? "";
  return {
    id: item.id,
    sku: item.barcode,
    barcode: item.barcode,
    slug: item.slug,
    name: item.itemName || item.name,
    description: item.printDescription || item.name,
    category,
    subCategory: item.group,
    occasion: [],
    blouseIncluded: false,
    dimensions: { weight: 0 },
    pricing: {
      mrp,
      sellingPrice,
      discountPercent: mrp > sellingPrice ? Math.round(((mrp - sellingPrice) / mrp) * 100) : 0,
      gstPercent: item.gstPercent ?? 5,
      hsnCode: item.hsnCode,
      currency: "INR",
    },
    stock: {
      qty,
      status: qty <= 0 ? "out_of_stock" : qty <= 3 ? "low_stock" : "in_stock",
    },
    images: item.image ? [item.image] : [],
    tags: [],
    isNewArrival: false,
    isActive: item.status === "IN_STOCK" && qty > 0,
    source: "erp",
    isBarcodeLabel: true,
  };
}

/* ---------------------------------------------------------------------------
 * Behavioural switches
 * ------------------------------------------------------------------------- */

/** How `products.category` / `products.subCategory` refer to a category document. */
export const PRODUCT_CATEGORY_REF: "name" | "id" | "slug" = "name"; // TODO: verify against RetailERP

/** Stock at or below this is shown as "Low stock" (admin can override via siteSettings). */
export const DEFAULT_LOW_STOCK_THRESHOLD = 3;

/** Values RetailERP may use to mark records inactive. Missing field = active. */
const INACTIVE_VALUES = [false, 0, "0", "N", "n", "no", "false", "inactive", "Inactive"];
export const ACTIVE_PRODUCT_QUERY = { [PRODUCT_FIELDS.isActive]: { $nin: INACTIVE_VALUES } };
export const ACTIVE_CATEGORY_QUERY = { [CATEGORY_FIELDS.isActive]: { $nin: INACTIVE_VALUES } };
export const TRUTHY_VALUES = [true, 1, "1", "Y", "y", "yes", "true", "TRUE"];

/** UI filter key -> ERP product field (used for $in filters and facets). */
export const PRODUCT_FILTER_FIELDS: Record<FilterKey, string> = {
  fabric: PRODUCT_FIELDS.fabric,
  weave: PRODUCT_FIELDS.weave,
  craft: PRODUCT_FIELDS.craft,
  occasion: PRODUCT_FIELDS.occasion,
  color: PRODUCT_FIELDS.color,
  motif: PRODUCT_FIELDS.motif,
  border: PRODUCT_FIELDS.border,
};

/** UI sort key -> Mongo sort spec on ERP fields. */
export function productSort(sort: SortKey): Record<string, 1 | -1> {
  switch (sort) {
    case "price_asc":
      return { [PRODUCT_FIELDS.sellingPrice]: 1, _id: 1 };
    case "price_desc":
      return { [PRODUCT_FIELDS.sellingPrice]: -1, _id: 1 };
    case "newest":
      return { [PRODUCT_FIELDS.createdAt]: -1, _id: -1 };
    case "best_selling":
      // TODO: ERP has no sales counter on products. Phase 2 sorts by productWebMeta.salesCount
      // (aggregated nightly from web orders). Until then: discount + recency as a proxy.
      return { [PRODUCT_FIELDS.discountPercent]: -1, [PRODUCT_FIELDS.createdAt]: -1 };
    case "featured":
    default:
      return { [PRODUCT_FIELDS.isNewArrival]: -1, [PRODUCT_FIELDS.createdAt]: -1, _id: -1 };
  }
}

/* ---------------------------------------------------------------------------
 * Value normalisers — ERP data is rarely clean; these make it predictable.
 * ------------------------------------------------------------------------- */
export const toStr = (v: unknown): string | undefined => {
  if (v == null) return undefined;
  const s = String(v).trim();
  return s.length ? s : undefined;
};
export const toNum = (v: unknown, fallback = 0): number => {
  if (typeof v === "number") return Number.isFinite(v) ? v : fallback;
  if (v == null) return fallback;
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : fallback;
};
export const toBool = (v: unknown, fallback = false): boolean => {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (["y", "yes", "true", "1", "active"].includes(s)) return true;
    if (["n", "no", "false", "0", "inactive", ""].includes(s)) return false;
  }
  return fallback;
};
export const toArr = (v: unknown): string[] => {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  if (typeof v === "string")
    return v
      .split(/[,|;]/)
      .map((s) => s.trim())
      .filter(Boolean);
  return [];
};
export const toId = (v: unknown): string => {
  if (v == null) return "";
  if (typeof v === "object" && v !== null && typeof (v as any).toHexString === "function")
    return (v as any).toHexString();
  return String(v);
};
export const toISO = (v: unknown): string | undefined => {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "string" && v) return v;
  if (typeof v === "number") return new Date(v).toISOString();
  return undefined;
};
/** Images may be ["url"], [{url}], [{path}], [{src}] or a csv string. */
export const toImages = (v: unknown): string[] => {
  if (Array.isArray(v)) {
    return v
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          const o = item as Record<string, unknown>;
          return toStr(o.url ?? o.path ?? o.src ?? o.imageUrl ?? o.image);
        }
        return undefined;
      })
      .filter((s): s is string => Boolean(s));
  }
  return toArr(v);
};

export function stockStatus(qty: number, lowStockThreshold = DEFAULT_LOW_STOCK_THRESHOLD): StockStatus {
  if (qty <= 0) return "out_of_stock";
  if (qty <= lowStockThreshold) return "low_stock";
  return "in_stock";
}

/* ---------------------------------------------------------------------------
 * Slugs — ERP has none, so we derive a stable one from name + sku.
 * productWebMeta can override it (admin-editable SEO slug).
 * ------------------------------------------------------------------------- */
export function productSlug(name: string, sku: string): string {
  return `${slugify(name)}-${slugify(sku)}`.replace(/^-+/, "");
}

/** Candidate SKUs encoded at the tail of a slug (SKUs may contain hyphens). */
export function skuCandidatesFromSlug(slug: string, maxTokens = 5): string[] {
  const tokens = slug.split("-").filter(Boolean);
  const out: string[] = [];
  for (let n = 1; n <= Math.min(maxTokens, tokens.length); n++) out.push(tokens.slice(-n).join("-"));
  return out;
}

/* ---------------------------------------------------------------------------
 * ERP document -> domain object
 * ------------------------------------------------------------------------- */
export interface MapOptions {
  source?: DataSource;
  lowStockThreshold?: number;
}

export function mapProduct(raw: any, opts: MapOptions = {}): Product {
  const g = (k: ProductFieldKey) => getPath(raw, PRODUCT_FIELDS[k]);
  const id = toId(g("id"));
  const sku = toStr(g("sku")) ?? id;
  const name = toStr(g("name")) ?? "Untitled product";
  const mrp = toNum(g("mrp"));
  const sellingPrice = toNum(g("sellingPrice"), mrp);
  const explicitDiscount = g("discountPercent");
  const discountPercent =
    explicitDiscount != null && explicitDiscount !== ""
      ? toNum(explicitDiscount)
      : mrp > 0 && sellingPrice < mrp
        ? Math.round(((mrp - sellingPrice) / mrp) * 100)
        : 0;
  const qty = toNum(g("stockQty"));

  return {
    id,
    sku,
    barcode: toStr(g("barcode")),
    slug: productSlug(name, sku),
    name,
    description: toStr(g("description")) ?? "",
    category: toStr(g("category")) ?? "",
    subCategory: toStr(g("subCategory")),
    fabric: toStr(g("fabric")),
    weave: toStr(g("weave")),
    craft: toStr(g("craft")),
    occasion: toArr(g("occasion")),
    color: toStr(g("color")),
    motif: toStr(g("motif")),
    border: toStr(g("border")),
    blouseIncluded: toBool(g("blouseIncluded")),
    dimensions: {
      length: g("length") != null ? toNum(g("length")) : undefined,
      width: g("width") != null ? toNum(g("width")) : undefined,
      weight: g("weight") != null ? toNum(g("weight")) : undefined,
    },
    careInstructions: toStr(g("careInstructions")),
    pricing: {
      mrp: mrp || sellingPrice,
      sellingPrice,
      discountPercent,
      gstPercent: toNum(g("gstPercent"), 5),
      hsnCode: toStr(g("hsnCode")),
      currency: "INR",
    },
    stock: {
      qty,
      storeId: toStr(g("storeId")),
      status: stockStatus(qty, opts.lowStockThreshold),
    },
    images: toImages(g("images")),
    videoUrl: toStr(g("videoUrl")),
    tags: toArr(g("tags")),
    isNewArrival: toBool(g("isNewArrival")),
    isActive: toBool(g("isActive"), true),
    createdAt: toISO(g("createdAt")),
    updatedAt: toISO(g("updatedAt")),
    source: opts.source ?? "erp",
  };
}

export function toProductCard(p: Product): ProductCard {
  return {
    id: p.id,
    sku: p.sku,
    slug: p.slug,
    name: p.name,
    category: p.category,
    subCategory: p.subCategory,
    fabric: p.fabric,
    color: p.color,
    pricing: p.pricing,
    stock: p.stock,
    images: p.images,
    isNewArrival: p.isNewArrival,
    source: p.source,
    web: p.web ? {
      cardTitle: p.web.cardTitle,
      cardDescription: p.web.cardDescription,
      priceOverride: p.web.priceOverride,
    } : undefined,
  };
}

export function mapCategory(raw: any): Category {
  const g = (k: CategoryFieldKey) => getPath(raw, CATEGORY_FIELDS[k]);
  const name = toStr(g("name")) ?? "Category";
  const parentId = toStr(g("parentId"));
  return {
    id: toId(g("id")),
    name,
    slug: toStr(g("slug")) ?? slugify(name),
    parentId: parentId && parentId !== "null" ? toId(g("parentId")) : undefined,
    image: toStr(g("image")),
    sortOrder: toNum(g("sortOrder")),
    isActive: toBool(g("isActive"), true),
  };
}

/** The value to match in products.category / products.subCategory for a category. */
export function categoryRefValue(cat: Category): string {
  switch (PRODUCT_CATEGORY_REF) {
    case "id":
      return cat.id;
    case "slug":
      return cat.slug;
    default:
      return cat.name;
  }
}

export function mapAddress(raw: any): Address {
  const g = (k: AddressFieldKey) => getPath(raw, ADDRESS_FIELDS[k]);
  return {
    name: toStr(g("name")),
    phone: toStr(g("phone")),
    line1: toStr(g("line1")) ?? "",
    line2: toStr(g("line2")),
    city: toStr(g("city")) ?? "",
    state: toStr(g("state")) ?? "",
    pincode: toStr(g("pincode")) ?? "",
    country: toStr(g("country")) ?? "India",
    isDefault: toBool(g("isDefault")),
  };
}

export function mapCustomer(raw: any): Customer {
  const g = (k: CustomerFieldKey) => getPath(raw, CUSTOMER_FIELDS[k]);
  const addresses = g("addresses");
  return {
    id: toId(g("id")),
    name: toStr(g("name")) ?? "",
    mobile: toStr(g("mobile")) ?? "",
    email: toStr(g("email")),
    addresses: Array.isArray(addresses) ? addresses.map(mapAddress) : [],
    gstNumber: toStr(g("gstNumber")),
    loyaltyPoints: toNum(g("loyaltyPoints")),
    isActive: toBool(g("isActive"), true),
    createdAt: toISO(g("createdAt")),
  };
}

export function mapOrderItem(raw: any): OrderItem {
  const g = (k: OrderItemFieldKey) => getPath(raw, ORDER_ITEM_FIELDS[k]);
  return {
    productId: toStr(g("productId")),
    sku: toStr(g("sku")) ?? "",
    name: toStr(g("name")),
    image: toStr(g("image")),
    qty: toNum(g("qty"), 1),
    rate: toNum(g("rate")),
    discount: toNum(g("discount")),
    gst: toNum(g("gst")),
    amount: toNum(g("amount")),
  };
}

export function mapOrder(raw: any): Order {
  const g = (k: OrderFieldKey) => getPath(raw, ORDER_FIELDS[k]);
  const items = g("items");
  return {
    id: toId(g("id")),
    orderNo: toStr(g("orderNo")) ?? "",
    customerId: toId(g("customerId")),
    items: Array.isArray(items) ? items.map(mapOrderItem) : [],
    subTotal: toNum(g("subTotal")),
    discountTotal: toNum(g("discountTotal")),
    gstTotal: toNum(g("gstTotal")),
    shippingCharge: toNum(g("shippingCharge")),
    netAmount: toNum(g("netAmount")),
    paymentMode: (toStr(g("paymentMode")) ?? "COD") as Order["paymentMode"],
    paymentStatus: (toStr(g("paymentStatus")) ?? "Pending") as Order["paymentStatus"],
    orderStatus: (toStr(g("orderStatus")) ?? "Placed") as Order["orderStatus"],
    shippingAddress: mapAddress(g("shippingAddress") ?? {}),
    awbNo: toStr(g("awbNo")),
    storeId: toStr(g("storeId")),
    couponCode: toStr(g("couponCode")),
    statusHistory: Array.isArray(raw?.statusHistory) ? raw.statusHistory.map((h: any) => ({ status: h.status, note: h.note, by: h.by, at: toISO(h.at) })) : undefined,
    createdAt: toISO(g("createdAt")),
  };
}

export function mapStore(raw: any): Store {
  const g = (k: StoreFieldKey) => getPath(raw, STORE_FIELDS[k]);
  const addr = g("address");
  return {
    id: toId(g("id")),
    name: toStr(g("name")) ?? "Store",
    address:
      typeof addr === "object" && addr !== null
        ? Object.values(addr as Record<string, unknown>)
            .map((v) => toStr(v))
            .filter(Boolean)
            .join(", ")
        : (toStr(addr) ?? ""),
    phone: toStr(g("phone")),
    city: toStr(g("city")),
  };
}

/* ---------------------------------------------------------------------------
 * Domain values -> ERP-shaped document (used by the seed script and by
 * website-owned collections that keep ERP field names for future write-back).
 * ------------------------------------------------------------------------- */
export function buildDoc<M extends Record<string, string>>(
  fieldMap: M,
  values: Partial<Record<keyof M, unknown>>,
): Record<string, unknown> {
  const doc: Record<string, unknown> = {};
  for (const [uiKey, value] of Object.entries(values)) {
    if (value === undefined) continue;
    const path = fieldMap[uiKey as keyof M];
    if (!path || path === "_id") continue;
    setPath(doc, path, value);
  }
  return doc;
}

export const buildProductDoc = (v: Partial<Record<ProductFieldKey, unknown>>) => buildDoc(PRODUCT_FIELDS, v);
export const buildCategoryDoc = (v: Partial<Record<CategoryFieldKey, unknown>>) => buildDoc(CATEGORY_FIELDS, v);
export const buildCustomerDoc = (v: Partial<Record<CustomerFieldKey, unknown>>) => buildDoc(CUSTOMER_FIELDS, v);
export const buildAddressDoc = (v: Partial<Record<AddressFieldKey, unknown>>) => buildDoc(ADDRESS_FIELDS, v);
export const buildOrderDoc = (v: Partial<Record<OrderFieldKey, unknown>>) => buildDoc(ORDER_FIELDS, v);
export const buildOrderItemDoc = (v: Partial<Record<OrderItemFieldKey, unknown>>) => buildDoc(ORDER_ITEM_FIELDS, v);
export const buildStoreDoc = (v: Partial<Record<StoreFieldKey, unknown>>) => buildDoc(STORE_FIELDS, v);

/** Address -> ERP-shaped subdocument */
export function addressToDoc(a: Address) {
  return buildAddressDoc({
    name: a.name,
    phone: a.phone,
    line1: a.line1,
    line2: a.line2,
    city: a.city,
    state: a.state,
    pincode: a.pincode,
    country: a.country,
    isDefault: a.isDefault,
  });
}

/** All mappings in one place — used by the ERP status endpoint and docs generator. */
export const ALL_FIELD_MAPS = {
  products: PRODUCT_FIELDS,
  categories: CATEGORY_FIELDS,
  customers: CUSTOMER_FIELDS,
  addresses: ADDRESS_FIELDS,
  orders: ORDER_FIELDS,
  orderItems: ORDER_ITEM_FIELDS,
  stores: STORE_FIELDS,
} as const;
