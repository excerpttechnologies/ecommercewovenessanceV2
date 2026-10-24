/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Connection, FilterQuery } from "mongoose";
import { getWebConnection, toObjectIdOrString } from "@/lib/db";
import {
  ACTIVE_PRODUCT_QUERY,
  DEFAULT_LOW_STOCK_THRESHOLD,
  PRODUCT_FIELDS as P,
  PRODUCT_FILTER_FIELDS,
  TRUTHY_VALUES,
  categoryRefValue,
  mapProduct,
  productSort,
  skuCandidatesFromSlug,
  toProductCard,
} from "@/lib/erp-mapping";
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

  /* ---------- query building ---------- */

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
        },
      };
    });
  }

  /* ---------- public API ---------- */

  async list(params: ProductListParams): Promise<Paginated<ProductCard>> {
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
    const products = await this.hydrate(docs);
    return { items: products.map(toProductCard), total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) };
  }

  async facets(params: ProductListParams): Promise<ProductFacets> {
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
        { $match: this.facetMatch(params, key) }, // counts ignore the facet's own selection
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
    if (!res) return empty;

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
    const Meta = await this.Meta();
    const meta = (await Meta.findOne({ slug }).lean()) as ProductWebMetaDoc | null;
    const M = await this.M();
    if (meta?.sku) {
      const doc = await M.findOne({ ...ACTIVE_PRODUCT_QUERY, [P.sku]: meta.sku }).lean<AnyDoc>();
      return doc ? (await this.hydrate([doc]))[0] : null;
    }
    // Fallback: the SKU is encoded at the tail of the derived slug.
    for (const candidate of skuCandidatesFromSlug(slug)) {
      const doc = await M.findOne({
        ...ACTIVE_PRODUCT_QUERY,
        [P.sku]: new RegExp(`^${escapeRegex(candidate)}$`, "i"),
      }).lean<AnyDoc>();
      if (doc) return (await this.hydrate([doc]))[0];
    }
    return null;
  }

  async getBySku(sku: string): Promise<Product | null> {
    const M = await this.M();
    const doc = await M.findOne({ [P.sku]: sku }).lean<AnyDoc>();
    return doc ? (await this.hydrate([doc]))[0] : null;
  }

  async getBySkus(skus: string[]): Promise<Product[]> {
    if (!skus.length) return [];
    const M = await this.M();
    const docs = await M.find({ [P.sku]: { $in: skus } }).lean<AnyDoc[]>();
    const products = await this.hydrate(docs);
    const order = new Map(skus.map((s, i) => [s, i]));
    return products.sort((a, b) => (order.get(a.sku) ?? 0) - (order.get(b.sku) ?? 0));
  }

  async search(q: string, limit = 8): Promise<ProductCard[]> {
    const res = await this.list({ q, limit, sort: "featured" });
    return res.items;
  }

  async related(product: Product, limit = 8): Promise<ProductCard[]> {
    const M = await this.M();
    const or: FilterQuery<AnyDoc>[] = [];
    if (product.fabric) or.push({ [P.fabric]: product.fabric });
    if (product.motif) or.push({ [P.motif]: product.motif });
    if (product.category) or.push({ [P.category]: product.category });
    if (!or.length) return [];
    const docs = await M.find({ $and: [ACTIVE_PRODUCT_QUERY, { [P.sku]: { $ne: product.sku } }, { $or: or }] })
      .sort(productSort("featured"))
      .limit(limit)
      .lean<AnyDoc[]>();
    return (await this.hydrate(docs)).map(toProductCard);
  }

  async distinctValues(key: FilterKey, categorySlug?: string): Promise<string[]> {
    const base = await this.baseMatch({ category: categorySlug });
    if (!base) return [];
    const M = await this.M();
    const values = await M.distinct(PRODUCT_FILTER_FIELDS[key], base);
    return values.map((v: unknown) => String(v)).filter(Boolean).sort();
  }

  async stockSummary(lowStockThreshold = this.lowStockThreshold) {
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
