import { beforeEach, describe, expect, it, vi } from "vitest";
import { classificationValues, hasEcommerceData } from "@/lib/admin/business-export";
import { mapErpEcommerceCatalog } from "@/lib/admin/erp-ecommerce-catalog";

describe("business export helpers", () => {
  it("splits classification values, trims whitespace, and skips empty entries", () => {
    expect(classificationValues("Silk, Cotton, , Linen ")).toEqual(["Silk", "Cotton", "Linen"]);
    expect(classificationValues(undefined)).toEqual([]);
  });

  it("counts meaningful website metadata and explicit inactivity but ignores the default active flag", () => {
    expect(hasEcommerceData({ isActive: true } as never)).toBe(false);
    expect(hasEcommerceData({ isActive: false } as never)).toBe(true);
    expect(hasEcommerceData({ fabricDescription: " Silk " } as never)).toBe(true);
    expect(hasEcommerceData({ ecommOffPercent: 0 } as never)).toBe(true);
    expect(hasEcommerceData(undefined)).toBe(false);
  });

  it("maps the ERP e-commerce attributes into editor classification fields", () => {
    expect(mapErpEcommerceCatalog({
      _id: "catalog-1",
      productName: "Storefront name",
      ecommerceItemName: "Item name",
      attributes: {
        weave: "Kanjivaram",
        fabric: "Pure silk",
        work: "Zari",
        occasion: "Wedding",
        colorFamily: "Red",
      },
    })).toMatchObject({
      id: "catalog-1",
      productName: "Storefront name",
      itemName: "Item name",
      attributes: {
        weave: "Kanjivaram",
        fabric: "Pure silk",
        craft: "Zari",
        occasion: "Wedding",
        color: "Red",
      },
    });
  });
});

const { requireAdmin, labelFind, labelCount, metaFind, catalogRows } = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  labelFind: vi.fn(),
  labelCount: vi.fn(),
  metaFind: vi.fn(),
  catalogRows: [] as Record<string, unknown>[],
}));

vi.mock("@/lib/auth", () => ({ requireAdmin: (...args: unknown[]) => requireAdmin(...args) }));
vi.mock("@/lib/db", () => ({
  getErpConnection: vi.fn(async () => ({
    db: {
      collection: () => ({
        find: () => ({
          sort: () => ({ toArray: async () => catalogRows }),
        }),
      }),
    },
  })),
  getWebConnection: vi.fn(async () => ({})),
  redactMongoUri: (value: string) => value,
  toObjectIdOrString: (id: string) => id,
}));
vi.mock("@/models/erp/barcode-label.model", () => ({
  BarcodeLabelModel: () => ({
    find: (...args: unknown[]) => labelFind(...args),
    countDocuments: (...args: unknown[]) => labelCount(...args),
  }),
}));
vi.mock("@/models/web/content.models", () => ({
  ProductWebMetaModel: () => ({ find: (...args: unknown[]) => metaFind(...args) }),
}));

const { GET } = await import("@/app/api/v1/admin/erp/business-export/route");
const businessId = "6a853cdefb266c4358beb548";
const request = (query: string) => ({
  nextUrl: new URL(`http://localhost/api/v1/admin/erp/business-export${query}`),
}) as never;

describe("GET /api/v1/admin/erp/business-export", () => {
  beforeEach(() => {
    requireAdmin.mockReset().mockResolvedValue({ kind: "admin" });
    labelFind.mockReset();
    labelCount.mockReset();
    metaFind.mockReset();
    catalogRows.length = 0;
  });

  it("returns business products and the requested e-commerce counts", async () => {
    labelFind.mockReturnValue({
      sort: () => ({
        limit: () => ({
          lean: async () => [{
            _id: "label-1",
            barcodeNo: "PA12770",
            itemCode: "15-SA",
            qtyNum: 2,
            status: "IN_STOCK",
            businessId,
          }],
        }),
      }),
    });
    labelCount.mockResolvedValue(1);
    catalogRows.push({
      _id: "catalog-1",
      erpDocumentId: "label-1",
      productName: "ERP name",
      attributes: { weave: "Kanjivaram", fabric: "Cotton", work: "Zari" },
    });
    metaFind.mockReturnValue({
      lean: async () => [{
        sku: "PA12770",
        weaveDescription: "Kanjivaram",
        fabricDescription: "Silk, Pure Silk",
        isActive: true,
      }],
    });

    const response = await GET(request(`?businessId=${businessId}&limit=5000`));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.classificationOptionCounts).toEqual({
      byWeave: 1,
      byFabric: 2,
      byCraft: 1,
      byOccasion: 0,
      byColour: 0,
    });
    expect(body.data.counts).toEqual({
      totalProducts: 1,
      productsReturned: 1,
      itemsWithEcommerceData: 1,
      itemsWithByFabric: 1,
    });
    expect(body.data.classificationOptions).toMatchObject({
      byWeave: ["Kanjivaram"],
      byCraft: ["Zari"],
    });
    expect(body.data.products[0].erpEcommerce).toMatchObject({
      productName: "ERP name",
      attributes: { fabric: "Cotton", craft: "Zari" },
    });
    expect(body.data.products[0].web.fabricDescription).toBe("Silk, Pure Silk");
    expect(body.meta.truncated).toBe(false);
  });

  it("rejects an invalid business id before querying ERP", async () => {
    const response = await GET(request("?businessId=bad"));
    expect(response.status).toBe(400);
    expect(labelFind).not.toHaveBeenCalled();
  });
});
