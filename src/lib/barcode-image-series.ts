import { cache } from "react";
import { getBarcodeLabels } from "@/repositories";
import type { BarcodeProduct } from "@/domain/types";
import { getErpConnection, getWebConnection, redactMongoUri } from "@/lib/db";
import { env } from "@/lib/env";
import { erpEcommerceKey, loadErpEcommerceCatalogs } from "@/lib/admin/erp-ecommerce-catalog";
import { isAllowedImageUrl, mapLimit, normalizeImageRef, probeImage } from "@/lib/erp-images";
import { toImages } from "@/lib/erp-mapping";
import { ProductWebMetaModel } from "@/models/web/content.models";

export type BarcodeSeriesGroup = "sarees" | "fabrics";
export type EcommerceClassification = "weave" | "fabric" | "craft" | "occasion" | "color";
export type EcommerceClassificationFilters = Partial<Record<EcommerceClassification, string>>;
export type BarcodeImageFilters = EcommerceClassificationFilters & { group?: string; business?: string; status?: string; uomType?: string; subgroup?: string; q?: string; barcode?: string };

export type StorefrontCategoryGroup = BarcodeSeriesGroup | "plain-fabrics" | "dupatta" | "simple";

export const ERP_CATEGORY_TITLES: Record<StorefrontCategoryGroup, string> = {
  sarees: "Sarees",
  fabrics: "Fabrics",
  "plain-fabrics": "Plain Fabrics",
  dupatta: "Dupatta",
  simple: "Simple",
};

/** Public storefront categories use RetailERP's product-ecom classification. */
export const ERP_CATEGORY_PRODUCT_TYPES: Record<StorefrontCategoryGroup, readonly string[]> = {
  sarees: ["SAREES"],
  fabrics: ["FABRICS"],
  "plain-fabrics": ["PLAIN FABRICS"],
  dupatta: ["DUPATTA"],
  // The ERP product-eccom form saves an item's Item Type ("Simple") when no product type matches.
  simple: ["Simple", "SIMPLE"],
};

export function applyPrintDescriptionOverrides(items: BarcodeProduct[], overrides: Map<string, string>) {
  return items.map((item) => {
    const description = overrides.get(item.barcode)?.trim();
    return description ? { ...item, printDescription: description } : item;
  });
}

async function withPrintDescriptionOverrides(items: BarcodeProduct[]) {
  if (!items.length) return items;
  try {
    const metas = await ProductWebMetaModel(await getWebConnection())
      .find({ sku: { $in: [...new Set(items.map((item) => item.barcode))] } })
      .select({ sku: 1, printDescriptionOverride: 1 })
      .lean();
    const overrides = new Map(
      metas
        .filter((meta) => typeof meta.printDescriptionOverride === "string" && meta.printDescriptionOverride.trim())
        .map((meta) => [meta.sku, meta.printDescriptionOverride as string]),
    );
    return applyPrintDescriptionOverrides(items, overrides);
  } catch (error) {
    console.error("[barcode-image-series] product description lookup failed:", redactMongoUri(String((error as Error)?.message ?? error)));
    return items;
  }
}

function ecommerceImage(refs: unknown[]): string | undefined {
  const spaces = env.DO_SPACES_KEY && env.DO_SPACES_SECRET
    ? { accessKeyId: env.DO_SPACES_KEY, secretAccessKey: env.DO_SPACES_SECRET }
    : undefined;
  const options = { base: env.ERP_IMAGE_BASE, spacesHosts: env.ERP_IMAGE_SPACES_HOSTS, spaces };
  for (const ref of refs) {
    const normalized = normalizeImageRef(ref, options);
    if (normalized && "url" in normalized && isAllowedImageUrl(normalized.url, options)) return normalized.url;
  }
  return undefined;
}

/** null (host unreachable) counts as loading, so the browser still gets to try the barcode's own photo. */
async function ownPhotoLoads(image?: string): Promise<boolean> {
  return Boolean(image) && (await probeImage(image!)) !== false;
}

