import type { Connection } from "mongoose";
import { ACTIVE_CATEGORY_QUERY, CATEGORY_FIELDS as C, mapCategory } from "@/lib/erp-mapping";
import { CategoryModel } from "@/models/erp/category.model";
import type { AnyDoc } from "@/models/_util";
import type { Category, CategoryNode } from "@/domain/types";
import type { CategoryRepository } from "../types";

const CACHE_TTL_MS = 30_000;

/**
 * Categories are a small collection, so we load them once, cache briefly and
 * resolve slugs in memory. This also works for ERPs that have no slug field
 * (mapCategory derives one from the name).
 */
export class MongoCategoryRepository implements CategoryRepository {
  private cache?: { at: number; items: Category[] };

  constructor(private readonly conn: () => Promise<Connection>) {}

  async list(): Promise<Category[]> {
    if (this.cache && Date.now() - this.cache.at < CACHE_TTL_MS) return this.cache.items;
    const M = CategoryModel(await this.conn());
    const docs = await M.find(ACTIVE_CATEGORY_QUERY)
      .sort({ [C.sortOrder]: 1, [C.name]: 1 })
      .lean<AnyDoc[]>();
    const items = docs.map(mapCategory);
    this.cache = { at: Date.now(), items };
    return items;
  }

  async getBySlug(slug: string): Promise<Category | null> {
    const all = await this.list();
    return all.find((c) => c.slug === slug) ?? null;
  }

  async getById(id: string): Promise<Category | null> {
    const all = await this.list();
    return all.find((c) => c.id === id) ?? null;
  }

  async tree(): Promise<CategoryNode[]> {
    const all = await this.list();
    const nodes = new Map<string, CategoryNode>(all.map((c) => [c.id, { ...c, children: [] }]));
    const roots: CategoryNode[] = [];
    for (const node of nodes.values()) {
      const parent = node.parentId ? nodes.get(node.parentId) : undefined;
      if (parent) parent.children.push(node);
      else roots.push(node);
    }
    const sortRec = (list: CategoryNode[]) => {
      list.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
      list.forEach((n) => sortRec(n.children));
    };
    sortRec(roots);
    return roots;
  }

  invalidate() {
    this.cache = undefined;
  }
}
