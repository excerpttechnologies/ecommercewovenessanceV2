import type { ProductWebMetaDoc } from "@/models/web/content.models";

const ECOMMERCE_FIELDS = [
  "productName",
  "itemName",
  "barcodeName",
  "seoTitle",
  "seoDescription",
  "productType",
  "itemType",
  "weaveDescription",
  "fabricDescription",
  "craftDescription",
  "occasionDescription",
  "colorDescription",
  "printDescriptionOverride",
  "cardTitle",
  "cardDescription",
  "ecommOffPercent",
  "barcodePriceOverride",
  "barcodeQtyOverride",
  "barcodeStatusOverride",
  "isFeatured",
  "extraImages",
  "webTags",
] as const satisfies readonly (keyof ProductWebMetaDoc)[];

export type BusinessClassificationKey =
  | "byWeave"
  | "byFabric"
  | "byCraft"
  | "byOccasion"
  | "byColour";

export const BUSINESS_CLASSIFICATION_FIELDS: Record<
  BusinessClassificationKey,
  keyof ProductWebMetaDoc
> = {
  byWeave: "weaveDescription",
  byFabric: "fabricDescription",
  byCraft: "craftDescription",
  byOccasion: "occasionDescription",
  byColour: "colorDescription",
};

export function classificationValues(value: unknown): string[] {
  if (typeof value !== "string") return [];
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

export function hasEcommerceData(meta: ProductWebMetaDoc | undefined): boolean {
  if (!meta) return false;
  return ECOMMERCE_FIELDS.some((field) => {
    const value = meta[field];
    if (typeof value === "string") return value.trim().length > 0;
    if (typeof value === "number") return Number.isFinite(value);
    if (typeof value === "boolean") return value;
    return Array.isArray(value) && value.length > 0;
  }) || meta.isActive === false;
}
