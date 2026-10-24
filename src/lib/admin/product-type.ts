export type ProductType = "SAREES" | "FABRICS" | "PLAIN FABRICS" | "DUPATTA" | "NEW ARRIVALS";

const PRODUCT_TYPES: readonly ProductType[] = ["SAREES", "FABRICS", "PLAIN FABRICS", "DUPATTA", "NEW ARRIVALS"];

export function normalizeProductType(value: string | undefined): ProductType | "" {
  const normalized = value?.trim().toLocaleUpperCase();
  return PRODUCT_TYPES.find((productType) => productType === normalized) ?? "";
}

export function inferProductType(product: { group?: string; name: string; itemCode?: string }): ProductType | "" {
  const source = [product.group, product.name, product.itemCode].filter(Boolean).join(" ").toUpperCase();
  const itemCode = product.itemCode?.toUpperCase() ?? "";
  if (/\bNEW\s+ARRIVALS?\b/.test(source)) return "NEW ARRIVALS";
  if (/\bPLAIN\s+FABRICS?\b/.test(source)) return "PLAIN FABRICS";
  if (/\bFABRICS?\b/.test(source)) return "FABRICS";
  if (/\bDUPATTAS?\b/.test(source)) return "DUPATTA";
  if (/\bSAREES?\b/.test(source) || /(?:^|[\s-])SA(?:[\s-]|$)/.test(source) || /(?:^|-)SA(?:-|$)/.test(itemCode)) return "SAREES";
  if (/(?:^|-)DU(?:-|$)/.test(itemCode)) return "DUPATTA";
  return "";
}
