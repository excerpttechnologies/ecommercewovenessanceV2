import type { PackageDimensions, PackageItem } from "./types";

const r2 = (n: number) => Math.round(n * 100) / 100;
const positive = (n: unknown): number | undefined => {
  const value = typeof n === "number" ? n : Number(n);
  return Number.isFinite(value) && value > 0 ? value : undefined;
};

/**
 * ERP weight is inconsistent: some records store kilograms (0.6), others grams
 * (600). Values above 20 are treated as grams; everything else as kilograms.
 * A per-product website override is always kilograms.
 */
export function erpWeightToKg(value: unknown): number | undefined {
  const weight = positive(value);
  if (weight == null) return undefined;
  return weight > 20 ? r2(weight / 1000) : weight;
}

export interface PackageDefaults {
  weightKg: number;
  lengthCm: number;
  breadthCm: number;
  heightCm: number;
}

/**
 * Build one shipment box from cart/order items. Uses per-product overrides when
 * available, then ERP dimensions, then the configured defaults. Multiple items
 * are stacked by expanding the box height so volumetric weight stays sensible.
 */
export function computePackage(items: PackageItem[], defaults: PackageDefaults): PackageDimensions {
  const fallbackWeight = positive(defaults.weightKg) ?? 0.7;
  const baseLength = positive(defaults.lengthCm) ?? 30;
  const baseBreadth = positive(defaults.breadthCm) ?? 25;
  const baseHeight = positive(defaults.heightCm) ?? 5;

  let weight = 0;
  let length = baseLength;
  let breadth = baseBreadth;
  let itemVolume = 0;

  for (const item of items) {
    const qty = Math.max(1, Math.floor(positive(item.qty) ?? 1));
    const unitWeight = positive(item.weightKg) ?? fallbackWeight;
    weight += unitWeight * qty;

    const l = positive(item.lengthCm);
    const b = positive(item.breadthCm);
    const h = positive(item.heightCm);
    if (l && b && h) {
      itemVolume += l * b * h * qty;
      length = Math.max(length, l);
      breadth = Math.max(breadth, b);
    }
  }

  if (items.length === 0) weight = fallbackWeight;
  const baseVolume = length * breadth * baseHeight;
  const totalVolume = Math.max(baseVolume, itemVolume);
  const height = Math.max(baseHeight, Math.ceil(totalVolume / Math.max(1, length * breadth)));

  return {
    weight: Math.max(0.01, r2(weight)),
    length: Math.max(1, Math.ceil(length)),
    breadth: Math.max(1, Math.ceil(breadth)),
    height: Math.min(200, Math.max(1, height)),
  };
}
