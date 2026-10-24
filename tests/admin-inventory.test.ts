import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  aggregate: vi.fn(),
  getErpConnection: vi.fn(),
  toArray: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ getErpConnection: mocks.getErpConnection }));

const { erpInventory, resolveInventoryCategory } = await import("@/lib/admin/stats");

describe("erpInventory", () => {
  beforeEach(() => {
    mocks.aggregate.mockReset().mockReturnValue({ toArray: mocks.toArray });
    mocks.toArray.mockReset().mockResolvedValue([{
      summary: [{ total: 1, inStock: 1, lowStock: 1, outOfStock: 0 }],
      lowStock: [{
        _id: "erp-item-id",
        itemCode: "ERP-ITEM-01",
        barcode: "8901234567890",
        name: "4-FABRICS",
        category: "Sarees",
        qty: 0.5,
      }],
      outOfStock: [],
    }]);
    mocks.getErpConnection.mockResolvedValue({
      db: { collection: () => ({ aggregate: mocks.aggregate }) },
    });
  });

  it("returns ERP identifiers and resolves category from ERP type and product name", async () => {
    const inventory = await erpInventory(3);

    expect(inventory.lowStock).toEqual([{
      id: "erp-item-id",
      itemCode: "ERP-ITEM-01",
      barcode: "8901234567890",
      name: "4-FABRICS",
      category: "Fabrics",
      qty: 0.5,
    }]);

    const pipeline = mocks.aggregate.mock.calls[0][0];
    expect(pipeline[1].$lookup).toMatchObject({
      from: "barcodeLabel",
      localField: "barcodeManagement.sourceBarcodeLabel",
      foreignField: "_id",
    });
    expect(pipeline[3].$project.itemCode.$ifNull[0]).toBe("$identity.itemCode");
    expect(pipeline[3].$project.barcode.$ifNull).toEqual(["$_sourceLabel.barcodeNo", ""]);
    expect(pipeline[3].$project.name.$ifNull[0]).toBe("$identity.productName");
    expect(pipeline[3].$project.category.$convert.input.$ifNull[0]).toBe("$identity.productType");
  });
});

describe("resolveInventoryCategory", () => {
  it.each([
    ["Saree", "4-FX-BUTI", "Saree"],
    ["Saree", "4-FABRICS", "Fabrics"],
    ["Saree", "10-PLAIN FABRICS", "Plain Fabrics"],
    ["ERP Products", "4-FX-BUTI", "—"],
  ])("resolves %s / %s to %s", (productType, productName, expected) => {
    expect(resolveInventoryCategory(productType, productName)).toBe(expected);
  });
});
