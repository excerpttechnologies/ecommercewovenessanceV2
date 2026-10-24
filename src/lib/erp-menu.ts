import { getBarcodeLabels } from "@/repositories";
import { redactMongoUri } from "@/lib/db";
import { ERP_CATEGORY_PRODUCT_TYPES, type StorefrontCategoryGroup } from "@/lib/barcode-image-series";
import type { MenuNode } from "@/repositories/web/site.repository";

/** Mega-menu columns in display order: query key the collection page filters on + column heading. */
const FILTER_GROUPS = [
  ["weave", "By Weave"],
  ["fabric", "By Fabric"],
  ["craft", "By Craft"],
  ["occasion", "By Occasion"],
  ["color", "By Colour"],
] as const;

function erpCategorySlug(node: MenuNode): StorefrontCategoryGroup | null {
  const slug = node.href?.match(/^\/collections\/([^/?#]+)$/)?.[1];
  return slug && slug in ERP_CATEGORY_PRODUCT_TYPES ? (slug as StorefrontCategoryGroup) : null;
}

/**
 * The filter columns under an ERP category (Sarees, Fabrics…) come from RetailERP itself: only the
 * weave / fabric / craft / occasion / colour values that published e-commerce products of that type
 * carry, so a value appears once it is used in the ERP and an empty filter is never offered.
 * Other menu items are left as stored. If the ERP cannot be read, the stored columns are kept.
 */
export async function withErpFilterColumns(menu: MenuNode[]): Promise<MenuNode[]> {
  return Promise.all(menu.map(async (top) => {
    const slug = erpCategorySlug(top);
    if (!slug) return top;
    try {
      const facets = await getBarcodeLabels().getProductTypeClassifications([...ERP_CATEGORY_PRODUCT_TYPES[slug]]);
      const columns: MenuNode[] = FILTER_GROUPS.flatMap(([key, label]) => {
        const options = facets[key] ?? [];
        if (!options.length) return [];
        return [{
          id: `${top.id}-erp-${key}`,
          label,
          kind: "group" as const,
          children: options.map((option, index) => ({
            id: `${top.id}-erp-${key}-${index + 1}`,
            label: option.label,
            kind: "link" as const,
            href: `/collections/${slug}?${key}=${encodeURIComponent(option.value)}`,
            children: [],
          })),
        }];
      });
      return { ...top, children: [...columns, ...top.children.filter((child) => child.kind !== "group")] };
    } catch (error) {
      console.error("[erp-menu] filter columns unavailable, using the stored menu:", redactMongoUri(String((error as Error)?.message ?? error)));
      return top;
    }
  }));
}
