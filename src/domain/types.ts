/**
 * DOMAIN TYPES — what the storefront and admin UI consume.
 *
 * These are deliberately decoupled from RetailERP field names. The only code
 * that translates between the two is src/lib/erp-mapping.ts.
 */

export type ID = string;
export type DataSource = "mock" | "erp";

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export interface Money {
  mrp: number;
  sellingPrice: number;
  discountPercent: number;
  gstPercent: number;
  hsnCode?: string;
  currency: "INR";
}

export interface Product {
  id: ID;
  sku: string;
  barcode?: string;
  slug: string;
  name: string;
  description: string;
  /** Raw category reference exactly as the ERP stores it (name, id or slug — see PRODUCT_CATEGORY_REF). */
  category: string;
  subCategory?: string;
  fabric?: string;
  weave?: string;
  craft?: string;
  occasion: string[];
  color?: string;
  motif?: string;
  border?: string;
  blouseIncluded: boolean;
  dimensions: { length?: number; width?: number; weight?: number };
  careInstructions?: string;
  pricing: Money;
  stock: { qty: number; storeId?: string; status: StockStatus };
  images: string[];
  videoUrl?: string;
  tags: string[];
  isNewArrival: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  source: DataSource;
  isBarcodeLabel?: boolean;
  /** Website-owned overrides merged from productWebMeta (SEO, featured flag, extra images). */
  web?: {
    seoTitle?: string;
    seoDescription?: string;
    cardTitle?: string;
    cardDescription?: string;
    priceOverride?: number;
    isFeatured?: boolean;
    salesCount?: number;
  };
}

export type ProductCard = Pick<
  Product,
  | "id"
  | "sku"
  | "slug"
  | "name"
  | "category"
  | "subCategory"
  | "fabric"
  | "color"
  | "pricing"
  | "stock"
  | "images"
  | "isNewArrival"
> & Pick<Product, "source"> & {
  web?: Pick<NonNullable<Product["web"]>, "cardTitle" | "cardDescription" | "priceOverride">;
};

