import { describe, expect, it, vi } from "vitest";
import { loadErpEcommerceCatalogs } from "@/lib/admin/erp-ecommerce-catalog";

describe("loadErpEcommerceCatalogs", () => {
  it("loads e-commerce details linked directly to a barcode-label ID", async () => {
    const labelId = "64a000000000000000000001";
    const ecommerceFind = vi.fn().mockReturnValue({
      sort: () => ({
        toArray: async () => [{
          _id: "ecommerce-product-1",
          erpDocumentId: labelId,
          displayName: "Brocade silk saree",
          productType: "SAREES",
        }],
      }),
    });
    const collection = vi.fn(() => ({ find: ecommerceFind }));
    const connection = { db: { collection } } as never;

    const catalogs = await loadErpEcommerceCatalogs(connection, [{ id: labelId }]);

    expect(ecommerceFind).toHaveBeenCalledWith({
      $or: [{ erpDocumentId: { $in: [labelId, expect.anything()] } }],
    });
    expect(catalogs.get(`label:${labelId}`)).toMatchObject({
      displayName: "Brocade silk saree",
      productType: "SAREES",
    });
  });
});
