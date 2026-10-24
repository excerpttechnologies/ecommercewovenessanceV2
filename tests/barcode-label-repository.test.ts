import { beforeEach, describe, expect, it, vi } from "vitest";

const { aggregate, countDocuments } = vi.hoisted(() => ({
  aggregate: vi.fn(),
  countDocuments: vi.fn(),
}));

vi.mock("@/models/erp/barcode-label.model", () => ({
  BarcodeLabelModel: () => ({ aggregate, countDocuments }),
}));

const { MongoBarcodeLabelRepository } = await import("@/repositories/mongo/barcode-label.repository");

describe("barcode label series", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    aggregate.mockResolvedValue([]);
    countDocuments.mockResolvedValue(0);
  });

  it.each(["8A", "9A"])("filters the ERP barcode field by the %s series prefix", async (seriesPrefix) => {
    const repository = new MongoBarcodeLabelRepository(async () => ({} as never));

    await repository.list({ group: "sarees-group", seriesPrefix, limit: 8 });

    expect(aggregate.mock.calls[0][0][0].$match).toEqual({
      $and: [
        { barcodeNo: new RegExp(`^${seriesPrefix}`, "i") },
        { groupId: "sarees-group" },
      ],
    });
  });

  it("filters category labels by exact referenced barcodeLabel IDs before pagination", async () => {
    const repository = new MongoBarcodeLabelRepository(async () => ({} as never));

    await repository.list({ labelIds: ["6a9905f8ee2f8f36193a0ce2"], limit: 96 });

    expect(aggregate.mock.calls[0][0][0].$match._id.$in[0].toString()).toBe("6a9905f8ee2f8f36193a0ce2");
  });

  it("uses only the ERP barcode image URL, even when the label has another image URL", async () => {
    aggregate.mockImplementation(async (pipeline: Array<Record<string, unknown>>) =>
      pipeline[0]?.$group
        ? [{ _id: "8A2524", n: 1 }]
        : [{ _id: "label-1", barcodeNo: "8A2524", status: "IN_STOCK", imageUrl: "https://templeimg.blr1.digitaloceanspaces.com/8A2524.jpg" }],
    );
    const repository = new MongoBarcodeLabelRepository(async () => ({} as never));

    const result = await repository.list({ status: "IN_STOCK", limit: 1 });

    expect(result.items[0].image).toBe("https://erp.wovenessence.in/august_8A_images/8A2524.jpg");
  });

  it("resolves unique existing barcodeLabel IDs from exact ERP Item group references", async () => {
    const itemAggregate = vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([{ _id: "label-1" }, { _id: "label-2" }]) });
    const collection = vi.fn(() => ({ aggregate: itemAggregate }));
    const repository = new MongoBarcodeLabelRepository(async () => ({ db: { collection } }) as never);

    await expect(repository.getLabelIdsForItemGroups(["6a9905f8ee2f8f36193a0ce2"])).resolves.toEqual(["label-1", "label-2"]);
    const pipeline = itemAggregate.mock.calls[0][0];
    expect(pipeline[0].$match).toMatchObject({
      group: { $in: [expect.anything()] },
      "barcodeManagement.sourceBarcodeLabel": { $type: "objectId" },
    });
    expect(pipeline[0].$match.group.$in[0].toString()).toBe("6a9905f8ee2f8f36193a0ce2");
    expect(pipeline[1]).toEqual({ $group: { _id: "$barcodeManagement.sourceBarcodeLabel" } });
    expect(pipeline[2]).toEqual({ $lookup: { from: "barcodeLabel", localField: "_id", foreignField: "_id", as: "label" } });
  });

  it("shows only the barcodes saved on published ERP e-commerce products, never every label of their item", async () => {
    const ecommerceFind = vi.fn().mockReturnValue({
      toArray: vi.fn().mockResolvedValue([
        { itemId: "item-1", businessId: "business-1", barcode: "8A1001" },
        { itemId: "item-2", businessId: "business-1", barcode: "8A2002" },
        // saved without a barcode: nothing is shown for it
        { itemId: "item-3", businessId: "business-1" },
      ]),
    });
    const labelFind = vi.fn().mockReturnValue({
      toArray: vi.fn().mockResolvedValue([
        { _id: "label-1", barcodeNo: "8A1001", businessId: "business-1" },
        { _id: "label-2", barcodeNo: "8A2002", businessId: "business-1" },
      ]),
    });
    const collection = vi.fn((name: string) => ({
      find: name === "ecommerceproduct" ? ecommerceFind : labelFind,
    }));
    const repository = new MongoBarcodeLabelRepository(async () => ({ db: { collection } }) as never);

    await expect(repository.getLabelIdsForProductTypes(["SAREES"])).resolves.toEqual(["label-1", "label-2"]);
    expect(ecommerceFind).toHaveBeenCalledWith(
      { productType: { $in: ["SAREES"] }, isPublished: true },
      { projection: { itemId: 1, businessId: 1, erpDocumentId: 1, barcode: 1, barcodes: 1, _id: 0 } },
    );
    expect(labelFind).toHaveBeenCalledTimes(1);
    expect(labelFind).toHaveBeenCalledWith(
      { barcodeNo: { $in: ["8A1001", "8a1001", "8A2002", "8a2002"] } },
      { projection: { _id: 1, barcodeNo: 1, businessId: 1, currentBusinessId: 1 } },
    );
  });

  it("searches active e-commerce item codes and resolves their barcode labels", async () => {
    const ecommerceFind = vi.fn().mockReturnValue({
      toArray: vi.fn().mockResolvedValue([{ itemId: "item-10", businessId: "business-1", barcode: "8A0010" }]),
    });
    const labelFind = vi.fn().mockReturnValue({
      toArray: vi.fn().mockResolvedValue([{ _id: "label-10", barcodeNo: "8A0010", businessId: "business-1" }]),
    });
    const collection = vi.fn((name: string) => ({
      find: name === "ecommerceproduct" ? ecommerceFind : labelFind,
    }));
    const repository = new MongoBarcodeLabelRepository(async () => ({ db: { collection } }) as never);

    await expect(repository.getLabelIdsForProductTypes(["SAREES"], undefined, "10A2312")).resolves.toEqual(["label-10"]);
    expect(ecommerceFind).toHaveBeenCalledWith(
      {
        productType: { $in: ["SAREES"] },
        isPublished: true,
        $and: [{
          $or: [
            { ecommItemCode: /10A2312/i },
            { itemCode: /10A2312/i },
          ],
        }],
      },
      { projection: { itemId: 1, businessId: 1, erpDocumentId: 1, barcode: 1, barcodes: 1, _id: 0 } },
    );
  });

  it("resolves e-commerce records linked directly to a barcode label", async () => {
    const ecommerceFind = vi.fn().mockReturnValue({
      toArray: vi.fn().mockResolvedValue([{ erpDocumentId: "6abd1a091dd6ac4f2056d3c4" }]),
    });
    const labelFind = vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([{ _id: "6abd1a091dd6ac4f2056d3c4" }]) });
    const collection = vi.fn((name: string) => ({
      find: name === "ecommerceproduct" ? ecommerceFind : labelFind,
    }));
    const repository = new MongoBarcodeLabelRepository(async () => ({ db: { collection } }) as never);

    await expect(repository.getLabelIdsForProductTypes(["SAREES"])).resolves.toEqual(["6abd1a091dd6ac4f2056d3c4"]);
    expect(labelFind).toHaveBeenCalledWith(
      { $or: [{ _id: { $in: ["6abd1a091dd6ac4f2056d3c4", expect.anything()] } }] },
      { projection: { _id: 1 } },
    );
  });

  it("does not query barcode labels when no published e-commerce products are found", async () => {
    const ecommerceFind = vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) });
    const labelFind = vi.fn();
    const collection = vi.fn((name: string) => ({ find: name === "ecommerceproduct" ? ecommerceFind : labelFind }));
    const repository = new MongoBarcodeLabelRepository(async () => ({ db: { collection } }) as never);

    await expect(repository.getLabelIdsForProductTypes(["FABRICS"])).resolves.toEqual([]);
    expect(labelFind).not.toHaveBeenCalled();
  });

  it("filters published category products by their ERP item subgroup", async () => {
    const ecommerceFind = vi.fn().mockReturnValue({
      toArray: vi.fn().mockResolvedValue([
        { itemId: "item-1", businessId: "business-1", barcode: "8A0001" },
        { itemId: "item-2", businessId: "business-1", barcode: "8A0002" },
      ]),
    });
    const itemFind = vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([{ _id: "item-2" }]) });
    const labelFind = vi.fn().mockReturnValue({
      toArray: vi.fn().mockResolvedValue([{ _id: "label-2", barcodeNo: "8A0002", businessId: "business-1" }]),
    });
    const collection = vi.fn((name: string) => ({
      find: name === "ecommerceproduct" ? ecommerceFind : name === "items" ? itemFind : labelFind,
    }));
    const repository = new MongoBarcodeLabelRepository(async () => ({ db: { collection } }) as never);

    await expect(repository.getLabelIdsForProductTypes(["SAREES"], "subgroup-2")).resolves.toEqual(["label-2"]);
    expect(itemFind).toHaveBeenCalledWith(
      { _id: { $in: ["item-1", "item-1", "item-2", "item-2"] }, subgroup: { $in: ["subgroup-2", "subgroup-2"] } },
      { projection: { _id: 1 } },
    );
    expect(labelFind).toHaveBeenCalledWith(
      { barcodeNo: { $in: ["8A0002", "8a0002"] } },
      { projection: { _id: 1, barcodeNo: 1, businessId: 1, currentBusinessId: 1 } },
    );
  });

  it("filters storefront products by the selected ERP e-commerce weave", async () => {
    const weaveId = "64a000000000000000000001";
    const ecommerceFind = vi.fn().mockReturnValue({
      toArray: vi.fn().mockResolvedValue([
        { itemId: "item-1", businessId: "business-1", barcode: "8A0001", byWeave: [weaveId] },
        { itemId: "item-2", businessId: "business-1", barcode: "8A0002", byWeave: ["64a000000000000000000002"] },
      ]),
    });
    const optionsFind = vi.fn().mockReturnValue({
      toArray: vi.fn().mockResolvedValue([{ _id: weaveId, name: "Brocade" }]),
    });
    const labelFind = vi.fn().mockReturnValue({
      toArray: vi.fn().mockResolvedValue([{ _id: "label-1", barcodeNo: "8A0001", businessId: "business-1" }]),
    });
    const collection = vi.fn((name: string) => ({
      find: name === "ecommerceproduct" ? ecommerceFind : name === "productclassificationoption" ? optionsFind : labelFind,
    }));
    const repository = new MongoBarcodeLabelRepository(async () => ({ db: { collection } }) as never);

    await expect(repository.getLabelIdsForProductTypes(["SAREES"], undefined, undefined, { weave: "Brocade" }))
      .resolves.toEqual(["label-1"]);
    expect(optionsFind).toHaveBeenCalledWith(
      { _id: { $in: [expect.anything(), expect.anything()] } },
      { projection: { _id: 1, name: 1 } },
    );
    expect(labelFind).toHaveBeenCalledWith(
      { barcodeNo: { $in: ["8A0001", "8a0001"] } },
      { projection: { _id: 1, barcodeNo: 1, businessId: 1, currentBusinessId: 1 } },
    );
  });

  it("shows only the labels of the barcodes saved on an ERP product, preferring the product's business", async () => {
    const ecommerceFind = vi.fn().mockReturnValue({
      toArray: vi.fn().mockResolvedValue([
        // saved against barcode 8A1929, which also exists in two other businesses
        { itemId: "item-1", businessId: "business-1", barcode: "8A1929" },
        // saved against 8A3147, which only exists in another business: those labels are used
        { itemId: "item-2", businessId: "business-1", barcode: "8A3147", barcodes: ["8A3147", " "] },
        // no barcode saved: shows nothing
        { itemId: "item-3", businessId: "business-1" },
        // typed in lower case in the ERP form: still finds label 8A1935
        { itemId: "item-4", businessId: "business-1", barcode: "8a1935" },
      ]),
    });
    const labelFind = vi.fn((query: Record<string, unknown>) => ({
      toArray: vi.fn().mockResolvedValue(
        "barcodeNo" in query
          ? [
              { _id: "own", barcodeNo: "8A1929", businessId: "business-1" },
              { _id: "other-a", barcodeNo: "8A1929", businessId: "business-2" },
              { _id: "moved", barcodeNo: "8A1929", businessId: "business-3", currentBusinessId: "business-1" },
              { _id: "elsewhere", barcodeNo: "8A3147", businessId: "business-2" },
              { _id: "upper-case", barcodeNo: "8A1935", businessId: "business-1" },
            ]
          : [{ _id: "item-3-label" }],
      ),
    }));
    const collection = vi.fn((name: string) => ({ find: name === "ecommerceproduct" ? ecommerceFind : labelFind }));
    const repository = new MongoBarcodeLabelRepository(async () => ({ db: { collection } }) as never);

    await expect(repository.getLabelIdsForProductTypes(["SAREES"])).resolves.toEqual(["own", "moved", "elsewhere", "upper-case"]);
    expect(labelFind).toHaveBeenCalledTimes(1);
    expect(labelFind).toHaveBeenCalledWith(
      { barcodeNo: { $in: ["8A1929", "8a1929", "8A3147", "8a3147", "8a1935", "8A1935"] } },
      { projection: { _id: 1, barcodeNo: 1, businessId: 1, currentBusinessId: 1 } },
    );
  });

  it("loads current ERP e-commerce classification values for category filters", async () => {
    const weaveId = "64a000000000000000000001";
    const ecommerceFind = vi.fn().mockReturnValue({
      toArray: vi.fn().mockResolvedValue([
        { byWeave: [weaveId] },
        { byWeave: [weaveId] },
      ]),
    });
    const optionsFind = vi.fn().mockReturnValue({
      toArray: vi.fn().mockResolvedValue([{ _id: weaveId, name: "Brocade" }]),
    });
    const collection = vi.fn((name: string) => ({
      find: name === "ecommerceproduct" ? ecommerceFind : optionsFind,
    }));
    const repository = new MongoBarcodeLabelRepository(async () => ({ db: { collection } }) as never);

    await expect(repository.getProductTypeClassifications(["SAREES"])).resolves.toMatchObject({
      weave: [{ value: "Brocade", label: "Brocade", count: 2 }],
      fabric: [],
      craft: [],
      occasion: [],
      color: [],
    });
  });

  it("builds subgroup filters from published ERP products and subgroup names", async () => {
    const ecommerceFind = vi.fn().mockReturnValue({
      toArray: vi.fn().mockResolvedValue([
        { itemId: "item-1", businessId: "business-1" },
        { itemId: "item-2", businessId: "business-1" },
      ]),
    });
    const itemFind = vi.fn().mockReturnValue({
      toArray: vi.fn().mockResolvedValue([
        { _id: "item-1", subgroup: "subgroup-1" },
        { _id: "item-2", subgroup: "subgroup-1" },
      ]),
    });
    const subgroupFind = vi.fn().mockReturnValue({
      toArray: vi.fn().mockResolvedValue([{ _id: "subgroup-1", name: "Kanchipuram" }]),
    });
    const collection = vi.fn((name: string) => ({
      find: name === "ecommerceproduct" ? ecommerceFind : name === "items" ? itemFind : subgroupFind,
    }));
    const repository = new MongoBarcodeLabelRepository(async () => ({ db: { collection } }) as never);

    await expect(repository.getProductTypeSubgroups(["SAREES"])).resolves.toEqual([
      { value: "subgroup-1", label: "Kanchipuram", count: 2 },
    ]);
    expect(subgroupFind).toHaveBeenCalledWith(
      { _id: { $in: ["subgroup-1", "subgroup-1"] } },
      { projection: { _id: 1, name: 1, subgroupName: 1 } },
    );
  });

  it("limits public catalogues to in-stock labels with positive or unspecified quantity", async () => {
    const repository = new MongoBarcodeLabelRepository(async () => ({} as never));

    await repository.list({ availableOnly: true, limit: 48 });

    const match = aggregate.mock.calls[0][0][0].$match.$and;
    expect(match[0]).toEqual({ status: "IN_STOCK" });
    expect(match[1].$expr.$or[1]).toEqual({
      $gt: [
        {
          $ifNull: [
            { $convert: { input: "$qtyNum", to: "double", onError: null, onNull: null } },
            { $convert: { input: "$qty", to: "double", onError: null, onNull: null } },
          ],
        },
        0,
      ],
    });

  });

  it("keeps zero-quantity IN_STOCK labels available for display only", async () => {
    const repository = new MongoBarcodeLabelRepository(async () => ({} as never));

    await repository.list({ inStockStatusOnly: true, limit: 48 });

    expect(aggregate.mock.calls[0][0][0].$match).toEqual({ status: "IN_STOCK" });
  });

  it("matches a detail URL to one ERP label by barcode", async () => {
    const repository = new MongoBarcodeLabelRepository(async () => ({} as never));

    await repository.list({ barcodes: ["8A1101"], limit: 1 });

    expect(aggregate.mock.calls[0][0][0].$match).toEqual({ barcodeNo: { $in: ["8A1101"] } });
  });
});
