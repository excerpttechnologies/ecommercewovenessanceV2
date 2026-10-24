/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Connection } from "mongoose";
import {
  BannerModel,
  CmsPageModel,
  CollectionModel,
  HomepageSectionModel,
  MenuItemModel,
  SiteSettingsModel,
  TestimonialModel,
  type BannerDoc,
  type CmsPageDoc,
  type CollectionDoc,
  type HomepageSectionDoc,
  type MenuItemDoc,
  type SiteSettingsDoc,
  type TestimonialDoc,
} from "@/models/web/content.models";
import { FILTER_KEYS, type FilterKey, type ProductListParams } from "@/domain/types";
import { DEFAULT_MENU } from "@/lib/default-menu";
import { isClassificationOptionDeleted } from "@/lib/admin/product-classification-options";

export interface MenuNode {
  id: string;
  label: string;
  kind: "top" | "group" | "link";
  href?: string;
  image?: string;
  badge?: string;
  children: MenuNode[];
}

export interface SiteSettings extends Omit<SiteSettingsDoc, "key"> {
  id: string;
}

/**
 * Everything the storefront chrome needs that is NOT ERP data: settings,
 * mega-menu, banners, homepage layout, curated collections, CMS pages.
 */
export class SiteRepository {
  constructor(private readonly conn: () => Promise<Connection>) {}

  async settings(): Promise<SiteSettings> {
    const M = SiteSettingsModel(await this.conn());
    let doc = await M.findOne({ key: "default" }).lean();
    if (!doc) doc = (await M.create({ key: "default" })).toObject();
    const { _id, key: _key, ...rest } = doc as any;
    return { id: String(_id), ...rest };
  }

