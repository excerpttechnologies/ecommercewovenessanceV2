import { redactMongoUri } from "@/lib/db";
import { ERP_CATEGORY_PRODUCT_TYPES, getStorefrontClassificationFacets, type StorefrontCategoryGroup } from "@/lib/barcode-image-series";
import type { MenuNode } from "@/repositories/web/site.repository";

function erpCategorySlug(node: MenuNode): StorefrontCategoryGroup | null {
  const slug = node.href?.match(/^\/collections\/([^/?#]+)$/)?.[1];
  return slug && slug in ERP_CATEGORY_PRODUCT_TYPES ? (slug as StorefrontCategoryGroup) : null;
}

/**
 * The filter columns under an ERP category come from its active, visible ERP Product Type config;
 * each column is omitted unless it is configured and has live values.
 * Other menu items are left as stored. If the ERP cannot be read, the stored columns are kept.
 */
export async function withErpFilterColumns(menu: MenuNode[]): Promise<MenuNode[]> {
  return Promise.all(menu.map(async (top) => {
    const slug = erpCategorySlug(top);
    if (!slug) return top;
    try {
      const facets = await getStorefrontClassificationFacets(slug);
      const columns: MenuNode[] = (facets.configuredFilters ?? []).flatMap(({ key, label }) => {
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
