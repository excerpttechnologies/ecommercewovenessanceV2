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
  skuCandidatesFromSlug,
  toProductCard,
} from "@/lib/erp-mapping";
import { barcodeImageUrl } from "@/lib/erp-images";
import { cached } from "@/lib/cache";
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
  private async isErpMode(): Promise<boolean> {
    if (this.source === "erp") return true;
    try {
      const c = await this.conn();
      if (!c.db) return false;
      const collections = await c.db.listCollections({ name: ERP_BARCODE_COLLECTIONS.ecommerceProducts }).toArray();
      return collections.length > 0;
    } catch {
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

  private async hydrate(docs: AnyDoc[]): Promise<Product[]> {
    const products = docs.map((d) => mapProduct(d, { source: this.source, lowStockThreshold: this.lowStockThreshold }));
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
      const labelMatches = await db.collection(ERP_BARCODE_COLLECTIONS.labels).find({
        $or: [
          { [B.barcode]: upperQuery },
          { [B.barcode]: queryRx },
          { [B.oldBarcode]: upperQuery },
          { [B.oldBarcode]: queryRx },
          { [B.itemCode]: upperQuery },
          { [B.itemCode]: queryRx },
          { [B.itemName]: queryRx },
          { [B.description]: queryRx },
          { [B.printDescription]: queryRx },
          { [B.designNo]: queryRx },
        ],
      }, { projection: { [B.barcode]: 1 } }).limit(200).toArray();

      matchingBarcodes = [...new Set(labelMatches.map((l) => String(l[B.barcode] ?? "")).filter(Boolean))];
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

      const parentInStockLabels: AnyDoc[] = [];
      for (const b of barcodes) {
        const found = labelsByBarcode.get(b);
        if (found) parentInStockLabels.push(...found);
      }

      const totalQty = parentInStockLabels.reduce((sum, l) => sum + (Number(l[B.qty]) || 0), 0);
      if (params.inStock && totalQty <= 0) continue;

      let mrp = Number(p.barcodePriceOverride) || 0;
      let offer: number | null = null;
      if (parentInStockLabels.length > 0) {
        const firstWithPrice = parentInStockLabels.find((l) => l[B.retailPrice]);
        if (firstWithPrice) {
          mrp = Number(firstWithPrice[B.retailPrice]) || mrp;
          offer = Number(firstWithPrice[B.offerPrice]) || null;
        }
      }
      const sellingPrice = offer && offer > 0 && offer < mrp ? offer : mrp;

      if (params.priceMin != null && sellingPrice < params.priceMin) continue;
      if (params.priceMax != null && sellingPrice > params.priceMax) continue;

      let primaryImage: string | undefined = p.image;
      if (!primaryImage && parentInStockLabels.length) {
        primaryImage = parentInStockLabels[0].imageUrl || parentInStockLabels[0].image || parentInStockLabels[0].filePath;
      }
      if (!primaryImage && p.barcode) {
        primaryImage = barcodeImageUrl(p.barcode);
      }

      // If user searched for a specific child barcode that belongs to this product, highlight that barcode
      const activeSku = query && barcodes.includes(upperQuery)
        ? upperQuery
        : (p.barcode || p.ecommItemCode || String(p._id));
      const slugName = (p.displayName || p.ecommItemCode || "product").toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const slug = `${slugName}-${(activeSku || "").toLowerCase()}`.replace(/^-+|-+$/g, "");

      items.push({
        id: String(p._id),
        sku: activeSku,
        name: p.displayName || p.ecommItemCode || "Woven Essence Product",
        category: p.productType || "Sarees",
        subCategory: p.productType,
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
        images: primaryImage ? [primaryImage] : [],
        source: "erp",
        isNewArrival: Boolean(p.isNewArrival),
      });
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

    // 6. Overlay productWebMeta if available
    try {
      const Meta = await this.Meta();
      const metas = (await Meta.find({ sku: { $in: items.map((i) => i.sku) } }).lean()) as ProductWebMetaDoc[];
      const bySku = new Map(metas.map((m) => [m.sku, m]));
      for (const item of items) {
        const m = bySku.get(item.sku);
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

  private async erpGetBySku(sku: string): Promise<Product | null> {
    if (!sku) return null;
    const cleanSku = String(sku).trim();
    const upperSku = cleanSku.toUpperCase();
    const conn = await this.conn();
    if (!conn.db) return null;
    const db = conn.db;

    // 1. Try ecommerceproduct
    const ecom = await db.collection(ERP_BARCODE_COLLECTIONS.ecommerceProducts).findOne({
      isPublished: true,
      $or: [
        { barcode: upperSku },
        { barcode: cleanSku },
        { publishedBarcodes: upperSku },
        { publishedBarcodes: cleanSku },
        { ecommItemCode: upperSku },
        { ecommItemCode: cleanSku },
      ],
    });

    if (ecom) {
      const barcodes = Array.isArray(ecom.publishedBarcodes) && ecom.publishedBarcodes.length
        ? (ecom.publishedBarcodes as string[])
        : [String(ecom.barcode ?? "")].filter(Boolean);

      const inStockLabels = await db.collection(ERP_BARCODE_COLLECTIONS.labels).find({
        [B.barcode]: { $in: barcodes },
        [B.status]: "IN_STOCK",
        businessId: DEFAULT_BUSINESS_ID,
      }).toArray();

      const totalQty = inStockLabels.reduce((sum, l) => sum + (Number(l[B.qty]) || 0), 0);
      let mrp = Number(ecom.barcodePriceOverride) || 0;
      let offer: number | null = null;
      if (inStockLabels.length > 0) {
        const firstWithPrice = inStockLabels.find((l) => l[B.retailPrice]);
        if (firstWithPrice) {
          mrp = Number(firstWithPrice[B.retailPrice]) || mrp;
          offer = Number(firstWithPrice[B.offerPrice]) || null;
        }
      }
      const sellingPrice = offer && offer > 0 && offer < mrp ? offer : mrp;

      let primaryImage: string | undefined = ecom.image;
      if (!primaryImage && inStockLabels.length) {
        primaryImage = inStockLabels[0].imageUrl || inStockLabels[0].image || inStockLabels[0].filePath;
      }
      if (!primaryImage && cleanSku) {
        primaryImage = barcodeImageUrl(cleanSku);
      }

      const slugName = (ecom.displayName || ecom.ecommItemCode || "product").toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const slug = `${slugName}-${cleanSku.toLowerCase()}`.replace(/^-+|-+$/g, "");

      const product: Product = {
        id: String(ecom._id),
        sku: cleanSku,
        barcode: cleanSku,
        name: ecom.displayName || ecom.ecommItemCode || "Woven Essence Product",
        description: ecom.printDescriptionOverride || ecom.displayName || "",
        category: ecom.productType || "Sarees",
        subCategory: ecom.productType,
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
        images: primaryImage ? [primaryImage] : [],
        source: "erp",
        isActive: totalQty > 0,
        isNewArrival: Boolean(ecom.isNewArrival),
        occasion: [],
        blouseIncluded: false,
        dimensions: {},
        tags: [],
      };

      const hydrated = await this.hydrate([product]);
      return hydrated[0] ?? product;
    }

    // 2. Try standalone barcodeLabel
    const label = await db.collection(ERP_BARCODE_COLLECTIONS.labels).findOne({
      businessId: DEFAULT_BUSINESS_ID,
      [B.status]: "IN_STOCK",
      $or: [
        { [B.barcode]: upperSku },
        { [B.barcode]: cleanSku },
        { [B.oldBarcode]: upperSku },
        { [B.oldBarcode]: cleanSku },
        { [B.itemCode]: upperSku },
        { [B.itemCode]: cleanSku },
      ],
    });

    if (label) {
      const mrp = Number(label[B.retailPrice]) || 0;
      const offer = Number(label[B.offerPrice]) || null;
      const sellingPrice = offer && offer > 0 && offer < mrp ? offer : mrp;
      const totalQty = Number(label[B.qty]) || 1;
      const name = label[B.itemName] || label[B.description] || label[B.printDescription] || cleanSku;
      const slugName = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const slug = `${slugName}-${cleanSku.toLowerCase()}`.replace(/^-+|-+$/g, "");
      const image = label.imageUrl || label.image || label.filePath || barcodeImageUrl(cleanSku);

      const product: Product = {
        id: String(label._id),
        sku: cleanSku,
        barcode: cleanSku,
        name,
        description: label[B.printDescription] || label[B.description] || name,
        category: label[B.itemName] || "Sarees",
        subCategory: label[B.itemName] || "Sarees",
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
        images: image ? [image] : [],
        source: "erp",
        isActive: totalQty > 0,
        isNewArrival: false,
        occasion: [],
        blouseIncluded: false,
        dimensions: {},
        tags: [],
      };

      const hydrated = await this.hydrate([product]);
      return hydrated[0] ?? product;
    }

    return null;
  }

  private async erpGetBySlug(slug: string): Promise<Product | null> {
    if (!slug) return null;

    // Check ProductWebMeta first
    const Meta = await this.Meta();
    const meta = (await Meta.findOne({ slug }).lean()) as ProductWebMetaDoc | null;
    if (meta?.sku) {
      return this.erpGetBySku(meta.sku);
    }

    // Try candidate SKUs derived from slug
    for (const candidate of skuCandidatesFromSlug(slug)) {
      const prod = await this.erpGetBySku(candidate);
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
        if (sku) return this.erpGetBySku(sku);
      }
    }

    return null;
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

  async getBySlug(slug: string): Promise<Product | null> {
    if (await this.isErpMode()) {
      return this.erpGetBySlug(slug);
    }

    const Meta = await this.Meta();
    const meta = (await Meta.findOne({ slug }).lean()) as ProductWebMetaDoc | null;
    const M = await this.M();
    if (meta?.sku) {
      const doc = await M.findOne({ ...ACTIVE_PRODUCT_QUERY, [P.sku]: meta.sku }).lean<AnyDoc>();
      if (doc) return (await this.hydrate([doc]))[0];
      return this.erpGetBySku(meta.sku);
    }
    // Fallback: the SKU is encoded at the tail of the derived slug.
    for (const candidate of skuCandidatesFromSlug(slug)) {
      const doc = await M.findOne({
        ...ACTIVE_PRODUCT_QUERY,
        [P.sku]: new RegExp(`^${escapeRegex(candidate)}$`, "i"),
      }).lean<AnyDoc>();
      if (doc) return (await this.hydrate([doc]))[0];
    }

    return this.erpGetBySlug(slug);
  }

  async getBySku(sku: string): Promise<Product | null> {
    if (await this.isErpMode()) {
      return this.erpGetBySku(sku);
    }

    const M = await this.M();
    const doc = await M.findOne({ [P.sku]: sku }).lean<AnyDoc>();
    if (doc) return (await this.hydrate([doc]))[0];
    return this.erpGetBySku(sku);
  }

  async getBySkus(skus: string[]): Promise<Product[]> {
    if (!skus.length) return [];
    if (await this.isErpMode()) {
      const items = await Promise.all(skus.map((sku) => this.erpGetBySku(sku)));
      return items.filter((p): p is Product => p !== null);
    }

    const M = await this.M();
    const docs = await M.find({ [P.sku]: { $in: skus } }).lean<AnyDoc[]>();
    const products = await this.hydrate(docs);
    const order = new Map(skus.map((s, i) => [s, i]));
    const foundSkus = new Set(products.map((p) => p.sku));
    const missingSkus = skus.filter((sku) => !foundSkus.has(sku));

    if (missingSkus.length) {
      const fallbackItems = await Promise.all(missingSkus.map((sku) => this.erpGetBySku(sku)));
      products.push(...fallbackItems.filter((p): p is Product => p !== null));
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