  async menu(): Promise<MenuNode[]> {
    const conn = await this.conn();
    const M = MenuItemModel(conn);
    const items = (await M.find({ isActive: true }).sort({ sortOrder: 1 }).lean()) as MenuItemDoc[];
    const nodes = new Map<string, MenuNode>();
    for (const it of items) {
      nodes.set(String(it._id), {
        id: String(it._id),
        label: it.label,
        kind: it.kind,
        href: resolveHref(it),
        image: it.image ?? undefined,
        badge: it.badge ?? undefined,
        children: [],
      });
    }
    const roots: MenuNode[] = [];
    for (const it of items) {
      const node = nodes.get(String(it._id))!;
      const parent = it.parentId ? nodes.get(String(it.parentId)) : undefined;
      if (parent) parent.children.push(node);
      else roots.push(node);
    }

    const menu = roots.length ? roots : structuredClone(DEFAULT_MENU);
    const settings = await SiteSettingsModel(conn)
      .findOne({ key: "default" }, { classificationOptions: 1, deletedClassificationOptions: 1 })
      .lean();
    const deletedOptions = settings?.deletedClassificationOptions ?? [];
    for (const option of deletedOptions) {
      const top = menu.find((node) => normalizeMenuLabel(node.label) === normalizeMenuLabel(option.productType));
      const group = top?.children.find((node) =>
        node.kind === "group" && normalizeMenuLabel(node.label) === normalizeMenuLabel(option.field));
      if (group) {
        group.children = group.children.filter((node) => node.label.toLowerCase() !== option.value.toLowerCase());
      }
    }
    for (const option of settings?.classificationOptions ?? []) {
      if (isClassificationOptionDeleted(deletedOptions, option.productType, option.field, option.value)) continue;
      const top = menu.find((node) => normalizeMenuLabel(node.label) === normalizeMenuLabel(option.productType));
      const group = top?.children.find((node) =>
        node.kind === "group" && normalizeMenuLabel(node.label) === normalizeMenuLabel(option.field));
      if (!group || group.children.some((node) => node.label.toLocaleLowerCase() === option.value.toLocaleLowerCase())) continue;

      const categorySlug = top?.href?.match(/^\/collections\/([^/?#]+)/)?.[1] ?? menuCategorySlug(option.productType);
      const filterKey = option.field === "By colour" ? "color" : option.field.slice(3).toLocaleLowerCase();
      group.children.push({
        id: `${group.id}-custom-${group.children.length + 1}`,
        label: option.value,
        kind: "link",
        href: `/collections/${categorySlug}?${filterKey}=${encodeURIComponent(option.value)}`,
        children: [],
      });
    }
    return menu;
  }

  async banners(placement: BannerDoc["placement"]): Promise<BannerDoc[]> {
    const M = BannerModel(await this.conn());
    const now = new Date();
    return (await M.find({
      placement,
      isActive: true,
      $and: [
        { $or: [{ startsAt: null }, { startsAt: { $exists: false } }, { startsAt: { $lte: now } }] },
        { $or: [{ endsAt: null }, { endsAt: { $exists: false } }, { endsAt: { $gte: now } }] },
      ],
    })
      .sort({ sortOrder: 1 })
      .lean()) as BannerDoc[];
  }

  async homepageSections(): Promise<HomepageSectionDoc[]> {
    const M = HomepageSectionModel(await this.conn());
    return (await M.find({ isVisible: true }).sort({ sortOrder: 1 }).lean()) as HomepageSectionDoc[];
  }

  async homepageSection(key: string): Promise<HomepageSectionDoc | null> {
    const M = HomepageSectionModel(await this.conn());
    return (await M.findOne({ key }).lean()) as HomepageSectionDoc | null;
  }

  async collections(opts: { featuredOnly?: boolean } = {}): Promise<CollectionDoc[]> {
    const M = CollectionModel(await this.conn());
    const q: any = { isActive: true };
    if (opts.featuredOnly) q.isFeatured = true;
    return (await M.find(q).sort({ sortOrder: 1 }).lean()) as CollectionDoc[];
  }

  async collectionBySlug(slug: string): Promise<CollectionDoc | null> {
    const M = CollectionModel(await this.conn());
    return (await M.findOne({ slug, isActive: true }).lean()) as CollectionDoc | null;
  }

  async testimonials(): Promise<TestimonialDoc[]> {
    const M = TestimonialModel(await this.conn());
    return (await M.find({ isActive: true }).sort({ sortOrder: 1 }).lean()) as TestimonialDoc[];
  }

  async page(slug: string): Promise<CmsPageDoc | null> {
    const M = CmsPageModel(await this.conn());
    return (await M.findOne({ slug, isPublished: true }).lean()) as CmsPageDoc | null;
  }

  async pages(type?: CmsPageDoc["type"]): Promise<CmsPageDoc[]> {
    const M = CmsPageModel(await this.conn());
    return (await M.find({ isPublished: true, ...(type ? { type } : {}) })
      .sort({ sortOrder: 1 })
      .lean()) as CmsPageDoc[];
  }
}

function normalizeMenuLabel(label: string): string {
  return label.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function menuCategorySlug(productType: string): string {
  if (productType === "PLAIN FABRICS") return "plain-fabrics";
  return productType.toLocaleLowerCase();
}

/** Translate a curated collection's rules into repository list params. */
export function collectionToListParams(col: CollectionDoc): ProductListParams {
  if (col.type === "manual") return { skus: col.skus ?? [] };
  const params: ProductListParams = { filters: {} };
  for (const rule of col.rules ?? []) {
    const key = rule.key as string;
    const value = rule.value;
    if ((FILTER_KEYS as readonly string[]).includes(key)) {
      const values = Array.isArray(value) ? value.map(String) : [String(value)];
      params.filters![key as FilterKey] = values;
    } else if (key === "category") params.category = String(value);
    else if (key === "priceMin") params.priceMin = Number(value);
    else if (key === "priceMax") params.priceMax = Number(value);
    else if (key === "discountMin") params.discountMin = Number(value);
    else if (key === "newArrivals") params.newArrivals = Boolean(value);
    else if (key === "tags") params.tags = Array.isArray(value) ? value.map(String) : [String(value)];
    else if (key === "q") params.q = String(value);
  }
  return params;
}

function resolveHref(it: MenuItemDoc): string | undefined {
  if (it.href) return it.href;
  if (it.categorySlug && it.filterKey && it.filterValue)
    return `/collections/${it.categorySlug}?${encodeURIComponent(it.filterKey)}=${encodeURIComponent(it.filterValue)}`;
  if (it.categorySlug) return `/collections/${it.categorySlug}`;
  return undefined;
}
