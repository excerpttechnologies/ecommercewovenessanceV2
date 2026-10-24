import type {
  Address,
  BarcodeFacets,
  BarcodeListParams,
  BarcodeProduct,
  Category,
  CategoryNode,
  Customer,
  DataSource,
  FacetOption,
  FilterKey,
  Order,
  OrderItem,
  OrderStatus,
  Paginated,
  PaymentMode,
  Product,
  ProductCard,
  ProductFacets,
  ProductListParams,
  Store,
} from "@/domain/types";

/* ---------------- Master data (ERP-owned, read-only in erp mode) ---------------- */

export interface ProductRepository {
  list(params: ProductListParams): Promise<Paginated<ProductCard>>;
  facets(params: ProductListParams): Promise<ProductFacets>;
  getBySlug(slug: string): Promise<Product | null>;
  getBySku(sku: string): Promise<Product | null>;
  getBySkus(skus: string[]): Promise<Product[]>;
  search(q: string, limit?: number): Promise<ProductCard[]>;
  related(product: Product, limit?: number): Promise<ProductCard[]>;
  distinctValues(key: FilterKey, categorySlug?: string): Promise<string[]>;
  /** Counts for the admin dashboard / inventory page. */
  stockSummary(lowStockThreshold?: number): Promise<{ total: number; inStock: number; lowStock: number; outOfStock: number }>;
}

export interface CategoryRepository {
  list(): Promise<Category[]>;
  getBySlug(slug: string): Promise<Category | null>;
  getById(id: string): Promise<Category | null>;
  tree(): Promise<CategoryNode[]>;
}

export interface StoreRepository {
  list(): Promise<Store[]>;
  getById(id: string): Promise<Store | null>;
}

export interface MasterDataSource {
  readonly kind: DataSource;
  readonly readOnly: boolean;
  readonly products: ProductRepository;
  readonly categories: CategoryRepository;
  readonly stores: StoreRepository;
  /** Connection test used by the admin "RetailERP connection test" button. */
  ping(): Promise<{ ok: boolean; dbName?: string; collections?: Record<string, number>; error?: string; ms: number }>;
}

/** RetailERP barcodeLabel — backs the admin Products page. Always the ERP database, read-only. */
export interface BarcodeLabelRepository {
  list(params: BarcodeListParams): Promise<Paginated<BarcodeProduct> & { skipped: number }>;
  /** Resolve label document IDs through modern ERP Item group assignments. */
  getLabelIdsForItemGroups(groupIds: string[]): Promise<string[]>;
  /** Resolve barcode-label IDs through active ERP e-commerce product types. */
  getLabelIdsForProductTypes(
    productTypes: string[],
    subgroupId?: string,
    query?: string,
    classifications?: Partial<Record<"weave" | "fabric" | "craft" | "occasion" | "color", string>>,
  ): Promise<string[]>;
  /** Resolve ERP subgroup filters available for active e-commerce product types. */
  getProductTypeSubgroups(productTypes: string[]): Promise<FacetOption[]>;
  /** Resolve live ERP e-commerce classification filters by product type. */
  getProductTypeClassifications(
    productTypes: string[],
  ): Promise<Partial<Record<"weave" | "fabric" | "craft" | "occasion" | "color", FacetOption[]>>>;
  /** Filter options with live counts (status, product group, business, UOM type). */
  facets(params?: BarcodeListParams): Promise<BarcodeFacets>;
  /** Newest label carrying this barcode (images not resolved). */
  getByBarcode(barcode: string): Promise<BarcodeProduct | null>;
  /** Newest label for each requested barcode, with ERP joins and images resolved. */
  getByBarcodes(barcodes: string[]): Promise<BarcodeProduct[]>;
}

/* ---------------- Website-owned data ---------------- */

export interface CustomerRepository {
  getById(id: string): Promise<Customer | null>;
  getByMobile(mobile: string): Promise<Customer | null>;
  upsertByMobile(input: { mobile: string; name?: string; email?: string }): Promise<Customer>;
  create(input: { name: string; email: string; mobile?: string }): Promise<Customer>;
  update(id: string, patch: Partial<Pick<Customer, "name" | "email" | "gstNumber">>): Promise<Customer | null>;
  setAddresses(id: string, addresses: Address[]): Promise<Customer | null>;
  list(params: { q?: string; page?: number; limit?: number }): Promise<Paginated<Customer>>;
}

export interface CreateOrderInput {
  customerId: string;
  items: OrderItem[];
  subTotal: number;
  discountTotal: number;
  gstTotal: number;
  shippingCharge: number;
  netAmount: number;
  paymentMode: PaymentMode;
  paymentStatus?: Order["paymentStatus"];
  orderStatus?: Order["orderStatus"];
  paymentGatewayOrderId?: string;
  paymentTransactionId?: string;
  shippingAddress: Address;
  storeId?: string;
  couponCode?: string;
}

export interface OrderRepository {
  create(input: CreateOrderInput): Promise<Order>;
  getByOrderNo(orderNo: string): Promise<Order | null>;
  listByCustomer(customerId: string, params?: { page?: number; limit?: number }): Promise<Paginated<Order>>;
  list(params: {
    status?: OrderStatus;
    paymentStatus?: Order["paymentStatus"];
    q?: string;
    from?: Date;
    to?: Date;
    page?: number;
    limit?: number;
  }): Promise<Paginated<Order>>;
  updateStatus(orderNo: string, status: OrderStatus, note?: string, by?: string): Promise<Order | null>;
  setAwb(orderNo: string, awbNo: string): Promise<Order | null>;
}
