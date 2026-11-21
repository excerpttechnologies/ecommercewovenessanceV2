/**
 * Central cache-invalidation helpers for the admin write paths.
 *
 * The storefront keeps two layers of read-through cache:
 *   1. this process's TTL cache (`lib/cache.ts`) — dropped synchronously by `invalidateCache`;
 *   2. Next.js' full-route / ISR cache — dropped by `revalidatePath`.
 *
 * Admin handlers must call the helper that matches the data they changed so a product,
 * banner or settings edit is visible without waiting for the TTL. In a PM2 cluster the
 * `revalidatePath` call tells every worker to re-render; the local TTL cache is dropped
 * in the worker that handled the write, and other workers refresh on their next stale hit.
 */
import { revalidatePath } from "next/cache";
import { invalidateCachePrefixes } from "@/lib/cache";
import { invalidateProductMetaCache } from "@/lib/product-meta-cache";

/** ERP catalog, label-id scopes, homepage sections, facets and filter chips. */
const CATALOG_PREFIXES = [
  "erp:catalog:",
  "erp:label-ids:",
  "erp:home-sections:",
  "erp:filter-options:",
  "erp:facets:",
  "erp:filter-chips:",
  "erp:filter-config:",
  "erp:series:",
] as const;

/** Website-owned chrome: settings, menu, banners, homepage layout, CMS pages, testimonials. */
const SITE_PREFIXES = [
  "site:",
] as const;

/** Product web overlay (gallery, descriptions, price/stock overrides, hidden flag). */
const PRODUCT_PREFIXES = [
  "web:product-meta:",
] as const;

/** Product edits: overlay + every ERP catalog/homepage cache + the storefront routes. */
export function invalidateProductCaches() {
  invalidateCachePrefixes([...CATALOG_PREFIXES, ...PRODUCT_PREFIXES, "erp:inactive-barcodes"]);
  invalidateProductMetaCache();
  revalidateStorefront();
}

/** CMS / merchandising edits: site chrome + homepage. */
export function invalidateSiteCaches() {
  invalidateCachePrefixes(SITE_PREFIXES);
  revalidateStorefront();
}

/** ERP product-type / classification config edits. */
export function invalidateCatalogConfigCaches() {
  invalidateCachePrefixes([...CATALOG_PREFIXES, "erp:inactive-barcodes"]);
  revalidateStorefront();
}

/**
 * Re-render every storefront route that may embed the changed data. `"layout"` covers the
 * root layout (header/footer/settings) and therefore all pages beneath it; the explicit
 * collection paths cover ISR entries that Next.js may have cached separately.
 */
export function revalidateStorefront() {
  revalidatePath("/", "layout");
  revalidatePath("/collections", "layout");
  revalidatePath("/sitemap.xml");
}

/** Website-owned resources whose edits change storefront chrome / homepage / CMS. */
const SITE_RESOURCES = new Set(["menu", "banners", "collections", "pages", "testimonials", "homepage"]);
/** Website-owned product overlay (gallery, descriptions, hidden flag). */
const PRODUCT_RESOURCES = new Set(["productMeta"]);

/** Pick the right invalidation for a generic admin resource write. */
export function invalidateAdminResource(resource: string) {
  if (PRODUCT_RESOURCES.has(resource)) invalidateProductCaches();
  else if (SITE_RESOURCES.has(resource)) invalidateSiteCaches();
}
