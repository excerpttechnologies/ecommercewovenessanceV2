import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MenuNode } from "@/repositories/web/site.repository";

const { getProductTypeClassifications } = vi.hoisted(() => ({ getProductTypeClassifications: vi.fn() }));

vi.mock("@/repositories", () => ({ getBarcodeLabels: () => ({ getProductTypeClassifications }) }));
vi.mock("@/lib/db", () => ({ redactMongoUri: (s: string) => s }));
vi.mock("@/lib/barcode-image-series", () => ({
  ERP_CATEGORY_PRODUCT_TYPES: { sarees: ["SAREES"], dupatta: ["DUPATTA"] },
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
    getProductTypeClassifications.mockReset();
  });

  it("replaces the stored columns with only the ERP values published products carry", async () => {
    getProductTypeClassifications.mockResolvedValue({
      weave: [{ value: "Brocade", label: "Brocade", count: 2 }],
      fabric: [{ value: "Banarasi Silk Sarees", label: "Banarasi Silk Sarees", count: 1 }],
      craft: [],
      occasion: [],
      color: [],
    });

    const [sarees] = await withErpFilterColumns([storedSarees]);

    expect(getProductTypeClassifications).toHaveBeenCalledWith(["SAREES"]);
    expect(sarees.children.map((column) => column.label)).toEqual(["By Weave", "By Fabric"]);
    expect(sarees.children[0].children.map((item) => [item.label, item.href])).toEqual([
      ["Brocade", "/collections/sarees?weave=Brocade"],
    ]);
    expect(sarees.children[1].children[0].href).toBe("/collections/sarees?fabric=Banarasi%20Silk%20Sarees");
  });

  it("shows no columns for an ERP category whose products have no classifications", async () => {
    getProductTypeClassifications.mockResolvedValue({ weave: [], fabric: [], craft: [], occasion: [], color: [] });
    const dupatta: MenuNode = { ...storedSarees, id: "dupatta", href: "/collections/dupatta" };

    const [result] = await withErpFilterColumns([dupatta]);

    expect(result.children).toEqual([]);
  });

  it("leaves non-ERP menu items alone and keeps the stored columns when the ERP is unavailable", async () => {
    getProductTypeClassifications.mockImplementation(async () => { throw new Error("ERP down"); });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const newArrivals: MenuNode = { id: "new", label: "NEW ARRIVALS", kind: "top", href: "/new-arrivals", children: [] };

    const result = await withErpFilterColumns([storedSarees, newArrivals]);

    expect(result).toEqual([storedSarees, newArrivals]);
  });
});
