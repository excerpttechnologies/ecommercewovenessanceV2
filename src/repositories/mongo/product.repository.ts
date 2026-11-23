/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Connection, FilterQuery } from "mongoose";
import { getWebConnection, toObjectIdOrString } from "@/lib/db";
import {
  ACTIVE_PRODUCT_QUERY,
  BARCODE_LABEL_FIELDS as B,
  DEFAULT_LOW_STOCK_THRESHOLD,
  ERP_BARCODE_COLLECTIONS,
  PRODUCT_FIELDS as P,
  PRODUCT_FILTER_FIELDS,
  TRUTHY_VALUES,
  categoryRefValue,
  mapProduct,
  productSort,
  resolvePrimaryProductImage,
  skuCandidatesFromSlug,
  toProductCard,
} from "@/lib/erp-mapping";
import { barcodeImageUrl } from "@/lib/erp-images";
import { cached } from "@/lib/cache";
import { getProductMetaMap } from "@/lib/product-meta-cache";
import { escapeRegex } from "@/lib/utils";
import { ProductModel } from "@/models/erp/product.model";
import { ProductWebMetaModel, type ProductWebMetaDoc } from "@/models/web/content.models";
import type { AnyDoc } from "@/models/_util";
import {
  FILTER_KEYS,
  type DataSource,
  type FacetGroup,
  type FilterKey,
  type Paginated,
  type Product,
  type ProductCard,
  type ProductFacets,
  type ProductListParams,
} from "@/domain/types";
import type { CategoryRepository, ProductRepository } from "../types";

const FACET_LABELS: Record<FilterKey, string> = {
  fabric: "Fabric",
  weave: "Weave",
  craft: "Craft",
  occasion: "Occasion",
  color: "Colour",
  motif: "Motif / Pattern",
  border: "Border",
};
const DISCOUNT_BUCKETS = [10, 20, 30, 40, 50];
const MAX_LIMIT = 96;
const DEFAULT_BUSINESS_ID = "6a853cdefb266c4358beb548"; // TEMPLE FABRICS

function searchVariants(query: string): string[] {
  const value = query.trim();
  const singular = value.replace(/ies$/i, "y").replace(/(?<!s)s$/i, "");
  return Array.from(new Set([value, singular].filter(Boolean)));
}

/** Colour name -> swatch hex for the filter sidebar. Anything unknown falls back to a neutral. */
const SWATCHES: Record<string, string> = {
  maroon: "#7B1E2B",
  red: "#C0392B",
  mustard: "#D4A017",
  "emerald green": "#0F6B4E",
  "bottle green": "#1F4D3A",
  "royal blue": "#1F3A93",
  "peacock blue": "#0E6E7E",
  ivory: "#F4EEDC",
  black: "#1C1C1C",
  pink: "#D77FA1",
  lavender: "#A48BC7",
  orange: "#E0762A",
  teal: "#188A8A",
  beige: "#D8C9A8",
  gold: "#C9A227",
  purple: "#5E2B8A",
};

export class MongoProductRepository implements ProductRepository {
  constructor(
    private readonly conn: () => Promise<Connection>,
    private readonly source: DataSource,
    private readonly categories: CategoryRepository,
    private readonly lowStockThreshold = DEFAULT_LOW_STOCK_THRESHOLD,
  ) {}

  private async M() {
    return ProductModel(await this.conn());
  }
  private async Meta() {
    return ProductWebMetaModel(await getWebConnection());
  }

  /**
   * True if running directly against RetailERP or if the connected DB has the ERP ecommerceproduct collection.
   */
  private _isErpModeCache?: boolean;
  private async isErpMode(): Promise<boolean> {
    if (this._isErpModeCache !== undefined) return this._isErpModeCache;
    if (this.source === "erp") {
      this._isErpModeCache = true;
      return true;
    }
    try {
      const c = await this.conn();
      if (!c.db) {
        this._isErpModeCache = false;
        return false;
      }
      const collections = await c.db.listCollections({ name: ERP_BARCODE_COLLECTIONS.ecommerceProducts }).toArray();
      this._isErpModeCache = collections.length > 0;
      return this._isErpModeCache;
    } catch {
      this._isErpModeCache = false;
      return false;
    }
  }

  /* ---------- query building for Mongoose / mock mode ---------- */

  private async categoryClauses(categorySlug: string): Promise<FilterQuery<AnyDoc>[] | null> {
    const cat = await this.categories.getBySlug(categorySlug);
    if (!cat) return null;
    if (cat.parentId) {
      const parent = await this.categories.getById(cat.parentId);
      const clauses: FilterQuery<AnyDoc>[] = [{ [P.subCategory]: categoryRefValue(cat) }];
      if (parent) clauses.unshift({ [P.category]: categoryRefValue(parent) });
      return clauses;
    }
    return [{ [P.category]: categoryRefValue(cat) }];
  }

  /** Everything except the attribute (facet) filters. */
  private async baseMatch(params: ProductListParams): Promise<FilterQuery<AnyDoc> | null> {
    const and: FilterQuery<AnyDoc>[] = [ACTIVE_PRODUCT_QUERY];

    if (params.category) {
      const clauses = await this.categoryClauses(params.category);
      if (!clauses) return null; // unknown category -> empty result
      and.push(...clauses);
    }
    if (params.priceMin != null || params.priceMax != null) {
      const range: Record<string, number> = {};
      if (params.priceMin != null) range.$gte = params.priceMin;
      if (params.priceMax != null) range.$lte = params.priceMax;
      and.push({ [P.sellingPrice]: range });
    }
    if (params.discountMin) and.push({ [P.discountPercent]: { $gte: params.discountMin } });
    if (params.inStock === true) and.push({ [P.stockQty]: { $gt: 0 } });
    if (params.inStock === false)
      and.push({ $or: [{ [P.stockQty]: { $lte: 0 } }, { [P.stockQty]: { $exists: false } }] });
    if (params.newArrivals) and.push({ [P.isNewArrival]: { $in: TRUTHY_VALUES } });
    if (params.skus?.length) and.push({ [P.sku]: { $in: params.skus } });
    if (params.ids?.length) and.push({ _id: { $in: params.ids.map(toObjectIdOrString) } });
    if (params.tags?.length) and.push({ [P.tags]: { $in: params.tags } });
    if (params.q?.trim()) {
      const patterns = searchVariants(params.q).map((value) => new RegExp(escapeRegex(value), "i"));
      const searchableFields = [
        P.name,
        P.sku,
        P.barcode,
        "barcodeNo",
        "publishedBarcodes",
        P.category,
        P.subCategory,
        P.fabric,
        P.weave,
        P.craft,
        P.motif,
        P.color,
        P.tags,
        P.description,
      ];
      and.push({
        $or: [
          ...searchableFields.flatMap((field) => patterns.map((pattern) => ({ [field]: pattern }))),
        ],
      });
    }
    return and.length === 1 ? and[0] : { $and: and };
  }

