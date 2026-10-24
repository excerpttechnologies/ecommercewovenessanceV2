import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireAdmin, getErpReviewSummary } = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  getErpReviewSummary: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireAdmin }));
vi.mock("@/lib/admin/erp-reviews", () => ({ getErpReviewSummary }));

const { GET } = await import("@/app/api/v1/admin/reviews/route");
const request = (query = "") => ({
  nextUrl: new URL(`http://localhost/api/v1/admin/reviews${query}`),
}) as never;

describe("GET /api/v1/admin/reviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdmin.mockResolvedValue({ id: "admin-1" });
    getErpReviewSummary.mockResolvedValue({
      summary: {
        totalItems: 10,
        reviewsEnabledItems: 10,
        productsWithReviews: 0,
        totalReviews: 0,
        verifiedPurchaseReviews: 0,
        averageRating: 0,
      },
      items: [],
      total: 0,
      page: 1,
      limit: 50,
      pages: 0,
    });
  });

  it("returns live ERP review aggregates and identifies their source", async () => {
    const response = await GET(request("?q=silk&page=2&limit=20"));
    const body = await response.json();

    expect(requireAdmin).toHaveBeenCalledWith("reviews:moderate");
    expect(getErpReviewSummary).toHaveBeenCalledWith({ search: "silk", page: 2, limit: 20 });
    expect(body).toMatchObject({
      ok: true,
      data: [],
      meta: {
        source: "erp",
        collection: "items",
        summary: { totalItems: 10, totalReviews: 0 },
      },
    });
  });

  it("does not query ERP when admin authorization fails", async () => {
    requireAdmin.mockRejectedValue(Object.assign(new Error("Admin login required"), {
      status: 401,
      code: "UNAUTHENTICATED",
    }));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await GET(request());

    expect(response.status).toBe(401);
    expect(getErpReviewSummary).not.toHaveBeenCalled();
    log.mockRestore();
  });
});
