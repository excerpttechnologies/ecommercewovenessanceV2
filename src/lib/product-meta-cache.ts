/**
 * Process-wide snapshot of the website's product overlay (`productWebMeta`).
 *
 * The storefront reads a small overlay document for every visible barcode (gallery, print
 * description, price override, featured flag, hidden flag). The collection holds a few
 * hundred rows, so loading it once per worker and reusing the Map for every catalog,
 * homepage section and product list removes one MongoDB round-trip per page render.
 *
 * Invalidation: admin product writes call `invalidateProductMetaCache()` (see
 * `lib/cache-invalidation.ts`), which drops the snapshot immediately. TTL + stale window
 * are the safety net for writes made directly in MongoDB.
 */
import type { Connection } from "mongoose";
import { getWebConnection } from "@/lib/db";
import { cachedSWR, invalidateCache } from "@/lib/cache";
import { ProductWebMetaModel, type ProductWebMetaDoc } from "@/models/web/content.models";
import { measureDb } from "@/lib/perf";

export const PRODUCT_META_CACHE_KEY = "web:product-meta:all";
const PRODUCT_META_TTL_MS = 120_000;
const PRODUCT_META_STALE_MS = 300_000;

export type ProductMetaMap = Map<string, ProductWebMetaDoc>;

async function loadProductMeta(conn: Connection): Promise<ProductMetaMap> {
  const docs = (await measureDb(() =>
    ProductWebMetaModel(conn)
      .find({}, { __v: 0 })
      .lean(),
  )) as ProductWebMetaDoc[];
  return new Map(docs.filter((doc) => typeof doc.sku === "string" && doc.sku).map((doc) => [doc.sku, doc]));
}

/** All overlay rows keyed by SKU. Shared by the catalog, homepage and master product repository. */
export function getProductMetaMap(): Promise<ProductMetaMap> {
  return cachedSWR(PRODUCT_META_CACHE_KEY, PRODUCT_META_TTL_MS, PRODUCT_META_STALE_MS, async () =>
    loadProductMeta(await getWebConnection()),
  );
}

/** Barcodes hidden in the website admin (`isActive: false`). */
export async function getInactiveBarcodes(): Promise<string[]> {
  const metas = await getProductMetaMap();
  return [...metas.values()].filter((meta) => meta.isActive === false).map((meta) => meta.sku);
}

export function invalidateProductMetaCache() {
  invalidateCache(PRODUCT_META_CACHE_KEY);
}