async function withEcommerceDetails(items: BarcodeProduct[]) {
  if (!items.length) return items;

  const catalogs = await loadErpEcommerceCatalogs(await getErpConnection(), items);
  return mapLimit(items, 8, async (item) => {
    const key = erpEcommerceKey(item.itemId ?? "", item.businessId ?? "");
    const catalog = (key ? catalogs.get(key) : undefined) ?? catalogs.get(`label:${item.id}`);
    if (!catalog) return item;
    const raw = catalog.raw ?? {};
    // One ERP product covers every barcode saved on it but holds a single image, so each barcode
    // keeps its own photo; the product image only fills in when that photo does not load.
    const image = (await ownPhotoLoads(item.image)) ? undefined : ecommerceImage([
      ...[raw.image, raw.images, raw.imageUrl].flatMap((value) => toImages(Array.isArray(value) ? value : [value])),
    ]);
    const ecommerce = {
      displayName: catalog.displayName,
      itemCode: catalog.ecommItemCode,
      productType: catalog.productType,
      description: catalog.printDescription,
      attributes: catalog.attributes,
    };
    const hasEcommerceDetails = Object.values(ecommerce).some((value) =>
      typeof value === "string" ? Boolean(value) : value && Object.values(value).some(Boolean),
    );
    return {
      ...item,
      ...(image ? { image } : {}),
      ...(hasEcommerceDetails ? { ecommerce } : {}),
    };
  });
}

async function inactiveBarcodes() {
  const metas = await ProductWebMetaModel(await getWebConnection())
    .find({ isActive: false }, { sku: 1, _id: 0 })
    .lean();
  return metas.map((meta) => meta.sku);
}

const getBarcodeImageScopes = cache(async (
  group: StorefrontCategoryGroup,
  subgroupId?: string,
  classifications: EcommerceClassificationFilters = {},
) => {
  const productTypes = [...ERP_CATEGORY_PRODUCT_TYPES[group]];
  const hasClassifications = Object.values(classifications).some(Boolean);
  const labelIds = hasClassifications
    ? await getBarcodeLabels().getLabelIdsForProductTypes(productTypes, subgroupId, undefined, classifications)
    : await getBarcodeLabels().getLabelIdsForProductTypes(productTypes, subgroupId);
  return { labelIds };
});

/** All ERP barcode-label images for a clothing category, paged and filtered for the storefront. */
export async function getBarcodeImageCatalog(group: StorefrontCategoryGroup, page: number, filters: BarcodeImageFilters = {}, limit = 48) {
  const barcodeLabels = getBarcodeLabels();
  const { subgroup, q, barcode } = filters;
  const classifications: EcommerceClassificationFilters = {
    weave: filters.weave,
    fabric: filters.fabric,
    craft: filters.craft,
    occasion: filters.occasion,
    color: filters.color,
  };
  const [{ labelIds }, excludedBarcodes] = await Promise.all([
    getBarcodeImageScopes(group, subgroup, classifications),
    inactiveBarcodes(),
  ]);
  if (!labelIds.length) return { items: [], total: 0, page, pages: 0 };
  const hasClassifications = Object.values(classifications).some(Boolean);
  const ecommerceMatches = q?.trim()
    ? hasClassifications
      ? await barcodeLabels.getLabelIdsForProductTypes(
          [...ERP_CATEGORY_PRODUCT_TYPES[group]],
          subgroup,
          q,
          classifications,
        )
      : await barcodeLabels.getLabelIdsForProductTypes([...ERP_CATEGORY_PRODUCT_TYPES[group]], subgroup, q)
    : [];
  const searchByEcommerceCode = ecommerceMatches.length > 0;
  const listFilters = {
    group: filters.group,
    business: filters.business,
    status: filters.status,
    uomType: filters.uomType,
    q: searchByEcommerceCode ? undefined : q,
  };
  const detailView = Boolean(barcode?.trim());
  // Every barcode saved on a published ecommerceproduct is listed, sold ones included:
  // the card marks a piece that is not IN_STOCK as "Unavailable" and it cannot be added to the bag.
  const catalog = await barcodeLabels.list({
    labelIds: searchByEcommerceCode ? ecommerceMatches : labelIds,
    excludedBarcodes,
    ...listFilters,
    ...(detailView ? { barcodes: [barcode!.trim()] } : {}),
    page: detailView ? 1 : page,
    limit: detailView ? 1 : limit,
  });
  return {
    items: await withEcommerceDetails(await withPrintDescriptionOverrides(catalog.items)),
    total: detailView ? Number(catalog.items.length > 0) : catalog.total,
    page: detailView ? 1 : catalog.page,
    pages: detailView ? Number(catalog.items.length > 0) : catalog.pages,
  };
}

