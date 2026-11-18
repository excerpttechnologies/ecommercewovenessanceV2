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
  "ready-bits": { name: "Ready Bits", groupIds: ["6ae2ee2ceb54c4ea4fd9b3b7"] },
  "unstitched-suits": { name: "Unstitched Suits", groupIds: ["6ae2ee1deb54c4ea4fd9b387"] },
};

export function isAddOnCategorySlug(slug: string): slug is AddOnCategorySlug {
  return ADD_ON_CATEGORY_SLUGS.some((categorySlug) => categorySlug === slug);
}

export function getAddOnGroupIds(slug: string): readonly string[] | undefined {
  return isAddOnCategorySlug(slug) ? ADD_ON_CATEGORIES[slug].groupIds : undefined;
}