  /** Attribute filters only, optionally excluding one key (for facet counts). */
  private facetMatch(params: ProductListParams, exclude?: FilterKey): FilterQuery<AnyDoc> {
    const and: FilterQuery<AnyDoc>[] = [];
    for (const key of FILTER_KEYS) {
      if (key === exclude) continue;
      const values = params.filters?.[key];
      if (values?.length) and.push({ [PRODUCT_FILTER_FIELDS[key]]: { $in: values } });
    }
    if (!and.length) return {};
    return and.length === 1 ? and[0] : { $and: and };
  }

  private async fullMatch(params: ProductListParams): Promise<FilterQuery<AnyDoc> | null> {
    const base = await this.baseMatch(params);
    if (!base) return null;
    const facet = this.facetMatch(params);
    return Object.keys(facet).length ? { $and: [base, facet] } : base;
  }

  /* ---------- hydration (ERP doc -> domain + web meta overlay) ---------- */

  private async hydrate(docs: (AnyDoc | Product)[]): Promise<Product[]> {
    const products = docs.map((d) => {
      if (
        d &&
        typeof d === "object" &&
        "pricing" in d &&
        "stock" in d &&
        typeof (d as Product).pricing === "object" &&
        typeof (d as Product).stock === "object"
      ) {
        return d as Product;
      }
      return mapProduct(d, { source: this.source, lowStockThreshold: this.lowStockThreshold });
    });
    if (!products.length) return products;
    const Meta = await this.Meta();
    const metas = (await Meta.find({ sku: { $in: products.map((p) => p.sku) } }).lean()) as ProductWebMetaDoc[];
    const bySku = new Map(metas.map((m) => [m.sku, m]));
    return products.map((p) => {
      const m = bySku.get(p.sku);
      if (!m) return p;
      const sellingPrice = m.priceOverride ?? p.pricing.sellingPrice;
      return {
        ...p,
        slug: m.slug || p.slug,
        images: [...p.images, ...(m.extraImages ?? [])],
        tags: Array.from(new Set([...p.tags, ...(m.webTags ?? [])])),
        pricing: m.priceOverride == null
          ? p.pricing
          : {
              ...p.pricing,
              sellingPrice,
              discountPercent: p.pricing.mrp > sellingPrice
                ? Math.round(((p.pricing.mrp - sellingPrice) / p.pricing.mrp) * 100)
                : 0,
            },
        web: {
          seoTitle: m.seoTitle ?? undefined,
          seoDescription: m.seoDescription ?? undefined,
          cardTitle: m.cardTitle ?? undefined,
          cardDescription: m.cardDescription ?? undefined,
          priceOverride: m.priceOverride ?? undefined,
          isFeatured: m.isFeatured ?? false,
          salesCount: m.salesCount ?? 0,
          silkMarkCertified: m.silkMarkCertified ?? false,
          silkMarkNumber: m.silkMarkNumber ?? undefined,
        },
      };
    });
  }

  /* =========================================================================
   * RetailERP Catalog Search Engine (Grooretailerp1)
   *
   * Backed directly by `ecommerceproduct` and `barcodeLabel`.
   * Maps parent products with child variants, resolves barcodes, product codes,
   * SKUs, names, descriptions, classifications, price ranges, and inventory.
   * ========================================================================= */

