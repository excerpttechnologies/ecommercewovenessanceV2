import { describe, expect, it } from "vitest";
import {
  getProductClassificationOptions,
  isClassificationOptionDeleted,
} from "@/lib/admin/product-classification-options";
import { normalizeProductType } from "@/lib/admin/product-type";

describe("normalizeProductType", () => {
  it("matches a product type despite ERP capitalization and whitespace", () => {
    expect(normalizeProductType(" sarees ")).toBe("SAREES");
  });

  it("rejects unknown product type values", () => {
    expect(normalizeProductType("OTHER")).toBe("");
  });
});

describe("getProductClassificationOptions", () => {
  it("returns saree weave options", () => {
    expect(getProductClassificationOptions("SAREES", "By Weave")).toContain("Brocade");
  });

  it("provides all four classification dropdowns for sarees", () => {
    for (const field of ["By Weave", "By Fabric", "By Craft", "By Occasion"] as const) {
      expect(getProductClassificationOptions("SAREES", field).length).toBeGreaterThan(0);
    }
  });

  it("returns product-type-specific fabric options", () => {
    expect(getProductClassificationOptions("FABRICS", "By Fabric")).toContain("Banarasi Silk Fabric");
    expect(getProductClassificationOptions("PLAIN FABRICS", "By Fabric")).toContain("Plain Cotton");
    expect(getProductClassificationOptions("DUPATTA", "By Fabric")).toContain("Organza Dupatta");
  });

  it("returns no options for groups that do not exist", () => {
    expect(getProductClassificationOptions("NEW ARRIVALS", "By Weave")).toEqual([]);
  });

  it("matches deleted options without case sensitivity and scopes them by type and field", () => {
    const deleted = [{ productType: "SAREES", field: "By Weave", value: "brocade" }];

    expect(isClassificationOptionDeleted(deleted, "SAREES", "By Weave", "Brocade")).toBe(true);
    expect(isClassificationOptionDeleted(deleted, "FABRICS", "By Weave", "Brocade")).toBe(false);
    expect(isClassificationOptionDeleted(deleted, "SAREES", "By Fabric", "Brocade")).toBe(false);
  });
});
