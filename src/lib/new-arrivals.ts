// src/lib/new-arrivals.ts
import { ERP_CATEGORY_TITLES, getBarcodeImageCatalog, type StorefrontCategoryGroup } from "@/lib/barcode-image-series";
import { NEW_BADGE_MAX_DAYS } from "@/lib/new-badge";
import type { BarcodeProduct } from "@/domain/types";

const GROUPS: StorefrontCategoryGroup[] = ["sarees", "fabrics", "plain-fabrics", "dupatta", "simple", "best-buy"];
const PAGE_SIZE = 48;
const MAX_PAGES = 5;

export interface NewArrivalSection {
  group: StorefrontCategoryGroup;
  title: string;
  items: BarcodeProduct[];
}

/** Published ERP products added in the last `days` days, per storefront category, newest first. */
export async function getNewArrivals(days = NEW_BADGE_MAX_DAYS): Promise<NewArrivalSection[]> {
  const cutoff = Date.now() - days * 86_400_000;
  const isRecent = (item: BarcodeProduct) => {
    const added = item.createdAt ? new Date(item.createdAt).getTime() : NaN;
    return Number.isFinite(added) && added >= cutoff;
  };
  const sections = await Promise.all(GROUPS.map(async (group) => {
    const items: BarcodeProduct[] = [];
    try {
      for (let page = 1; page <= MAX_PAGES; page++) {
        const result = await getBarcodeImageCatalog(group, page, { sort: "newest" }, PAGE_SIZE);
        const recent = result.items.filter(isRecent);
        items.push(...recent);
        // Newest first: once a page holds an older product, everything after it is older too.
        if (recent.length < result.items.length || page >= result.pages) break;
      }
    } catch {
      /* one category failing must not hide the others */
    }
    items.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
    return { group, title: ERP_CATEGORY_TITLES[group], items };
  }));
  return sections.filter((section) => section.items.length);
}