export async function getBarcodeImageFilterOptions(group: StorefrontCategoryGroup) {
  const [scopes, excludedBarcodes] = await Promise.all([getBarcodeImageScopes(group), inactiveBarcodes()]);
  if (!scopes.labelIds.length) return { status: [], group: [], business: [], uomType: [], subgroup: [], weave: [], fabric: [], craft: [], occasion: [], color: [], total: 0 };
  const [facets, subgroup, classifications] = await Promise.all([
    getBarcodeLabels().facets({ ...scopes, excludedBarcodes }),
    getBarcodeLabels().getProductTypeSubgroups([...ERP_CATEGORY_PRODUCT_TYPES[group]]),
    getBarcodeLabels().getProductTypeClassifications([...ERP_CATEGORY_PRODUCT_TYPES[group]]),
  ]);
  return { ...facets, ...classifications, subgroup };
}

export async function getBarcodeImageSeries(group: StorefrontCategoryGroup) {
  const barcodeLabels = getBarcodeLabels();
  const [{ labelIds }, excludedBarcodes] = await Promise.all([getBarcodeImageScopes(group), inactiveBarcodes()]);
  if (!labelIds.length) {
    return (["8A", "9A"] as const).map((prefix) => ({ title: `${ERP_CATEGORY_TITLES[group]} - ${prefix} Series`, items: [] as BarcodeProduct[] }));
  }

  const seenImages = new Set<string>();
  const series = [];
  for (const prefix of ["8A", "9A"] as const) {
    const result = await barcodeLabels.list({ labelIds, seriesPrefix: prefix, excludedBarcodes, limit: 12 });
    const items = result.items
      .filter((item): item is typeof item & { image: string } => {
        if (!item.image) return false;
        const imageUrl = item.image.split("?")[0];
        if (seenImages.has(imageUrl)) return false;
        seenImages.add(imageUrl);
        return true;
      });
    series.push({
      title: `${ERP_CATEGORY_TITLES[group]} - ${prefix} Series`,
      items,
    });
  }
  const items = await withPrintDescriptionOverrides(series.flatMap((group) => group.items));
  const descriptionsById = new Map(items.map((item) => [item.id, item.printDescription]));
  return series.map((group) => ({
    ...group,
    items: group.items.map((item) => {
      const printDescription = descriptionsById.get(item.id);
      return printDescription ? { ...item, printDescription } : item;
    }),
  }));
}

const STOREFRONT_GROUPS = Object.keys(ERP_CATEGORY_PRODUCT_TYPES) as StorefrontCategoryGroup[];

/** The homepage shows ERP products only: per storefront category, its published products, newest first. */
export const getErpHomeSections = cache(async (limitPerGroup = 8) => {
  const sections = await Promise.all(STOREFRONT_GROUPS.map(async (group) => {
    const result = await getBarcodeImageCatalog(group, 1, {}, limitPerGroup);
    return { group, title: ERP_CATEGORY_TITLES[group], items: result.items, total: result.total };
  }));
  return sections.filter((section) => section.items.length);
});

/**
 * One chip per classification value (occasion, fabric…) that published ERP products carry, linking to
 * the first storefront category where it is used.
 */
export async function getErpFilterChips(key: EcommerceClassification): Promise<{ label: string; href: string }[]> {
  const facets = await Promise.all(STOREFRONT_GROUPS.map(async (group) => ({
    group,
    options: (await getBarcodeLabels().getProductTypeClassifications([...ERP_CATEGORY_PRODUCT_TYPES[group]]))[key] ?? [],
  })));
  const chips = new Map<string, { label: string; href: string }>();
  for (const { group, options } of facets) {
    for (const option of options) {
      const id = option.value.toLowerCase();
      if (!chips.has(id)) chips.set(id, { label: option.label, href: `/collections/${group}?${key}=${encodeURIComponent(option.value)}` });
    }
  }
  return [...chips.values()];
}
