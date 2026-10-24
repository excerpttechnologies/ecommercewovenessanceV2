import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { getMasterData, getSite } from "@/repositories";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.NEXT_PUBLIC_SITE_URL;
  try {
    const master = getMasterData();
    const [categories, collections, pages] = await Promise.all([master.categories.list(), getSite().collections(), getSite().pages()]);
    const products: MetadataRoute.Sitemap = [];
    for (let page = 1; page <= 50; page++) {
      const r = await master.products.list({ page, limit: 96, sort: "newest" });
      products.push(...r.items.map((p) => ({ url: `${base}/products/${p.slug}`, changeFrequency: "weekly" as const, priority: 0.7 })));
      if (page >= r.pages) break;
    }
    return [
      { url: base, changeFrequency: "daily", priority: 1 },
      { url: `${base}/collections`, changeFrequency: "weekly", priority: 0.8 },
      { url: `${base}/collections/new-arrivals`, changeFrequency: "daily", priority: 0.8 },
      ...categories.map((c) => ({ url: `${base}/collections/${c.slug}`, changeFrequency: "daily" as const, priority: 0.8 })),
      ...collections.map((c) => ({ url: `${base}/collections/${c.slug}`, changeFrequency: "weekly" as const, priority: 0.7 })),
      ...pages.map((p) => ({ url: `${base}/pages/${p.slug}`, changeFrequency: "monthly" as const, priority: 0.4 })),
      { url: `${base}/stores`, changeFrequency: "monthly", priority: 0.5 },
      ...products,
    ];
  } catch {
    return [{ url: base }];
  }
}
