import { beforeEach, describe, expect, it, vi } from "vitest";

const { getErpConnection } = vi.hoisted(() => ({ getErpConnection: vi.fn() }));

vi.mock("@/lib/db", () => ({ getErpConnection }));

const { getErpReviewSummary } = await import("@/lib/admin/erp-reviews");

const EMPTY_SUMMARY = {
  totalItems: 0,
  reviewsEnabledItems: 0,
  productsWithReviews: 0,
  totalReviews: 0,
  verifiedPurchaseReviews: 0,
  averageRating: 0,
};

describe("getErpReviewSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getErpConnection.mockResolvedValue({ db: { collection: vi.fn() } });
  });

  // RetailERP keeps no per-review records and has no item review aggregates (verified against the
  // live database), so the admin Reviews screen must report an empty result rather than query a
  // collection that does not exist.
  it("reports an empty summary without querying the ERP", async () => {
    const result = await getErpReviewSummary({ search: "", page: 1, limit: 50 });

    expect(result).toEqual({ summary: EMPTY_SUMMARY, items: [], total: 0, page: 1, limit: 50, pages: 0 });
    expect(getErpConnection).not.toHaveBeenCalled();
  });

  it("clamps pagination to valid bounds", async () => {
    await expect(getErpReviewSummary({ search: "", page: -2, limit: 500 })).resolves.toMatchObject({ page: 1, limit: 100 });
    await expect(getErpReviewSummary({ search: "", page: 0, limit: 0 })).resolves.toMatchObject({ page: 1, limit: 1 });
  });

  it("ignores search text and still returns the empty result", async () => {
    const result = await getErpReviewSummary({ search: "A.*", page: 2, limit: 20 });

    expect(result).toEqual({ summary: EMPTY_SUMMARY, items: [], total: 0, page: 2, limit: 20, pages: 0 });
    expect(getErpConnection).not.toHaveBeenCalled();
  });
});
