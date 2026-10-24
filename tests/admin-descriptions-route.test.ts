import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireAdmin, getBySku, list, findOne, findOneAndUpdate, audit } = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  getBySku: vi.fn(),
  list: vi.fn(),
  findOne: vi.fn(),
  findOneAndUpdate: vi.fn(),
  audit: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireAdmin }));
vi.mock("@/lib/db", () => ({ getWebConnection: vi.fn().mockResolvedValue({}) }));
vi.mock("@/lib/audit", () => ({ audit }));
vi.mock("@/repositories", () => ({
  getMasterData: () => ({ products: { getBySku, list } }),
}));
vi.mock("@/models/web/content.models", () => ({
  ProductWebMetaModel: () => ({ findOne, findOneAndUpdate }),
}));

const { PATCH } = await import("@/app/api/v1/admin/descriptions/route");

describe("PATCH /api/v1/admin/descriptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdmin.mockResolvedValue({ id: "admin-1" });
    getBySku.mockResolvedValue({
      id: "product-1",
      sku: "SKU-1",
      slug: "saree-sku-1",
    });
    findOne.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) });
    findOneAndUpdate
      .mockReturnValueOnce({
        lean: () => Promise.reject({ code: 11000 }),
      })
      .mockReturnValueOnce({
        lean: () => Promise.resolve({
          sku: "SKU-1",
          cardTitle: "Updated saree title",
          cardDescription: "Linen · Teal",
          priceOverride: 8000,
        }),
      });
  });

  it("lets an admin save storefront title, description and price despite an old slug collision", async () => {
    const request = new Request("http://localhost/api/v1/admin/descriptions", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sku: "SKU-1",
        cardTitle: "Updated saree title",
        cardDescription: "Linen · Teal",
        priceOverride: 8000,
      }),
    });

    const response = await PATCH(request as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(requireAdmin).toHaveBeenCalledWith("products:write");
    expect(findOneAndUpdate).toHaveBeenCalledTimes(2);
    expect(findOneAndUpdate.mock.calls[0][1].$set).toMatchObject({
      cardTitle: "Updated saree title",
      cardDescription: "Linen · Teal",
      priceOverride: 8000,
    });
    expect(findOneAndUpdate.mock.calls[1][1].$setOnInsert.slug).toMatch(/^saree-sku-1-/);
    expect(findOneAndUpdate.mock.calls[1][1].$setOnInsert.itemCode).toBe("web:SKU-1");
    expect(body.data).toMatchObject({
      sku: "SKU-1",
      cardTitle: "Updated saree title",
      cardDescription: "Linen · Teal",
      priceOverride: 8000,
    });
  });
});
