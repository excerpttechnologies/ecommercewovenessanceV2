import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { ERP_CATEGORY_TITLES, getBarcodeImageCatalog, type StorefrontCategoryGroup } from "@/lib/barcode-image-series";
import { barcodeProductPath } from "@/lib/paths";
import { absoluteUrl, barcodeProductFacts, publicImage } from "@/lib/seo";
import { getMasterData, getSite } from "@/repositories";

export const revalidate = 3600;

const ERP_PAGE_SIZE = 96; // the barcode repository's maximum page size
const MAX_PAGES_PER_GROUP = 60;

/** In-stock ERP products of one storefront category, with their photos for Google Images. */
async function erpProductEntries(group: StorefrontCategoryGroup): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];
  for (let page = 1; page <= MAX_PAGES_PER_GROUP; page++) {
    const result = await getBarcodeImageCatalog(group, page, {}, ERP_PAGE_SIZE);
    for (const item of result.items) {
      // Sold pieces keep their page, but the sitemap only advertises what can be bought.
      if (!barcodeProductFacts(item).inStock) continue;
      const image = publicImage(item.image);
      entries.push({
        url: absoluteUrl(barcodeProductPath(group, item.barcode)),
        ...(item.updatedAt || item.createdAt ? { lastModified: new Date((item.updatedAt ?? item.createdAt)!) } : {}),
        changeFrequency: "weekly",
        priority: 0.7,
        ...(image ? { images: [image] } : {}),
      });
    }
    if (page >= result.pages) break;
  }
  return entries;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const groups = Object.keys(ERP_CATEGORY_TITLES) as StorefrontCategoryGroup[];
  const core: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/collections"), changeFrequency: "weekly", priority: 0.8 },
    ...groups.map((group) => ({ url: absoluteUrl(`/collections/${group}`), lastModified: now, changeFrequency: "daily" as const, priority: 0.9 })),
    { url: absoluteUrl("/stores"), changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/contact"), changeFrequency: "monthly", priority: 0.4 },
  ];

  // Each source is independent: one failing (e.g. the ERP being unreachable) never empties the sitemap.
  const [pages, erpProducts, master] = await Promise.all([
    getSite().pages().catch(() => []),
    Promise.all(groups.map((group) => erpProductEntries(group).catch(() => [] as MetadataRoute.Sitemap))).then((lists) => lists.flat()),
    // The master catalogue is demo data unless DATA_SOURCE=erp, so it is only listed then.
    env.DATA_SOURCE === "erp" ? masterEntries().catch(() => [] as MetadataRoute.Sitemap) : Promise.resolve([] as MetadataRoute.Sitemap),
  ]);

  return [
    ...core,
    ...pages.map((p) => ({ url: absoluteUrl(`/pages/${p.slug}`), changeFrequency: "monthly" as const, priority: 0.4 })),
    ...erpProducts,
    ...master,
  ];
}

async function masterEntries(): Promise<MetadataRoute.Sitemap> {
  const master = getMasterData();
  const [categories, collections] = await Promise.all([master.categories.list(), getSite().collections()]);
  const reserved = new Set(Object.keys(ERP_CATEGORY_TITLES));
  const products: MetadataRoute.Sitemap = [];
  for (let page = 1; page <= 50; page++) {
    const r = await master.products.list({ page, limit: 96, sort: "newest" });
    products.push(...r.items.map((p) => ({ url: absoluteUrl(`/products/${p.slug}`), changeFrequency: "weekly" as const, priority: 0.6 })));
    if (page >= r.pages) break;
  }
  return [
    ...categories.filter((c) => !reserved.has(c.slug)).map((c) => ({ url: absoluteUrl(`/collections/${c.slug}`), changeFrequency: "daily" as const, priority: 0.7 })),
    ...collections.filter((c) => !reserved.has(c.slug)).map((c) => ({ url: absoluteUrl(`/collections/${c.slug}`), changeFrequency: "weekly" as const, priority: 0.6 })),
    ...products,
  ];
}
