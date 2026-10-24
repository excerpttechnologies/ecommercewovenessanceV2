import { beforeEach, describe, expect, it, vi } from "vitest";

const { getErpConnection, aggregate, toArray } = vi.hoisted(() => ({
  getErpConnection: vi.fn(),
  aggregate: vi.fn(),
  toArray: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ getErpConnection }));

const { getErpReviewSummary } = await import("@/lib/admin/erp-reviews");

describe("getErpReviewSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getErpConnection.mockResolvedValue({
      db: { collection: (name: string) => {
        expect(name).toBe("items");
        return { aggregate };
      } },
    });
    aggregate.mockReturnValue({ toArray });
    toArray.mockResolvedValue([{
      summary: [{
        totalItems: 18790,
        reviewsEnabledItems: 18790,
        productsWithReviews: 2,
        totalReviews: 5,
        verifiedPurchaseReviews: 3,
        averageRating: 4.6,
      }],
      items: [{
        _id: "item-1",
        itemCode: "SKU-1",
        productName: "Silk saree",
        averageRating: 4.6,
        totalReviews: 5,
        verifiedPurchaseReviews: 3,
      }],
      total: [{ value: 1 }],
    }]);
  });

  it("reads product review aggregates from ERP and returns pagination", async () => {
    const result = await getErpReviewSummary({ search: "", page: 1, limit: 50 });

    expect(result).toEqual({
      summary: {
        totalItems: 18790,
        reviewsEnabledItems: 18790,
        productsWithReviews: 2,
        totalReviews: 5,
        verifiedPurchaseReviews: 3,
        averageRating: 4.6,
      },
      items: [{
        _id: "item-1",
        itemCode: "SKU-1",
        productName: "Silk saree",
        averageRating: 4.6,
        totalReviews: 5,
        verifiedPurchaseReviews: 3,
      }],
      total: 1,
      page: 1,
      limit: 50,
      pages: 1,
    });
    expect(aggregate).toHaveBeenCalledWith([
      expect.objectContaining({
        $facet: expect.objectContaining({
          summary: expect.any(Array),
          items: expect.arrayContaining([expect.objectContaining({ $match: { "reviews.totalReviews": { $gt: 0 } } })]),
        }),
      }),
    ]);
  });

  it("escapes search text and clamps pagination", async () => {
    await getErpReviewSummary({ search: "A.*", page: -2, limit: 500 });

    const pipeline = aggregate.mock.calls[0][0];
    const itemFacet = pipeline[0].$facet.items;
    expect(itemFacet[0].$match.$or[0]["identity.itemCode"].$regex).toBe("A\\.\\*");
    expect(itemFacet[2].$skip).toBe(0);
    expect(itemFacet[3].$limit).toBe(100);
  });

  it("returns empty summary defaults when the ERP has no items", async () => {
    toArray.mockResolvedValueOnce([{ summary: [], items: [], total: [] }]);

    const result = await getErpReviewSummary({ search: "", page: 1, limit: 50 });

    expect(result.summary).toEqual({
      totalItems: 0,
      reviewsEnabledItems: 0,
      productsWithReviews: 0,
      totalReviews: 0,
      verifiedPurchaseReviews: 0,
      averageRating: 0,
    });
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });
});