export interface Category {
  id: ID;
  name: string;
  slug: string;
  parentId?: ID;
  image?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface CategoryNode extends Category {
  children: CategoryNode[];
}

export interface Address {
  name?: string;
  phone?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isDefault?: boolean;
}

export interface Customer {
  id: ID;
  name: string;
  mobile: string;
  email?: string;
  addresses: Address[];
  gstNumber?: string;
  loyaltyPoints: number;
  isActive: boolean;
  createdAt?: string;
}

export type OrderStatus =
  | "Placed"
  | "Confirmed"
  | "Packed"
  | "Shipped"
  | "Out for delivery"
  | "Delivered"
  | "Cancelled"
  | "Returned";
export type PaymentMode = "COD" | "RAZORPAY" | "UPI" | "CARD";
export type PaymentStatus = "Pending" | "Paid" | "Failed" | "Refunded";

export interface OrderItem {
  productId?: ID;
  sku: string;
  name?: string;
  image?: string;
  qty: number;
  rate: number;
  discount: number;
  gst: number;
  amount: number;
}

export interface Order {
  id: ID;
  orderNo: string;
  customerId: ID;
  items: OrderItem[];
  subTotal: number;
  discountTotal: number;
  gstTotal: number;
  shippingCharge: number;
  netAmount: number;
  paymentMode: PaymentMode;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  shippingAddress: Address;
  awbNo?: string;
  storeId?: ID;
  couponCode?: string;
  /** Website-only fulfilment trail (not part of RetailERP). */
  statusHistory?: { status: OrderStatus; note?: string; by?: string; at?: string }[];
  createdAt?: string;
}

export interface Store {
  id: ID;
  name: string;
  address: string;
  phone?: string;
  city?: string;
}

/* ---------- Listing / filtering ---------- */

export const FILTER_KEYS = ["fabric", "weave", "craft", "occasion", "color", "motif", "border"] as const;
export type FilterKey = (typeof FILTER_KEYS)[number];

export const SORT_KEYS = ["featured", "price_asc", "price_desc", "newest", "best_selling"] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export interface ProductListParams {
  category?: string; // category slug
  filters?: Partial<Record<FilterKey, string[]>>;
  priceMin?: number;
  priceMax?: number;
  discountMin?: number;
  inStock?: boolean;
  q?: string;
  sort?: SortKey;
  page?: number;
  limit?: number;
  ids?: ID[];
  skus?: string[];
  tags?: string[];
  newArrivals?: boolean;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface FacetOption {
  value: string;
  label: string;
  count: number;
  swatch?: string;
}

export interface FacetGroup {
  key: FilterKey;
  label: string;
  options: FacetOption[];
}

/* ---------------- RetailERP barcode labels (admin Products) ---------------- */

/** Why a barcode product has no image to show. */
export type ImageIssue = "none" | "placeholder" | "unavailable";

/**
 * One RetailERP barcodeLabel document — a printed label for one sellable unit
 * (a unique piece or a batch such as a fabric roll). Optional fields are omitted
 * when the ERP record has no value.
 */
export interface BarcodeProduct {
  id: ID;
  barcode: string;
  /** ERP Item reference used to join its ecommerceproduct record. */
  itemId?: string;
  /** ERP item code; equals the barcode for most unique pieces. */
  itemCode?: string;
  /** Supplier / legacy barcode, only when it differs from `barcode`. */
  oldBarcode?: string;
  name: string;
  itemName?: string;
  /** Label print text from RetailERP or the website override. */
  printDescription?: string;
  ecommerce?: {
    displayName?: string;
    itemCode?: string;
    productType?: string;
    description?: string;
    attributes?: Partial<Record<"weave" | "fabric" | "craft" | "occasion" | "color", string>>;
  };
  group?: string;
  groupId?: string;
  business?: string;
  businessId?: string;
  supplierCode?: string;
  supplierName?: string;
  qty?: number;
  uom?: string;
  uomType?: string;
  price?: number;
  offerPrice?: number;
  hsnCode?: string;
  gstPercent?: number;
  /** Raw ERP status: IN_STOCK, SOLD, VOID, IN_TRANSIT, HISTORY… */
  status?: string;
  batchType?: string;
  grcNo?: string;
  /** Verified, browser-loadable image URL (or data URI). Absent when `imageIssue` is set. */
  image?: string;
  imageIssue?: ImageIssue;
  /** How many barcodeLabel documents carry this barcode — only set when more than one. */
  barcodeLabelCount?: number;
  slug: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BarcodeListParams {
  q?: string;
  barcodes?: string[];
  /** Internal storefront filter resolved from modern ERP items by exact barcodeLabel ObjectId. */
  labelIds?: string[];
  seriesPrefix?: string;
  /** Internal storefront filters for the combined ERP clothing catalogue. */
  groupIds?: string[];
  businessIds?: string[];
  /** Internal storefront filter that excludes website-disabled barcode labels. */
  excludedBarcodes?: string[];
  /** Internal storefront filter that excludes unavailable ERP labels. */
  availableOnly?: boolean;
  /** Public category listings retain IN_STOCK labels with zero quantity as unavailable products. */
  inStockStatusOnly?: boolean;
  status?: string;
  group?: string;
  business?: string;
  uomType?: string;
  page?: number;
  limit?: number;
}

export interface BarcodeFacets {
  status: FacetOption[];
  group: FacetOption[];
  business: FacetOption[];
  uomType: FacetOption[];
  subgroup?: FacetOption[];
  weave?: FacetOption[];
  fabric?: FacetOption[];
  craft?: FacetOption[];
  occasion?: FacetOption[];
  color?: FacetOption[];
  total: number;
}

export interface ProductFacets {
  groups: FacetGroup[];
  price: { min: number; max: number };
  availability: { inStock: number; outOfStock: number };
  discount: { minPercent: number; count: number }[];
  total: number;
}
