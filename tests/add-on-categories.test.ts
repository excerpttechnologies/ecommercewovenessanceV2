import { describe, expect, it } from "vitest";
import { ADD_ON_CATEGORIES, ADD_ON_CATEGORY_SLUGS, getAddOnGroupIds, isAddOnCategorySlug } from "@/lib/add-on-categories";

describe("Add On ERP category mappings", () => {
  it("defines the seven requested categories in navigation order", () => {
    expect(ADD_ON_CATEGORY_SLUGS.map((slug) => ADD_ON_CATEGORIES[slug].name)).toEqual([
      "Inskirt",
      "Border",
      "Pavada",
      "Dhotis",
      "Ready Made",
      "Ready Bits",
      "Unstitched Suits",
    ]);
  });

  it("uses each verified ERP product-group ID and rejects unrelated slugs", () => {
    const ids = ADD_ON_CATEGORY_SLUGS.map((slug) => getAddOnGroupIds(slug)?.[0]);
    expect(ids).toEqual([
      "6ae2ee99eb54c4ea4fd9b5a1",
      "6ae2ee77eb54c4ea4fd9b540",
      "6ae2ee67eb54c4ea4fd9b4c3",
      "6ae2ee48eb54c4ea4fd9b451",
      "6ae2ee3aeb54c4ea4fd9b400",
      "6ae2ee2ceb54c4ea4fd9b3b7",
      "6ae2ee1deb54c4ea4fd9b387",
    ]);
    expect(new Set(ids).size).toBe(7);
    expect(isAddOnCategorySlug("ready-bits")).toBe(true);
    expect(getAddOnGroupIds("sarees")).toBeUndefined();
  });
});
