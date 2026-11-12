import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getLabelIdsForProductTypes,
  getProductTypeClassifications,
  getProductTypeSubgroups,
  facets,
  list,
  getErpConnection,
  loadErpEcommerceCatalogs,
} = vi.hoisted(() => ({
  getLabelIdsForProductTypes: vi.fn(),
  getProductTypeClassifications: vi.fn(),
  getProductTypeSubgroups: vi.fn(),
  facets: vi.fn(),
  list: vi.fn(),
  getErpConnection: vi.fn(),
  loadErpEcommerceCatalogs: vi.fn(),
}));

vi.mock("@/repositories", () => ({
  getBarcodeLabels: () => ({
    getLabelIdsForProductTypes,
    getProductTypeClassifications,
    getProductTypeSubgroups,
    facets,
    list,
  }),
}));

vi.mock("@/lib/db", () => ({ getErpConnection, getWebConnection: vi.fn() }));

vi.mock("@/lib/env", () => ({
  env: {
    ERP_IMAGE_BASE: undefined,
    ERP_IMAGE_SPACES_HOSTS: ["templeimg.blr1.digitaloceanspaces.com"],
    DO_SPACES_KEY: undefined,
    DO_SPACES_SECRET: undefined,
  },
}));

vi.mock("@/lib/admin/erp-ecommerce-catalog", () => ({
  erpEcommerceKey: (itemId: string, businessId: string) => itemId && businessId ? `${itemId}:${businessId}` : undefined,
  loadErpEcommerceCatalogs,
}));

vi.mock("@/models/web/content.models", () => ({
  ProductWebMetaModel: () => ({
    find: () => ({
      select: () => ({ lean: async () => [] }),
      lean: async () => [],
    }),
  }),
}));

const { getBarcodeImageCatalog } = await import("@/lib/barcode-image-series");

