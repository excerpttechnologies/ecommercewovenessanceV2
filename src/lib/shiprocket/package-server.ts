import { ProductWebMetaModel } from "@/models/web/content.models";
import { getMasterData } from "@/repositories";
import { getWebConnection } from "@/lib/db";
import { erpWeightToKg, type PackageDefaults } from "./package";
import type { PackageItem } from "./types";

export interface PackageSourceItem {
  sku: string;
  qty: number;
}

/**
 * Resolve per-product shipping overrides from productWebMeta, falling back to
 * ERP product dimensions. Barcode labels normally have no dimensions, so the
 * configured package defaults are used for them.
 */
export async function resolvePackageItems(items: PackageSourceItem[]): Promise<PackageItem[]> {
  if (!items.length) return [];
  const skus = Array.from(new Set(items.map((item) => item.sku)));
  const metaBySku = new Map<string, Record<string, unknown>>();
  try {
    const metas = await ProductWebMetaModel(await getWebConnection())
      .find({ sku: { $in: skus } })
      .lean();
    for (const meta of metas) metaBySku.set(String(meta.sku), meta as Record<string, unknown>);
  } catch {
    // The shipping override is optional; ERP/default dimensions still work.
  }

  let products: Awaited<ReturnType<ReturnType<typeof getMasterData>["products"]["getBySkus"]>> = [];
  try {
    products = await getMasterData().products.getBySkus(skus);
  } catch {
    products = [];
  }
  const productBySku = new Map(products.map((product) => [product.sku, product]));

  return items.map((item) => {
    const meta = metaBySku.get(item.sku);
    const product = productBySku.get(item.sku);
    const dimensions = product?.dimensions;
    return {
      sku: item.sku,
      qty: item.qty,
      weightKg:
        (typeof meta?.weightKg === "number" && meta.weightKg > 0 ? meta.weightKg : undefined) ??
        erpWeightToKg(dimensions?.weight),
      lengthCm:
        (typeof meta?.lengthCm === "number" && meta.lengthCm > 0 ? meta.lengthCm : undefined) ??
        (dimensions?.length && dimensions.length > 0 ? dimensions.length : undefined),
      breadthCm:
        (typeof meta?.breadthCm === "number" && meta.breadthCm > 0 ? meta.breadthCm : undefined) ??
        (dimensions?.width && dimensions.width > 0 ? dimensions.width : undefined),
      heightCm: typeof meta?.heightCm === "number" && meta.heightCm > 0 ? meta.heightCm : undefined,
    };
  });
}

export function packageDefaultsFromConfig(config: {
  defaultWeightKg: number;
  defaultLengthCm: number;
  defaultBreadthCm: number;
  defaultHeightCm: number;
}): PackageDefaults {
  return {
    weightKg: config.defaultWeightKg,
    lengthCm: config.defaultLengthCm,
    breadthCm: config.defaultBreadthCm,
    heightCm: config.defaultHeightCm,
  };
}
