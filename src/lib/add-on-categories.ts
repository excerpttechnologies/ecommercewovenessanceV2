export const ADD_ON_CATEGORY_SLUGS = [
  "inskirt",
  "border",
  "pavada",
  "dhotis",
  "ready-made",
  "ready-bits",
  "unstitched-suits",
] as const;

export type AddOnCategorySlug = (typeof ADD_ON_CATEGORY_SLUGS)[number];

export const ADD_ON_CATEGORIES: Record<AddOnCategorySlug, { name: string; groupIds: readonly string[] }> = {
  inskirt: { name: "Inskirt", groupIds: ["6ae2ee99eb54c4ea4fd9b5a1"] },
  border: { name: "Border", groupIds: ["6ae2ee77eb54c4ea4fd9b540"] },
  pavada: { name: "Pavada", groupIds: ["6ae2ee67eb54c4ea4fd9b4c3"] },
  dhotis: { name: "Dhotis", groupIds: ["6ae2ee48eb54c4ea4fd9b451"] },
  "ready-made": { name: "Ready Made", groupIds: ["6ae2ee3aeb54c4ea4fd9b400"] },
  "ready-bits": { name: "Pre-cut Fabrics", groupIds: ["6ae2ee2ceb54c4ea4fd9b3b7"] },
  "unstitched-suits": { name: "Unstitched Suits", groupIds: ["6ae2ee1deb54c4ea4fd9b387"] },
};

/**
 * Maps internal/ERP category or product-group labels to customer-facing names
 * (e.g. "ready bits" -> "Pre-cut Fabrics") and title-cases lowercase ERP group names.
 */
export function formatCategoryDisplayName(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) return label;
  const readyBitsMatch = trimmed.match(/^ready[\s-]+bits(\s+·\s+.+)?$/i);
  if (readyBitsMatch) {
    return `Pre-cut Fabrics${readyBitsMatch[1] ?? ""}`;
  }
  const preCutMatch = trimmed.match(/^pre-cut\s+fabrics(\s+·\s+.+)?$/i);
  if (preCutMatch) {
    return `Pre-cut Fabrics${preCutMatch[1] ?? ""}`;
  }
  return label === label.toLowerCase()
    ? label.replace(/\b\w/g, (character) => character.toUpperCase())
    : label;
}

export function isAddOnCategorySlug(slug: string): slug is AddOnCategorySlug {
  return ADD_ON_CATEGORY_SLUGS.some((categorySlug) => categorySlug === slug);
}

export function getCanonicalAddOnCategorySlug(slug: string): AddOnCategorySlug | undefined {
  if (slug === "pre-cut-fabrics") return "ready-bits";
  return isAddOnCategorySlug(slug) ? slug : undefined;
}

export function getAddOnGroupIds(slug: string): readonly string[] | undefined {
  return isAddOnCategorySlug(slug) ? ADD_ON_CATEGORIES[slug].groupIds : undefined;
}