describe("getBarcodeImageCatalog", () => {
  let erpConnection: { db: { collection: ReturnType<typeof vi.fn> } };

  beforeEach(() => {
    getLabelIdsForProductTypes.mockReset();
    list.mockReset();
    erpConnection = {
      db: {
        collection: vi.fn((name: string) => ({
          find: () => ({
            toArray: async () => name === "producttypes"
              ? [{
                  value: "SAREES",
                  ecommerceSlug: "sarees",
                  businessId: "business-1",
                  filterConfig: [
                    { key: "byWeave", displayLabel: "Weave", selectionMode: "multiple" },
                    { key: "byFabric", displayLabel: "Fabric", isVisible: false },
                  ],
                }]
              : [],
          }),
        })),
      },
    };
    getErpConnection.mockReset().mockResolvedValue(erpConnection);
    loadErpEcommerceCatalogs.mockReset().mockResolvedValue(new Map());
    getLabelIdsForProductTypes.mockResolvedValue(["category-label"]);
    getProductTypeClassifications.mockResolvedValue({ weave: [{ value: "Brocade", label: "Brocade", count: 2 }], fabric: [] });
    getProductTypeSubgroups.mockResolvedValue([]);
    facets.mockResolvedValue({ status: [], group: [], business: [], uomType: [], total: 0 });
    list.mockResolvedValue({ items: [], total: 0, page: 1, limit: 48, pages: 0, skipped: 0 });
    // Photo checks never leave the test: barcode photos are missing unless a test says otherwise.
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 404 })));
  });

  it("searches e-commerce item codes and requests only available barcode labels", async () => {
    getLabelIdsForProductTypes
      .mockResolvedValueOnce(["category-label"])
      .mockResolvedValueOnce(["matched-ecommerce-label"]);

    await getBarcodeImageCatalog("sarees", 1, { q: "10A2312" });

    expect(getLabelIdsForProductTypes).toHaveBeenNthCalledWith(1, ["SAREES"], undefined, undefined, undefined, "business-1");
    expect(getLabelIdsForProductTypes).toHaveBeenNthCalledWith(2, ["SAREES"], undefined, "10A2312", undefined, "business-1");
    expect(list).toHaveBeenCalledWith({
      labelIds: ["matched-ecommerce-label"],
      excludedBarcodes: [],
      availableOnly: true,
      resolveImages: true,
      group: undefined,
      business: undefined,
      status: undefined,
      uomType: undefined,
      q: undefined,
      page: 1,
      limit: 48,
    });
  });

  it("filters a category using the matching ERP e-commerce classification", async () => {
    await getBarcodeImageCatalog("sarees", 1, { weave: "Brocade" });

    expect(getLabelIdsForProductTypes).toHaveBeenCalledWith(
      ["SAREES"],
      undefined,
      undefined,
      { weave: "Brocade" },
      "business-1",
    );
    expect(list).toHaveBeenCalledWith(expect.objectContaining({ labelIds: ["category-label"] }));
  });

  it("exposes only the active ERP-configured classification filters", async () => {
    const { getBarcodeImageFilterOptions } = await import("@/lib/barcode-image-series");

    const result = await getBarcodeImageFilterOptions("sarees");

    expect(result.configuredFilters).toEqual([{ key: "weave", label: "Weave", selectionMode: "multiple" }]);
    expect(result.weave).toEqual([{ value: "Brocade", label: "Brocade", count: 2 }]);
    expect(result.fabric).toBeUndefined();
    expect(getProductTypeClassifications).toHaveBeenCalledWith(["SAREES"], "business-1");
  });

  it("ignores URL selections for filters not enabled on that ERP Product Type", async () => {
    await getBarcodeImageCatalog("sarees", 1, { fabric: "Banarasi Silk Sarees" });

    expect(getLabelIdsForProductTypes).toHaveBeenCalledWith(
      ["SAREES"],
      undefined,
      undefined,
      undefined,
      "business-1",
    );
  });

  it("keeps each barcode's own photo when several barcodes share one ERP e-commerce product", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(new Uint8Array([0xff]), { status: 206, headers: { "content-type": "image/jpeg" } })));
    const label = (barcode: string) => ({
      id: `label-${barcode}`,
      itemId: "item-dup",
      businessId: "business-1",
      barcode,
      image: `https://erp.wovenessence.in/august_8A_images/${barcode}.jpg`,
    });
    list.mockResolvedValue({ items: [label("8A1927"), label("8A1929")], total: 2, page: 1, limit: 48, pages: 1, skipped: 0 });
    loadErpEcommerceCatalogs.mockResolvedValue(new Map([
      ["item-dup:business-1", { displayName: "DU-P", raw: { image: "https://erp.wovenessence.in/august_8A_images/8A1927.jpg" } }],
    ]));

    const result = await getBarcodeImageCatalog("sarees", 1);

    expect(result.items.map((item) => item.image)).toEqual([
      "https://erp.wovenessence.in/august_8A_images/8A1927.jpg",
      "https://erp.wovenessence.in/august_8A_images/8A1929.jpg",
    ]);
    expect(result.items[1].ecommerce?.displayName).toBe("DU-P");
  });

  it("uses the ERP e-commerce image when the barcode has no photo that loads", async () => {
    const item = {
      id: "label-1",
      itemId: "item-1",
      businessId: "business-1",
      barcode: "8A2524",
      image: "https://erp.wovenessence.in/august_8A_images/8A2524.jpg",
    };
    list.mockResolvedValue({ items: [item], total: 1, page: 1, limit: 48, pages: 1, skipped: 0 });
    loadErpEcommerceCatalogs.mockResolvedValue(new Map([
      ["item-1:business-1", {
        displayName: "Brocade silk saree",
        ecommItemCode: "EC-2524",
        productType: "SAREES",
        printDescription: "Traditional brocade design",
        attributes: { weave: "Brocade" },
        raw: { image: "https://templeimg.blr1.digitaloceanspaces.com/brocade.jpg?X-Amz-Signature=expired" },
      }],
    ]));

    const result = await getBarcodeImageCatalog("sarees", 1);

    expect(getErpConnection).toHaveBeenCalledTimes(3);
    expect(loadErpEcommerceCatalogs).toHaveBeenCalledWith(erpConnection, [item]);
    expect(result.items[0].image).toBe("https://templeimg.blr1.digitaloceanspaces.com/brocade.jpg");
    expect(result.items[0].ecommerce).toEqual({
      displayName: "Brocade silk saree",
      itemCode: "EC-2524",
      productType: "SAREES",
      description: "Traditional brocade design",
      attributes: { weave: "Brocade" },
    });
  });

  it("keeps the generated barcode image when the ERP e-commerce image host is not allowed", async () => {
    const item = {
      id: "label-1",
      itemId: "item-1",
      businessId: "business-1",
      barcode: "8A2524",
      image: "https://erp.wovenessence.in/august_8A_images/8A2524.jpg",
    };
    list.mockResolvedValue({ items: [item], total: 1, page: 1, limit: 48, pages: 1, skipped: 0 });
    loadErpEcommerceCatalogs.mockResolvedValue(new Map([
      ["item-1:business-1", { raw: { image: "https://untrusted.example/brocade.jpg" } }],
    ]));

    const result = await getBarcodeImageCatalog("sarees", 1);

    expect(result.items[0].image).toBe("https://erp.wovenessence.in/august_8A_images/8A2524.jpg");
  });
});
