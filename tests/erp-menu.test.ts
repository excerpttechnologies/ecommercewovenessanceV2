import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MenuNode } from "@/repositories/web/site.repository";

const { getStorefrontClassificationFacets } = vi.hoisted(() => ({ getStorefrontClassificationFacets: vi.fn() }));

vi.mock("@/lib/db", () => ({ redactMongoUri: (s: string) => s }));
vi.mock("@/lib/barcode-image-series", () => ({
  ERP_CATEGORY_PRODUCT_TYPES: { sarees: ["SAREES"], dupatta: ["DUPATTA"] },
  getStorefrontClassificationFacets,
}));

const { withErpFilterColumns } = await import("@/lib/erp-menu");

const link = (id: string, label: string): MenuNode => ({ id, label, kind: "link", href: "/collections/sarees", children: [] });
const storedSarees: MenuNode = {
  id: "sarees",
  label: "SAREES",
  kind: "top",
  href: "/collections/sarees",
  children: [{ id: "weave", label: "By Weave", kind: "group", children: [link("w1", "Brocade"), link("w2", "Tissue"), link("w3", "Korvai")] }],
};

describe("withErpFilterColumns", () => {
  beforeEach(() => {
    getStorefrontClassificationFacets.mockReset();
  });

  it("replaces stored columns with the configured ERP filters and live values", async () => {
    getStorefrontClassificationFacets.mockResolvedValue({
      weave: [{ value: "Brocade", label: "Brocade", count: 2 }],
      fabric: [{ value: "Banarasi Silk Sarees", label: "Banarasi Silk Sarees", count: 1 }],
      configuredFilters: [
        { key: "weave", label: "By Weave", selectionMode: "multiple" },
        { key: "fabric", label: "By Fabric", selectionMode: "multiple" },
      ],
    });

    const [sarees] = await withErpFilterColumns([storedSarees]);

    expect(getStorefrontClassificationFacets).toHaveBeenCalledWith("sarees");
    expect(sarees.children.map((column) => column.label)).toEqual(["By Weave", "By Fabric"]);
    expect(sarees.children[0].children.map((item) => [item.label, item.href])).toEqual([
      ["Brocade", "/collections/sarees?weave=Brocade"],
    ]);
    expect(sarees.children[1].children[0].href).toBe("/collections/sarees?fabric=Banarasi%20Silk%20Sarees");
  });

  it("shows no columns for an ERP category whose products have no classifications", async () => {
    getStorefrontClassificationFacets.mockResolvedValue({ weave: [], configuredFilters: [] });
    const dupatta: MenuNode = { ...storedSarees, id: "dupatta", href: "/collections/dupatta" };

    const [result] = await withErpFilterColumns([dupatta]);

    expect(result.children).toEqual([]);
  });

  it("leaves non-ERP menu items alone and keeps the stored columns when the ERP is unavailable", async () => {
    getStorefrontClassificationFacets.mockImplementation(async () => { throw new Error("ERP down"); });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const newArrivals: MenuNode = { id: "new", label: "NEW ARRIVALS", kind: "top", href: "/new-arrivals", children: [] };

    const result = await withErpFilterColumns([storedSarees, newArrivals]);

    expect(result).toEqual([storedSarees, newArrivals]);
  });
});
