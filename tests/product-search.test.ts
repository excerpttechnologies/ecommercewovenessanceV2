import { beforeEach, describe, expect, it, vi } from "vitest";

const { find, countDocuments } = vi.hoisted(() => ({
  find: vi.fn(),
  countDocuments: vi.fn(),
}));

vi.mock("@/models/erp/product.model", () => ({
  ProductModel: () => ({ find, countDocuments }),
}));
vi.mock("@/models/web/content.models", () => ({
  ProductWebMetaModel: vi.fn(),
}));

const { MongoProductRepository } = await import("@/repositories/mongo/product.repository");

describe("product search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const query = {
      sort: vi.fn(),
      skip: vi.fn(),
      limit: vi.fn(),
      lean: vi.fn().mockResolvedValue([]),
    };
    query.sort.mockReturnValue(query);
    query.skip.mockReturnValue(query);
    query.limit.mockReturnValue(query);
    find.mockReturnValue(query);
    countDocuments.mockResolvedValue(0);
  });

  it.each([
    ["SAREES", /SAREE/i],
    ["saree", /saree/i],
  ])("searches product category fields for query %s", async (q, expectedPattern) => {
    const categories = {
      list: vi.fn().mockResolvedValue([]),
      getBySlug: vi.fn(),
      getById: vi.fn(),
      tree: vi.fn(),
    };
    const repository = new MongoProductRepository(
      async () => ({} as never),
      "erp",
      categories,
    );

    await repository.list({ q, limit: 6 });

    const filter = find.mock.calls[0][0];
    const searchOr = filter.$and.find((clause: { $or?: unknown[] }) => clause.$or)?.$or;
    expect(searchOr).toContainEqual({ category: expectedPattern });
    expect(searchOr).toContainEqual({ subCategory: expectedPattern });
    expect(JSON.stringify(filter)).not.toContain("images");
  });

});
