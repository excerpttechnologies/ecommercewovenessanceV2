import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireAdmin,
  getByBarcode,
  findOne,
  findOneAndUpdate,
  audit,
} = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  getByBarcode: vi.fn(),
  findOne: vi.fn(),
  findOneAndUpdate: vi.fn(),
  audit: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireAdmin }));
vi.mock("@/lib/db", () => ({
  getWebConnection: vi.fn().mockResolvedValue({}),
  redactMongoUri: (value: string) => value,
}));
vi.mock("@/lib/audit", () => ({ audit }));
vi.mock("@/repositories", () => ({
  getBarcodeLabels: () => ({ getByBarcode }),
}));
vi.mock("@/models/web/content.models", () => ({
  ProductWebMetaModel: () => ({ findOne, findOneAndUpdate }),
}));

const { PATCH } = await import("@/app/api/v1/admin/products/route");

describe("PATCH /api/v1/admin/products website overrides", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdmin.mockResolvedValue({ id: "admin-1" });
    getByBarcode.mockResolvedValue({ barcode: "12345", slug: "saree-12345" });
    findOne.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) });
    findOneAndUpdate.mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        sku: "12345",
        productName: "Kanjivaram Silk Saree",
        itemName: "Silk saree",
        barcodeName: "Red Banarasi",
        isActive: false,
        productType: "SAREES",
        itemType: "By Weave",
        groupNameOverride: "Silks",
        supplierCodeOverride: "SUP-1",
        supplierNameOverride: "Silk supplier",
        printDescriptionOverride: "Banarasi silk with gold zari.",
        ecommOffPercent: 12.5,
        barcodePriceOverride: 2500,
        barcodeQtyOverride: 3,
        barcodeStatusOverride: "IN_STOCK",
      }),
    });
  });

  it("saves product names, active state, type, price, quantity, and status as website metadata", async () => {
    const request = new Request("http://localhost/api/v1/admin/products", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sku: "12345",
        productName: "Kanjivaram Silk Saree",
        itemName: "Silk saree",
        barcodeName: "Red Banarasi",
        isActive: false,
        productType: "SAREES",
        itemType: "By Weave",
        groupNameOverride: "Silks",
        supplierCodeOverride: "SUP-1",
        supplierNameOverride: "Silk supplier",
        printDescriptionOverride: "Banarasi silk with gold zari.",
        ecommOffPercent: 12.5,
        barcodePriceOverride: 2500,
        barcodeQtyOverride: 3,
        barcodeStatusOverride: "IN_STOCK",
      }),
    });

    const response = await PATCH(request as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(requireAdmin).toHaveBeenCalledWith("products:write");
    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { sku: "12345" },
      expect.objectContaining({
        $set: {
          productName: "Kanjivaram Silk Saree",
          itemName: "Silk saree",
          barcodeName: "Red Banarasi",
          isActive: false,
          productType: "SAREES",
          itemType: "By Weave",
          groupNameOverride: "Silks",
          supplierCodeOverride: "SUP-1",
          supplierNameOverride: "Silk supplier",
          printDescriptionOverride: "Banarasi silk with gold zari.",
          ecommOffPercent: 12.5,
          barcodePriceOverride: 2500,
          barcodeQtyOverride: 3,
          barcodeStatusOverride: "IN_STOCK",
        },
        $setOnInsert: expect.objectContaining({
          itemCode: "web:12345",
        }),
      }),
      { upsert: true, new: true },
    );
    expect(body.data).toMatchObject({
      productName: "Kanjivaram Silk Saree",
      itemName: "Silk saree",
      barcodeName: "Red Banarasi",
      isActive: false,
      productType: "SAREES",
      itemType: "By Weave",
      groupNameOverride: "Silks",
      supplierCodeOverride: "SUP-1",
      supplierNameOverride: "Silk supplier",
      printDescriptionOverride: "Banarasi silk with gold zari.",
      ecommOffPercent: 12.5,
      barcodePriceOverride: 2500,
      barcodeQtyOverride: 3,
      barcodeStatusOverride: "IN_STOCK",
    });
    expect(getByBarcode).toHaveBeenCalledWith("12345");
    expect(getByBarcode).toHaveBeenCalledTimes(1);
  });

  it("clears overrides to restore ERP values and rejects barcode/item-code edits", async () => {
    const clearRequest = new Request("http://localhost/api/v1/admin/products", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sku: "12345",
        productName: null,
        itemName: null,
        barcodeName: null,
        isActive: true,
        productType: null,
        itemType: null,
        groupNameOverride: null,
        supplierCodeOverride: null,
        supplierNameOverride: null,
        printDescriptionOverride: null,
        ecommOffPercent: null,
        barcodePriceOverride: null,
        barcodeQtyOverride: null,
        barcodeStatusOverride: null,
      }),
    });

    const clearResponse = await PATCH(clearRequest as never);
    expect(clearResponse.status).toBe(200);
    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { sku: "12345" },
      expect.objectContaining({
        $unset: {
          productName: 1,
          itemName: 1,
          barcodeName: 1,
          productType: 1,
          itemType: 1,
          groupNameOverride: 1,
          supplierCodeOverride: 1,
          supplierNameOverride: 1,
          printDescriptionOverride: 1,
          ecommOffPercent: 1,
          barcodePriceOverride: 1,
          barcodeQtyOverride: 1,
          barcodeStatusOverride: 1,
        },
      }),
      { upsert: true, new: true },
    );

    const protectedFieldsRequest = new Request("http://localhost/api/v1/admin/products", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sku: "12345", barcode: "changed", itemCode: "changed" }),
    });
    const protectedFieldsResponse = await PATCH(protectedFieldsRequest as never);
    expect(protectedFieldsResponse.status).toBe(422);
    expect(findOneAndUpdate).toHaveBeenCalledTimes(1);
  });
});
