import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getLabelIdsForProductTypes,
  getProductTypeClassifications,
  getProductTypeSubgroups,
  getLabelIdsForProductGroups,
  facets,
  list,
  getErpConnection,
  loadErpEcommerceCatalogs,
} = vi.hoisted(() => ({
  getLabelIdsForProductTypes: vi.fn(),
  getProductTypeClassifications: vi.fn(),
  getProductTypeSubgroups: vi.fn(),
  getLabelIdsForProductGroups: vi.fn(),
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
    getLabelIdsForProductGroups,
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

let productMetaDocs: Record<string, unknown>[] = [];

vi.mock("@/models/web/content.models", () => ({
  ProductWebMetaModel: () => ({
    find: (filter?: { isActive?: boolean }) => {
      const docs = filter?.isActive === false ? [] : productMetaDocs;
      return {
        select: () => ({ lean: async () => docs }),
        lean: async () => docs,
      };
    },
  }),
}));

const { getBarcodeImageCatalog } = await import("@/lib/barcode-image-series");

describe("getBarcodeImageCatalog", () => {
  let erpConnection: { db: { collection: ReturnType<typeof vi.fn> } };
  let productTypeDocs: Record<string, unknown>[];

  beforeEach(() => {
    getLabelIdsForProductTypes.mockReset();
    getLabelIdsForProductGroups.mockReset().mockResolvedValue(["group-label"]);
    list.mockReset();
    productMetaDocs = [];
    productTypeDocs = [{
      value: "SAREES",
      ecommerceSlug: "sarees",
      businessId: "business-1",
      filterConfig: [
        { key: "byWeave", displayLabel: "Weave", selectionMode: "multiple" },
        { key: "byFabric", displayLabel: "Fabric", isVisible: false },
      ],
    }];
    erpConnection = {
      db: {
        collection: vi.fn((name: string) => ({
          find: () => ({
            toArray: async () => name === "producttypes" ? productTypeDocs : [],
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

  it("includes published products by their configured Product Type when a legacy group ID no longer matches", async () => {
    productTypeDocs = [{
      value: "UNSTITCHED SUITS",
      label: "unstitched suits",
      businessId: "business-1",
      isActive: true,
    }];
    getLabelIdsForProductTypes.mockResolvedValue(["published-product-type-label"]);
    list.mockResolvedValue({
      items: [{ id: "label-8a2837", barcode: "8A2837", itemId: "item-1", businessId: "business-1" }],
      total: 1,
      page: 1,
      limit: 48,
      pages: 1,
      skipped: 0,
    });

    const result = await getBarcodeImageCatalog("unstitched-suits", 1);

    expect(getLabelIdsForProductGroups).toHaveBeenCalledWith(["6ae2ee1deb54c4ea4fd9b387"]);
    expect(getLabelIdsForProductTypes).toHaveBeenCalledWith(
      ["UNSTITCHED SUITS"],
      undefined,
      undefined,
      undefined,
      "business-1",
    );
    expect(list).toHaveBeenCalledWith(expect.objectContaining({
      labelIds: ["group-label", "published-product-type-label"],
    }));
    expect(result.items.map((item) => item.barcode)).toEqual(["8A2837"]);
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

  it("attaches the saved gallery in order with the barcode photo as the default primary", async () => {
    const image = "https://erp.wovenessence.in/august_8A_images/8A2524.jpg";
    list.mockResolvedValue({
      items: [{ id: "label-1", itemId: "item-1", businessId: "business-1", barcode: "8A2524", image }],
      total: 1,
      page: 1,
      limit: 48,
      pages: 1,
      skipped: 0,
    });
    productMetaDocs = [{
      sku: "8A2524",
      extraImages: ["https://cdn.example.com/side.jpg", "https://cdn.example.com/back.jpg"],
    }];

    const result = await getBarcodeImageCatalog("sarees", 1);

    expect(result.items[0].images).toEqual([
      image,
      "https://cdn.example.com/side.jpg",
      "https://cdn.example.com/back.jpg",
    ]);
  });

  it("uses the saved gallery primary override without overwriting the ERP barcode photo", async () => {
    const image = "https://erp.wovenessence.in/august_8A_images/8A2524.jpg";
    list.mockResolvedValue({
      items: [{ id: "label-1", itemId: "item-1", businessId: "business-1", barcode: "8A2524", image }],
      total: 1,
      page: 1,
      limit: 48,
      pages: 1,
      skipped: 0,
    });
    productMetaDocs = [{
      sku: "8A2524",
      galleryPrimaryImage: "https://cdn.example.com/gallery-primary.jpg",
      extraImages: ["https://cdn.example.com/side.jpg"],
    }];

    const result = await getBarcodeImageCatalog("sarees", 1);

    expect(result.items[0].images).toEqual([
      "https://cdn.example.com/gallery-primary.jpg",
      "https://cdn.example.com/side.jpg",
    ]);
    expect(result.items[0].image).toBe(image);
  });

  it("builds the saved gallery after the ERP e-commerce image replaces a missing barcode photo", async () => {
    const erpImage = "https://templeimg.blr1.digitaloceanspaces.com/1/1/barcodes/4A1287.jpg";
    list.mockResolvedValue({
      items: [{
        id: "label-1",
        itemId: "item-1",
        businessId: "business-1",
        barcode: "4A1277",
        image: "https://erp.wovenessence.in/august_8A_images/4A1277.jpg",
      }],
      total: 1,
      page: 1,
      limit: 48,
      pages: 1,
      skipped: 0,
    });
    loadErpEcommerceCatalogs.mockResolvedValue(new Map([
      ["item-1:business-1", {
        displayName: "4-M.DECOR",
        productType: "FABRICS",
        attributes: {},
        raw: { image: `${erpImage}?X-Amz-Signature=expired` },
      }],
    ]));
    productMetaDocs = [{
      sku: "4A1277",
      extraImages: ["https://cdn.example.com/texture.jpg"],
    }];

    const result = await getBarcodeImageCatalog("fabrics", 1, { barcode: "4A1277" });

    expect(result.items[0].image).toBe(erpImage);
    expect(result.items[0].images).toEqual([
      erpImage,
      "https://cdn.example.com/texture.jpg",
    ]);
  });

  it("merges ERP additionalImages after website extras and removes duplicates", async () => {
    const main = "https://templeimg.blr1.digitaloceanspaces.com/1/1/barcodes/4A1287.jpg";
    const side = "https://templeimg.blr1.digitaloceanspaces.com/1/1/barcodes/4A1287-side.jpg";
    const detail = "https://templeimg.blr1.digitaloceanspaces.com/1/1/barcodes/4A1287-detail.jpg";
    list.mockResolvedValue({
      items: [{ id: "label-1", itemId: "item-1", businessId: "business-1", barcode: "4A1277" }],
      total: 1,
      page: 1,
      limit: 48,
      pages: 1,
      skipped: 0,
    });
    loadErpEcommerceCatalogs.mockResolvedValue(new Map([
      ["item-1:business-1", {
        displayName: "4-M.DECOR",
        attributes: {},
        raw: {
          image: main,
          additionalImages: [main, side, detail, side],
        },
      }],
    ]));
    productMetaDocs = [{
      sku: "4A1277",
      extraImages: [side, "https://cdn.example.com/back.jpg"],
    }];

    const result = await getBarcodeImageCatalog("fabrics", 1);

    expect(result.items[0].images).toEqual([
      main,
      side,
      "https://cdn.example.com/back.jpg",
      detail,
    ]);
  });

  it("supports ERP additionalImages when no website gallery metadata exists", async () => {
    const main = "https://templeimg.blr1.digitaloceanspaces.com/1/1/barcodes/8A2524.jpg";
    const pallu = "https://templeimg.blr1.digitaloceanspaces.com/1/1/barcodes/8A2524-pallu.jpg";
    list.mockResolvedValue({
      items: [{ id: "label-1", itemId: "item-1", businessId: "business-1", barcode: "8A2524" }],
      total: 1,
      page: 1,
      limit: 48,
      pages: 1,
      skipped: 0,
    });
    loadErpEcommerceCatalogs.mockResolvedValue(new Map([
      ["item-1:business-1", { attributes: {}, raw: { image: main, additionalImages: [pallu] } }],
    ]));

    const result = await getBarcodeImageCatalog("sarees", 1);

    expect(result.items[0].images).toEqual([main, pallu]);
    expect(result.items[0].erpAdditionalImages).toEqual([pallu]);
  });

  it("keeps a one-photo product as a one-image gallery", async () => {
    const main = "https://templeimg.blr1.digitaloceanspaces.com/1/1/barcodes/4A1287.jpg";
    list.mockResolvedValue({
      items: [{ id: "label-1", itemId: "item-1", businessId: "business-1", barcode: "4A1277" }],
      total: 1,
      page: 1,
      limit: 48,
      pages: 1,
      skipped: 0,
    });
    loadErpEcommerceCatalogs.mockResolvedValue(new Map([
      ["item-1:business-1", { displayName: "4-M.DECOR", attributes: {}, raw: { image: main, additionalImages: [] } }],
    ]));

    const result = await getBarcodeImageCatalog("fabrics", 1);

    expect(result.items[0].images).toEqual([main]);
  });

  it("caps the combined website and ERP gallery at five images", async () => {
    const erpExtras = Array.from({ length: 6 }, (_, index) => `https://templeimg.blr1.digitaloceanspaces.com/1/1/barcodes/extra-${index}.jpg`);
    list.mockResolvedValue({
      items: [{ id: "label-1", itemId: "item-1", businessId: "business-1", barcode: "8A2524" }],
      total: 1,
      page: 1,
      limit: 48,
      pages: 1,
      skipped: 0,
    });
    loadErpEcommerceCatalogs.mockResolvedValue(new Map([
      ["item-1:business-1", { attributes: {}, raw: { image: erpExtras[0], additionalImages: erpExtras } }],
    ]));
    productMetaDocs = [{
      sku: "8A2524",
      extraImages: ["https://cdn.example.com/side.jpg", "https://cdn.example.com/back.jpg"],
    }];

    const result = await getBarcodeImageCatalog("sarees", 1);

    expect(result.items[0].images).toHaveLength(5);
    expect(result.items[0].images?.slice(0, 3)).toEqual([
      erpExtras[0],
      "https://cdn.example.com/side.jpg",
      "https://cdn.example.com/back.jpg",
    ]);
  });
});