  private async erpList(params: ProductListParams): Promise<Paginated<ProductCard>> {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, params.limit ?? 24));
    const conn = await this.conn();
    if (!conn.db) return { items: [], total: 0, page, limit, pages: 1 };

    const db = conn.db;
    const query = (params.q ?? "").trim();
    const upperQuery = query.toUpperCase();
    const queryRx = query ? new RegExp(escapeRegex(query), "i") : null;

    // 1. Resolve matching barcodes from barcodeLabel (if query provided)
    let matchingBarcodes: string[] = [];
    if (query) {
      // Fast path: indexed exact lookup first (10-50ms) for barcode, oldBarcode, or itemCode
      const exactMatches = await db.collection(ERP_BARCODE_COLLECTIONS.labels).find({
        $or: [
          { [B.barcode]: upperQuery },
          { [B.oldBarcode]: upperQuery },
          { [B.itemCode]: upperQuery },
        ],
      }, { projection: { [B.barcode]: 1 } }).limit(200).toArray();

      if (exactMatches.length > 0) {
        matchingBarcodes = [...new Set(exactMatches.map((l) => String(l[B.barcode] ?? "")).filter(Boolean))];
      } else {
        // Fallback to broader regex search for names, descriptions, or partial matches
        const labelMatches = await db.collection(ERP_BARCODE_COLLECTIONS.labels).find({
          $or: [
            { [B.barcode]: queryRx },
            { [B.oldBarcode]: queryRx },
            { [B.itemCode]: queryRx },
            { [B.itemName]: queryRx },
            { [B.description]: queryRx },
            { [B.printDescription]: queryRx },
            { [B.designNo]: queryRx },
          ],
        }, { projection: { [B.barcode]: 1 } }).limit(200).toArray();

        matchingBarcodes = [...new Set(labelMatches.map((l) => String(l[B.barcode] ?? "")).filter(Boolean))];
      }
    }

    // 2. Query parent EcommerceProducts
    const ecomFilter: AnyDoc = {
      isPublished: true,
      status: "active",
    };

    if (query) {
      const orClauses: AnyDoc[] = [
        { displayName: queryRx },
        { ecommItemCode: upperQuery },
        { ecommItemCode: queryRx },
        { printDescriptionOverride: queryRx },
        { productType: queryRx },
        { barcode: upperQuery },
        { barcode: queryRx },
        { publishedBarcodes: upperQuery },
      ];
      if (matchingBarcodes.length) {
        orClauses.push({ publishedBarcodes: { $in: matchingBarcodes } });
        orClauses.push({ barcode: { $in: matchingBarcodes } });
      }
      ecomFilter.$or = orClauses;
    }

    if (params.category) {
      ecomFilter.productType = new RegExp(`^${escapeRegex(params.category)}$`, "i");
    }

    const ecomDocs = await db.collection(ERP_BARCODE_COLLECTIONS.ecommerceProducts).find(ecomFilter).toArray();

    // 3. Map parent ecommerce products
    const items: ProductCard[] = [];
    const handledBarcodes = new Set<string>();

    // Collect all barcodes across parent products for a single batched query
    const allParentBarcodes: string[] = [];
    for (const p of ecomDocs) {
      const barcodes = Array.isArray(p.publishedBarcodes) && p.publishedBarcodes.length
        ? (p.publishedBarcodes as string[])
        : [String(p.barcode ?? "")].filter(Boolean);
      for (const b of barcodes) {
        allParentBarcodes.push(b);
        handledBarcodes.add(b);
      }
    }

    // Single batched query for in-stock labels with lean projection
    const inStockLabels = allParentBarcodes.length
      ? await db.collection(ERP_BARCODE_COLLECTIONS.labels).find({
          [B.barcode]: { $in: allParentBarcodes },
          [B.status]: "IN_STOCK",
        }, {
          projection: {
            [B.barcode]: 1,
            [B.qty]: 1,
            [B.retailPrice]: 1,
            [B.offerPrice]: 1,
            imageUrl: 1,
            image: 1,
            filePath: 1,
          }
        }).toArray()
      : [];

    const labelsByBarcode = new Map<string, AnyDoc[]>();
    for (const l of inStockLabels) {
      const b = String(l[B.barcode] ?? "");
      let arr = labelsByBarcode.get(b);
      if (!arr) {
        arr = [];
        labelsByBarcode.set(b, arr);
      }
      arr.push(l);
    }

    for (const p of ecomDocs) {
      const barcodes = Array.isArray(p.publishedBarcodes) && p.publishedBarcodes.length
        ? (p.publishedBarcodes as string[])
        : [String(p.barcode ?? "")].filter(Boolean);

      const slugName = (p.displayName || p.ecommItemCode || "product").toLowerCase().replace(/[^a-z0-9]+/g, "-");

      if (barcodes.length === 0) {
        const sku = p.ecommItemCode || String(p._id);
        const slug = `${slugName}-${sku.toLowerCase()}`.replace(/^-+|-+$/g, "");
        const mrp = Number(p.barcodePriceOverride) || 0;
        items.push({
          id: String(p._id),
          sku,
          name: p.displayName || p.ecommItemCode || "Woven Essence Product",
          category: p.productType || "Sarees",
          subCategory: p.productType,
          slug,
          pricing: {
            mrp,
            sellingPrice: mrp,
            discountPercent: 0,
            gstPercent: 5,
            currency: "INR",
          },
          stock: { qty: 1, status: "in_stock" },
          images: p.image ? [p.image] : [],
          source: "erp",
          isNewArrival: Boolean(p.isNewArrival),
        });
      } else {
        for (const b of barcodes) {
          const bLabels = labelsByBarcode.get(b) ?? [];
          const bQty = bLabels.reduce((sum, l) => sum + (Number(l[B.qty]) || 0), 0);
          if (params.inStock && bQty <= 0) continue;

          const firstLabel = bLabels[0];
          const mrp = (firstLabel && Number(firstLabel[B.retailPrice])) || Number(p.barcodePriceOverride) || 0;
          const offer = firstLabel && Number(firstLabel[B.offerPrice]) ? Number(firstLabel[B.offerPrice]) : null;
          const sellingPrice = offer && offer > 0 && offer < mrp ? offer : mrp;

          if (params.priceMin != null && sellingPrice < params.priceMin) continue;
          if (params.priceMax != null && sellingPrice > params.priceMax) continue;

          const primaryImage = resolvePrimaryProductImage(b, firstLabel, p.image);
          const uom = firstLabel?.[B.uom] || firstLabel?.[B.uomType] || "Pc";
          const uomType = firstLabel?.[B.uomType] || firstLabel?.[B.uom] || "PC";

          const slug = `${slugName}-${b.toLowerCase()}`.replace(/^-+|-+$/g, "");

          items.push({
            id: firstLabel ? String(firstLabel._id) : `${String(p._id)}-${b}`,
            sku: b,
            name: p.displayName || p.ecommItemCode || "Woven Essence Product",
            category: p.productType || "Sarees",
            subCategory: p.productType,
            uom,
            uomType,
            slug,
            pricing: {
              mrp,
              sellingPrice,
              discountPercent: mrp > sellingPrice ? Math.round(((mrp - sellingPrice) / mrp) * 100) : 0,
              gstPercent: 5,
              currency: "INR",
            },
            stock: {
              qty: bQty,
              status: bQty <= 0 ? "out_of_stock" : bQty <= 3 ? "low_stock" : "in_stock",
            },
            images: primaryImage ? [primaryImage] : [],
            source: "erp",
            isNewArrival: Boolean(p.isNewArrival),
          });
        }
      }
    }

    // 4. Standalone in-stock barcode labels (if query matched barcodes not in any parent ecommerce product)
    if (query && matchingBarcodes.length) {
      const standaloneBarcodes = matchingBarcodes.filter((b) => !handledBarcodes.has(b));
      if (standaloneBarcodes.length) {
        const standaloneLabels = await db.collection(ERP_BARCODE_COLLECTIONS.labels).find({
          [B.barcode]: { $in: standaloneBarcodes },
          [B.status]: "IN_STOCK",
        }, {
          projection: {
            [B.barcode]: 1,
            [B.qty]: 1,
            [B.retailPrice]: 1,
            [B.offerPrice]: 1,
            [B.itemName]: 1,
            [B.description]: 1,
            [B.printDescription]: 1,
            imageUrl: 1,
            image: 1,
            filePath: 1,
          }
        }).toArray();

        // Group by barcode
        const byBarcode = new Map<string, AnyDoc[]>();
        for (const l of standaloneLabels) {
          const code = String(l[B.barcode] ?? "");
          if (!byBarcode.has(code)) byBarcode.set(code, []);
          byBarcode.get(code)!.push(l);
        }

        for (const [code, labels] of byBarcode.entries()) {
          const first = labels[0];
          const totalQty = labels.reduce((sum, l) => sum + (Number(l[B.qty]) || 0), 0);
          if (params.inStock && totalQty <= 0) continue;

          const mrp = Number(first[B.retailPrice]) || 0;
          const offer = Number(first[B.offerPrice]) || null;
          const sellingPrice = offer && offer > 0 && offer < mrp ? offer : mrp;

          if (params.priceMin != null && sellingPrice < params.priceMin) continue;
          if (params.priceMax != null && sellingPrice > params.priceMax) continue;

          const name = first[B.itemName] || first[B.description] || first[B.printDescription] || code;
          const slugName = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
          const slug = `${slugName}-${code.toLowerCase()}`.replace(/^-+|-+$/g, "");
          const image = first.imageUrl || first.image || first.filePath || barcodeImageUrl(code);

          items.push({
            id: String(first._id),
            sku: code,
            name,
            category: first[B.itemName] || "Sarees",
            subCategory: first[B.itemName] || "Sarees",
            slug,
            pricing: {
              mrp,
              sellingPrice,
              discountPercent: mrp > sellingPrice ? Math.round(((mrp - sellingPrice) / mrp) * 100) : 0,
              gstPercent: 5,
              currency: "INR",
            },
            stock: {
              qty: totalQty,
              status: totalQty <= 0 ? "out_of_stock" : totalQty <= 3 ? "low_stock" : "in_stock",
            },
            images: image ? [image] : [],
            source: "erp",
            isNewArrival: false,
          });
        }
      }
    }

    // 5. Sort
    if (params.sort === "price_asc") {
      items.sort((a, b) => a.pricing.sellingPrice - b.pricing.sellingPrice);
    } else if (params.sort === "price_desc") {
      items.sort((a, b) => b.pricing.sellingPrice - a.pricing.sellingPrice);
    } else if (query) {
      // Prioritize exact barcode / code matches to the top
      items.sort((a, b) => {
        const aExact = a.sku.toUpperCase() === upperQuery ? 1 : 0;
        const bExact = b.sku.toUpperCase() === upperQuery ? 1 : 0;
        return bExact - aExact;
      });
    }

    // 6. Overlay productWebMeta if available (in-memory SWR)
    try {
      const metas = await getProductMetaMap();
      for (const item of items) {
        const m = metas.get(item.sku);
        if (m) {
          if (m.cardTitle) item.web = { ...item.web, cardTitle: m.cardTitle };
          if (m.cardDescription) item.web = { ...item.web, cardDescription: m.cardDescription };
          if (m.priceOverride != null) {
            item.pricing.sellingPrice = m.priceOverride;
            item.web = { ...item.web, priceOverride: m.priceOverride };
          }
          if (m.slug) item.slug = m.slug;
          if (m.extraImages?.length) item.images = [...item.images, ...m.extraImages];
        }
      }
    } catch {
      // web meta overlay is best-effort
    }

    const total = items.length;
    const paginatedItems = items.slice((page - 1) * limit, page * limit);

    return {
      items: paginatedItems,
      total,
      page,
      limit,
      pages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  private async erpFacets(params: ProductListParams): Promise<ProductFacets> {
    const listRes = await this.erpList({ ...params, page: 1, limit: MAX_LIMIT });
    const prices = listRes.items.map((i) => i.pricing.sellingPrice);
    const minPrice = prices.length ? Math.min(...prices) : 0;
    const maxPrice = prices.length ? Math.max(...prices) : 0;

    let inStock = 0;
    let outOfStock = 0;
    for (const item of listRes.items) {
      if (item.stock.qty > 0) inStock++;
      else outOfStock++;
    }

    const conn = await this.conn();
    const groups: FacetGroup[] = [];

    if (conn.db) {
      try {
        const weaves = await conn.db.collection("byweave").find({ isActive: { $ne: false } }).limit(50).toArray();
        if (weaves.length) {
          groups.push({
            key: "weave",
            label: "Weave",
            options: weaves.map((w) => ({ value: String(w.name || w._id), label: String(w.name || w._id), count: 1 })),
          });
        }
        const fabrics = await conn.db.collection("byfabric").find({ isActive: { $ne: false } }).limit(50).toArray();
        if (fabrics.length) {
          groups.push({
            key: "fabric",
            label: "Fabric",
            options: fabrics.map((f) => ({ value: String(f.name || f._id), label: String(f.name || f._id), count: 1 })),
          });
        }
      } catch {
        // classifications lookup is best-effort
      }
    }

    return {
      groups,
      price: { min: minPrice, max: maxPrice },
      availability: { inStock, outOfStock },
      discount: DISCOUNT_BUCKETS.map((b) => ({ minPercent: b, count: listRes.items.filter((i) => i.pricing.discountPercent >= b).length })).filter((x) => x.count > 0),
      total: listRes.total,
    };
  }

  private async erpGetBySku(sku: string, options?: { skipCache?: boolean }): Promise<Product | null> {
    if (!sku) return null;
    const cleanSku = String(sku).trim();
    const upperSku = cleanSku.toUpperCase();
    const fetchFresh = async () => {
      const conn = await this.conn();
      if (!conn.db) return null;
      const db = conn.db;

      // 1. FAST PATH: Parallel indexed lookups on barcodeLabel and ecommerceProducts (<40ms)
      const [labels, ecom] = await Promise.all([
        db.collection<AnyDoc>(ERP_BARCODE_COLLECTIONS.labels).find(
          { [B.barcode]: upperSku },
          {
            projection: {
              [B.barcode]: 1,
              [B.itemCode]: 1,
              [B.itemName]: 1,
              [B.printDescription]: 1,
              [B.description]: 1,
              [B.qty]: 1,
              [B.qtyText]: 1,
              [B.status]: 1,
              [B.retailPrice]: 1,
              [B.offerPrice]: 1,
              [B.gstPercent]: 1,
              [B.uom]: 1,
              [B.uomType]: 1,
              imageUrl: 1,
              image: 1,
              filePath: 1,
              itemId: 1,
              businessId: 1,
            },
          }
        ).toArray(),
        db.collection(ERP_BARCODE_COLLECTIONS.ecommerceProducts).findOne(
          { publishedBarcodes: upperSku, isPublished: true },
          {
            projection: {
              displayName: 1,
              ecommItemCode: 1,
              productType: 1,
              printDescriptionOverride: 1,
              isNewArrival: 1,
              image: 1,
              slug: 1,
            },
          }
        ),
      ]);

      const label = labels.find((l) => (Number(l[B.qty]) || 0) > 0) || labels.find((l) => l[B.status] === "IN_STOCK") || labels[0];
      if (label) {
        const totalQty = labels.reduce((sum, l) => sum + (l[B.status] === "IN_STOCK" ? (Number(l[B.qty]) || Number(l[B.qtyText]) || 0) : 0), 0);
        const mrp = Number(label[B.retailPrice]) || 0;
        const offer = Number(label[B.offerPrice]) || null;
        const sellingPrice = offer && offer > 0 && offer < mrp ? offer : mrp;

        const labelName = label[B.printDescription] || label[B.itemName] || label[B.description] || cleanSku;
        const name = labelName || ecom?.displayName || ecom?.ecommItemCode || "Woven Essence Product";
        const description = ecom?.printDescriptionOverride || label[B.printDescription] || label[B.description] || name;

        const primaryImage = resolvePrimaryProductImage(cleanSku, label, ecom?.image);
        const uom = label[B.uom] || label[B.uomType] || "Pc";
        const uomType = label[B.uomType] || label[B.uom] || "PC";
        const slugName = (ecom?.displayName || ecom?.ecommItemCode || "product").toLowerCase().replace(/[^a-z0-9]+/g, "-");
        const slug = `${slugName}-${cleanSku.toLowerCase()}`.replace(/^-+|-+$/g, "");

        const product: Product = {
          id: String(ecom?._id || label._id),
          sku: String(label[B.barcode] || cleanSku),
          barcode: String(label[B.barcode] || cleanSku),
          name,
          description,
          category: ecom?.productType || label[B.itemName] || "Sarees",
          subCategory: ecom?.productType || label[B.itemName] || "Sarees",
          uom,
          uomType,
          slug,
          pricing: {
            mrp,
            sellingPrice,
            discountPercent: mrp > sellingPrice ? Math.round(((mrp - sellingPrice) / mrp) * 100) : 0,
            gstPercent: Number(label[B.gstPercent]) || 5,
            currency: "INR",
          },
          stock: {
            qty: totalQty,
            status: totalQty <= 0 ? "out_of_stock" : totalQty <= 3 ? "low_stock" : "in_stock",
          },
          images: primaryImage ? [primaryImage] : [],
          source: "erp",
          isActive: totalQty > 0,
          isNewArrival: Boolean(ecom?.isNewArrival),
          occasion: [],
          blouseIncluded: false,
          dimensions: {},
          tags: [],
        };

        const hydrated = await this.hydrate([product]);
        return hydrated[0] ?? product;
      }

      // 2. Fallback: Try parent ecommerceproduct directly
      const fallbackEcom = ecom ?? (await db.collection(ERP_BARCODE_COLLECTIONS.ecommerceProducts).findOne({
        isPublished: true,
        $or: [
          { barcode: upperSku },
          { publishedBarcodes: upperSku },
          { ecommItemCode: upperSku },
        ],
      }));

      if (fallbackEcom) {
        const barcodes = Array.isArray(fallbackEcom.publishedBarcodes) && fallbackEcom.publishedBarcodes.length
          ? (fallbackEcom.publishedBarcodes as string[])
          : [String(fallbackEcom.barcode ?? "")].filter(Boolean);

        const inStockLabels = await db.collection(ERP_BARCODE_COLLECTIONS.labels).find(
          { [B.barcode]: { $in: barcodes }, [B.status]: "IN_STOCK" },
          {
            projection: {
              [B.barcode]: 1,
              [B.qty]: 1,
              [B.retailPrice]: 1,
              [B.offerPrice]: 1,
              [B.printDescription]: 1,
              [B.itemName]: 1,
              [B.description]: 1,
              [B.uom]: 1,
              [B.uomType]: 1,
              imageUrl: 1,
              image: 1,
              filePath: 1,
            },
            limit: 20,
          }
        ).toArray();

        const specificLabel = inStockLabels.find((l) => String(l[B.barcode]).toUpperCase() === upperSku);
        const totalQty = specificLabel
          ? (Number(specificLabel[B.qty]) || 1)
          : inStockLabels.reduce((sum, l) => sum + (Number(l[B.qty]) || 0), 0);

        const targetLabel = specificLabel || inStockLabels.find((l) => l[B.retailPrice]) || inStockLabels[0];
        const mrp = (targetLabel && Number(targetLabel[B.retailPrice])) || Number(fallbackEcom.barcodePriceOverride) || 0;
        const offer: number | null = targetLabel && Number(targetLabel[B.offerPrice]) ? Number(targetLabel[B.offerPrice]) : null;
        const sellingPrice = offer && offer > 0 && offer < mrp ? offer : mrp;

        const primaryImage: string | undefined = resolvePrimaryProductImage(cleanSku, targetLabel, fallbackEcom.image);
        const uom = targetLabel?.[B.uom] || targetLabel?.[B.uomType] || "Pc";
        const uomType = targetLabel?.[B.uomType] || targetLabel?.[B.uom] || "PC";

        const slugName = (fallbackEcom.displayName || fallbackEcom.ecommItemCode || "product").toLowerCase().replace(/[^a-z0-9]+/g, "-");
        const slug = `${slugName}-${cleanSku.toLowerCase()}`.replace(/^-+|-+$/g, "");

        const labelName = targetLabel?.[B.printDescription] || targetLabel?.[B.itemName] || targetLabel?.[B.description];
        const name = labelName || fallbackEcom.displayName || fallbackEcom.ecommItemCode || "Woven Essence Product";
        const description = fallbackEcom.printDescriptionOverride || targetLabel?.[B.printDescription] || targetLabel?.[B.description] || fallbackEcom.displayName || "";

        const product: Product = {
          id: String(fallbackEcom._id),
          sku: cleanSku,
          barcode: cleanSku,
          name,
          description,
          category: fallbackEcom.productType || "Sarees",
          subCategory: fallbackEcom.productType,
          uom,
          uomType,
          slug,
          pricing: {
            mrp,
            sellingPrice,
            discountPercent: mrp > sellingPrice ? Math.round(((mrp - sellingPrice) / mrp) * 100) : 0,
            gstPercent: Number(targetLabel?.[B.gstPercent]) || 5,
            currency: "INR",
          },
          stock: {
            qty: totalQty,
            status: totalQty <= 0 ? "out_of_stock" : totalQty <= 3 ? "low_stock" : "in_stock",
          },
          images: primaryImage ? [primaryImage] : [],
          source: "erp",
          isActive: totalQty > 0,
          isNewArrival: Boolean(fallbackEcom.isNewArrival),
          occasion: [],
          blouseIncluded: false,
          dimensions: {},
          tags: [],
        };

        const hydrated = await this.hydrate([product]);
        return hydrated[0] ?? product;
      }

      return null;
    };

    if (options?.skipCache) {
      return fetchFresh();
    }
    return cached(`erp:sku:${upperSku}`, 60_000, fetchFresh);
  }

  private async erpGetBySkus(skus: string[], options?: { skipCache?: boolean }): Promise<Product[]> {
    if (!skus.length) return [];
    const upperSkus = [...new Set(skus.map((s) => String(s).trim().toUpperCase()).filter(Boolean))];
    const fetchFresh = async () => {
      const conn = await this.conn();
      if (!conn.db) return [];
      const db = conn.db;

      // 1. Batched indexed query for all barcodeLabels at once (~40-60ms)
      const labels = await db.collection(ERP_BARCODE_COLLECTIONS.labels).find(
        { [B.barcode]: { $in: upperSkus } },
        {
          projection: {
            [B.barcode]: 1,
            [B.itemCode]: 1,
            [B.itemName]: 1,
            [B.printDescription]: 1,
            [B.description]: 1,
            [B.qty]: 1,
            [B.qtyText]: 1,
            [B.status]: 1,
            [B.retailPrice]: 1,
            [B.offerPrice]: 1,
            [B.gstPercent]: 1,
            [B.uom]: 1,
            [B.uomType]: 1,
            imageUrl: 1,
            image: 1,
            filePath: 1,
            itemId: 1,
            businessId: 1,
          },
        }
      ).toArray();

      const labelsByBarcode = new Map<string, AnyDoc[]>();
      for (const l of labels) {
        const b = String(l[B.barcode] ?? "").toUpperCase();
        if (!labelsByBarcode.has(b)) labelsByBarcode.set(b, []);
        labelsByBarcode.get(b)!.push(l);
      }

      // 2. Batched indexed query for parent ecommerceProducts at once (~40ms)
      const ecoms = await db.collection(ERP_BARCODE_COLLECTIONS.ecommerceProducts).find(
        {
          isPublished: true,
          $or: [
            { publishedBarcodes: { $in: upperSkus } },
            { barcode: { $in: upperSkus } },
            { ecommItemCode: { $in: upperSkus } },
          ],
        },
        {
          projection: {
            displayName: 1,
            ecommItemCode: 1,
            productType: 1,
            printDescriptionOverride: 1,
            isNewArrival: 1,
            publishedBarcodes: 1,
            barcode: 1,
            image: 1,
          },
        }
      ).toArray();

      const ecomByBarcode = new Map<string, AnyDoc>();
      for (const e of ecoms) {
        const bList = Array.isArray(e.publishedBarcodes) && e.publishedBarcodes.length
          ? (e.publishedBarcodes as string[])
          : [String(e.barcode ?? "")];
        for (const b of bList) {
          ecomByBarcode.set(String(b).toUpperCase(), e);
        }
        if (e.ecommItemCode) ecomByBarcode.set(String(e.ecommItemCode).toUpperCase(), e);
      }

      const products: Product[] = [];
      for (const sku of skus) {
        const upper = sku.trim().toUpperCase();
        const bLabels = labelsByBarcode.get(upper) ?? [];
        const ecom = ecomByBarcode.get(upper);

        if (!bLabels.length) {
          const fallback = await this.erpGetBySku(sku, options);
          if (fallback) products.push(fallback);
          continue;
        }

        const label = bLabels.find((l) => (Number(l[B.qty]) || 0) > 0) || bLabels.find((l) => l[B.status] === "IN_STOCK") || bLabels[0];
        const totalQty = bLabels.reduce((sum, l) => sum + (l[B.status] === "IN_STOCK" ? (Number(l[B.qty]) || Number(l[B.qtyText]) || 0) : 0), 0);

        const mrp = (label && Number(label[B.retailPrice])) || Number(ecom?.barcodePriceOverride) || 0;
        const offer = label && Number(label[B.offerPrice]) ? Number(label[B.offerPrice]) : null;
        const sellingPrice = offer && offer > 0 && offer < mrp ? offer : mrp;

        const labelName = label?.[B.printDescription] || label?.[B.itemName] || label?.[B.description];
        const name = labelName || ecom?.displayName || ecom?.ecommItemCode || sku;
        const description = ecom?.printDescriptionOverride || label?.[B.printDescription] || label?.[B.description] || name;

        const primaryImage = resolvePrimaryProductImage(sku, label, ecom?.image);
        const uom = label?.[B.uom] || label?.[B.uomType] || "Pc";
        const uomType = label?.[B.uomType] || label?.[B.uom] || "PC";
        const slugName = (ecom?.displayName || ecom?.ecommItemCode || "product").toLowerCase().replace(/[^a-z0-9]+/g, "-");
        const slug = `${slugName}-${sku.toLowerCase()}`.replace(/^-+|-+$/g, "");

        products.push({
          id: String(ecom?._id || label?._id || sku),
          sku,
          barcode: sku,
          name,
          description,
          category: ecom?.productType || label?.[B.itemName] || "Sarees",
          subCategory: ecom?.productType || label?.[B.itemName] || "Sarees",
          uom,
          uomType,
          slug,
          pricing: {
            mrp,
            sellingPrice,
            discountPercent: mrp > sellingPrice ? Math.round(((mrp - sellingPrice) / mrp) * 100) : 0,
            gstPercent: Number(label?.[B.gstPercent]) || 5,
            currency: "INR",
          },
          stock: {
            qty: totalQty,
            status: totalQty <= 0 ? "out_of_stock" : totalQty <= 3 ? "low_stock" : "in_stock",
          },
          images: primaryImage ? [primaryImage] : [],
          source: "erp",
          isActive: totalQty > 0,
          isNewArrival: Boolean(ecom?.isNewArrival),
          occasion: [],
          blouseIncluded: false,
          dimensions: {},
          tags: [],
        });
      }

      return this.hydrate(products);
    };

    if (options?.skipCache) {
      return fetchFresh();
    }
    return cached(`erp:skus:${upperSkus.sort().join(",")}`, 60_000, fetchFresh);
  }

  private async erpGetBySlug(slug: string, options?: { skipCache?: boolean }): Promise<Product | null> {
    if (!slug) return null;
    const fetchFresh = async () => {
      // Check ProductWebMeta first
      const Meta = await this.Meta();
      const meta = (await Meta.findOne({ slug }).lean()) as ProductWebMetaDoc | null;
      if (meta?.sku) {
        return this.erpGetBySku(meta.sku, options);
      }

      // Try candidate SKUs derived from slug
      for (const candidate of skuCandidatesFromSlug(slug)) {
        const prod = await this.erpGetBySku(candidate, options);
        if (prod) return prod;
      }

      // Try finding by slug on ecommerceproduct directly
      const conn = await this.conn();
      if (conn.db) {
        const ecom = await conn.db.collection(ERP_BARCODE_COLLECTIONS.ecommerceProducts).findOne({
          slug,
          isPublished: true,
        });
        if (ecom) {
          const sku = String(ecom.barcode || ecom.ecommItemCode || "");
          if (sku) return this.erpGetBySku(sku, options);
        }
      }

      return null;
    };

    if (options?.skipCache) {
      return fetchFresh();
    }
    return cached(`erp:slug:${slug}`, 60_000, fetchFresh);
  }

  /* ---------- public API ---------- */

  async list(params: ProductListParams): Promise<Paginated<ProductCard>> {
    if (await this.isErpMode()) {
      if (!params.q?.trim()) {
        const cacheKey = `erp:list:${params.category ?? "all"}:${params.page ?? 1}:${params.limit ?? 24}:${params.sort ?? "default"}:${params.inStock ? 1 : 0}:${params.priceMin ?? ""}:${params.priceMax ?? ""}`;
        return cached(cacheKey, 60_000, () => this.erpList(params));
      }
      return this.erpList(params);
    }

    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, params.limit ?? 24));
    const match = await this.fullMatch(params);
    if (!match) return { items: [], total: 0, page, limit, pages: 1 };

    const M = await this.M();
    const [docs, total] = await Promise.all([
      M.find(match)
        .sort(productSort(params.sort ?? "featured"))
        .skip((page - 1) * limit)
        .limit(limit)
        .lean<AnyDoc[]>(),
      M.countDocuments(match),
    ]);

    // If mock collection returned 0 but query exists, fallback to ERP catalog check
    if (total === 0 && params.q?.trim()) {
      const erpResult = await this.erpList(params);
      if (erpResult.total > 0) return erpResult;
    }

    const products = await this.hydrate(docs);
    return { items: products.map(toProductCard), total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) };
  }

  async facets(params: ProductListParams): Promise<ProductFacets> {
    if (await this.isErpMode()) {
      return this.erpFacets(params);
    }

    const empty: ProductFacets = {
      groups: [],
      price: { min: 0, max: 0 },
      availability: { inStock: 0, outOfStock: 0 },
      discount: [],
      total: 0,
    };
    const base = await this.baseMatch(params);
    if (!base) return empty;

    const facetStage: Record<string, any[]> = {};
    for (const key of FILTER_KEYS) {
      const field = PRODUCT_FILTER_FIELDS[key];
      facetStage[key] = [
        { $match: this.facetMatch(params, key) },
        { $project: { v: { $cond: [{ $isArray: `$${field}` }, `$${field}`, [`$${field}`]] } } },
        { $unwind: "$v" },
        { $match: { v: { $nin: [null, ""] } } },
        { $group: { _id: "$v", count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
        { $limit: 80 },
      ];
    }
    const all = this.facetMatch(params);
    facetStage.price = [
      { $match: all },
      { $group: { _id: null, min: { $min: `$${P.sellingPrice}` }, max: { $max: `$${P.sellingPrice}` } } },
    ];
    facetStage.availability = [
      { $match: all },
      { $group: { _id: { $gt: [{ $ifNull: [`$${P.stockQty}`, 0] }, 0] }, count: { $sum: 1 } } },
    ];
    facetStage.discount = [
      { $match: all },
      { $project: { d: { $ifNull: [`$${P.discountPercent}`, 0] } } },
      {
        $group: {
          _id: null,
          ...Object.fromEntries(
            DISCOUNT_BUCKETS.map((b) => [`d${b}`, { $sum: { $cond: [{ $gte: ["$d", b] }, 1, 0] } }]),
          ),
        },
      },
    ];
    facetStage.total = [{ $match: all }, { $count: "n" }];

    const M = await this.M();
    const [res] = await M.aggregate([{ $match: base }, { $facet: facetStage }]);
    if (!res || !res.total?.[0]?.n) {
      if (params.q?.trim()) return this.erpFacets(params);
      if (!res) return empty;
    }

    const groups: FacetGroup[] = FILTER_KEYS.map((key) => ({
      key,
      label: FACET_LABELS[key],
      options: (res[key] as { _id: string; count: number }[]).map((o) => ({
        value: String(o._id),
        label: String(o._id),
        count: o.count,
        swatch: key === "color" ? SWATCHES[String(o._id).toLowerCase()] ?? "#CCC5B5" : undefined,
      })),
    })).filter((g) => g.options.length > 0);

    const price = res.price?.[0] ?? { min: 0, max: 0 };
    const availability = { inStock: 0, outOfStock: 0 };
    for (const a of res.availability as { _id: boolean; count: number }[]) {
      if (a._id) availability.inStock += a.count;
      else availability.outOfStock += a.count;
    }
    const d = res.discount?.[0] ?? {};
    return {
      groups,
      price: { min: price.min ?? 0, max: price.max ?? 0 },
      availability,
      discount: DISCOUNT_BUCKETS.map((b) => ({ minPercent: b, count: d[`d${b}`] ?? 0 })).filter((x) => x.count > 0),
      total: res.total?.[0]?.n ?? 0,
    };
  }

  async getBySlug(slug: string, options?: { skipCache?: boolean }): Promise<Product | null> {
    if (await this.isErpMode()) {
      return this.erpGetBySlug(slug, options);
    }

    const Meta = await this.Meta();
    const meta = (await Meta.findOne({ slug }).lean()) as ProductWebMetaDoc | null;
    const M = await this.M();
    if (meta?.sku) {
      const doc = await M.findOne({ ...ACTIVE_PRODUCT_QUERY, [P.sku]: meta.sku }).lean<AnyDoc>();
      if (doc) return (await this.hydrate([doc]))[0];
      return this.erpGetBySku(meta.sku, options);
    }
    // Fallback: the SKU is encoded at the tail of the derived slug.
    for (const candidate of skuCandidatesFromSlug(slug)) {
      const doc = await M.findOne({
        ...ACTIVE_PRODUCT_QUERY,
        [P.sku]: new RegExp(`^${escapeRegex(candidate)}$`, "i"),
      }).lean<AnyDoc>();
      if (doc) return (await this.hydrate([doc]))[0];
    }

    return this.erpGetBySlug(slug, options);
  }

  async getBySku(sku: string, options?: { skipCache?: boolean }): Promise<Product | null> {
    if (await this.isErpMode()) {
      return this.erpGetBySku(sku, options);
    }

    const M = await this.M();
    const doc = await M.findOne({ [P.sku]: sku }).lean<AnyDoc>();
    if (doc) return (await this.hydrate([doc]))[0];
    return this.erpGetBySku(sku, options);
  }

  async getBySkus(skus: string[], options?: { skipCache?: boolean }): Promise<Product[]> {
    if (!skus.length) return [];
    if (await this.isErpMode()) {
      return this.erpGetBySkus(skus, options);
    }

    const M = await this.M();
    const docs = await M.find({ [P.sku]: { $in: skus } }).lean<AnyDoc[]>();
    const products = await this.hydrate(docs);
    const order = new Map(skus.map((s, i) => [s, i]));
    const foundSkus = new Set(products.map((p) => p.sku));
    const missingSkus = skus.filter((sku) => !foundSkus.has(sku));

    if (missingSkus.length) {
      const fallbackItems = await this.erpGetBySkus(missingSkus, options);
      products.push(...fallbackItems);
    }

    return products.sort((a, b) => (order.get(a.sku) ?? 0) - (order.get(b.sku) ?? 0));
  }

  async search(q: string, limit = 8): Promise<ProductCard[]> {
    const res = await this.list({ q, limit, sort: "featured", inStock: true });
    return res.items;
  }

  async related(product: Product, limit = 8): Promise<ProductCard[]> {
    if (await this.isErpMode()) {
      const res = await this.erpList({ category: product.category, inStock: true, limit: limit + 1 });
      return res.items.filter((item) => item.sku !== product.sku).slice(0, limit);
    }

    const M = await this.M();
    const or: FilterQuery<AnyDoc>[] = [];
    if (product.fabric) or.push({ [P.fabric]: product.fabric });
    if (product.motif) or.push({ [P.motif]: product.motif });
    if (product.category) or.push({ [P.category]: product.category });
    if (!or.length) return [];
    const docs = await M.find({ $and: [ACTIVE_PRODUCT_QUERY, { [P.stockQty]: { $gt: 0 } }, { [P.sku]: { $ne: product.sku } }, { $or: or }] })
      .sort(productSort("featured"))
      .limit(limit)
      .lean<AnyDoc[]>();
    return (await this.hydrate(docs)).map(toProductCard);
  }

  async distinctValues(key: FilterKey, categorySlug?: string): Promise<string[]> {
    const conn = await this.conn();
    if (conn.db && (await this.isErpMode())) {
      try {
        const collName = `by${key.toLowerCase()}`;
        const items = await conn.db.collection(collName).find({ isActive: { $ne: false } }).toArray();
        if (items.length) {
          return items.map((i) => String(i.name ?? "")).filter(Boolean).sort();
        }
      } catch {
        // fallback
      }
    }

    const base = await this.baseMatch({ category: categorySlug });
    if (!base) return [];
    const M = await this.M();
    const values = await M.distinct(PRODUCT_FILTER_FIELDS[key], base);
    return values.map((v: unknown) => String(v)).filter(Boolean).sort();
  }

  async stockSummary(lowStockThreshold = this.lowStockThreshold) {
    const conn = await this.conn();
    if (conn.db && (await this.isErpMode())) {
      const [row] = await conn.db.collection(ERP_BARCODE_COLLECTIONS.labels).aggregate([
        { $match: { businessId: DEFAULT_BUSINESS_ID } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            outOfStock: { $sum: { $cond: [{ $or: [{ $ne: ["$status", "IN_STOCK"] }, { $lte: [{ $ifNull: ["$qtyNum", 0] }, 0] }] }, 1, 0] } },
            lowStock: { $sum: { $cond: [{ $and: [{ $eq: ["$status", "IN_STOCK"] }, { $gt: [{ $ifNull: ["$qtyNum", 0] }, 0] }, { $lte: [{ $ifNull: ["$qtyNum", 0] }, lowStockThreshold] }] }, 1, 0] } },
          },
        },
      ]).toArray();
      const total = row?.total ?? 0;
      const outOfStock = row?.outOfStock ?? 0;
      const lowStock = row?.lowStock ?? 0;
      return { total, inStock: total - outOfStock, lowStock, outOfStock };
    }

    const M = await this.M();
    const [row] = await M.aggregate([
      { $match: ACTIVE_PRODUCT_QUERY },
      { $project: { q: { $ifNull: [`$${P.stockQty}`, 0] } } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          outOfStock: { $sum: { $cond: [{ $lte: ["$q", 0] }, 1, 0] } },
          lowStock: { $sum: { $cond: [{ $and: [{ $gt: ["$q", 0] }, { $lte: ["$q", lowStockThreshold] }] }, 1, 0] } },
        },
      },
    ]);
    const total = row?.total ?? 0;
    const outOfStock = row?.outOfStock ?? 0;
    const lowStock = row?.lowStock ?? 0;
    return { total, inStock: total - outOfStock, lowStock, outOfStock };
  }
}
