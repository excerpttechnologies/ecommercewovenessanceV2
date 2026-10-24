import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireAdmin, list, ecommerceRows, classificationRows, collectionReads, ecommerceFilters } = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  list: vi.fn(),
  ecommerceRows: [] as Record<string, unknown>[],
  classificationRows: [] as Record<string, unknown>[],
  collectionReads: [] as string[],
  ecommerceFilters: [] as unknown[],
}));
vi.mock("@/lib/auth", () => ({ requireAdmin: (...a: unknown[]) => requireAdmin(...a) }));
vi.mock("@/repositories", () => ({ getBarcodeLabels: () => ({ list, facets: list, getByBarcode: vi.fn() }) }));
vi.mock("@/lib/db", async (orig) => ({
  ...(await orig<typeof import("@/lib/db")>()),
  getErpConnection: async () => ({
    db: {
      collection: (name: string) => {
        collectionReads.push(name);
        return {
          find: (filter: unknown) => {
            if (name === "ecommerceproduct") ecommerceFilters.push(filter);
            return {
              sort: () => ({ toArray: async () => name === "ecommerceproduct" ? ecommerceRows : [] }),
              toArray: async () => classificationRows,
            };
          },
        };
      },
    },
  }),
  getWebConnection: () => Promise.reject(new Error("web db down")),
  toObjectIdOrString: (id: string) => id,
}));

const { GET } = await import("@/app/api/v1/admin/products/route");
const { GET: GET_FACETS } = await import("@/app/api/v1/admin/products/facets/route");
const req = (qs = "") => ({ nextUrl: new URL(`http://localhost/api/v1/admin/products${qs}`) }) as never;

describe("GET /api/v1/admin/products", () => {
  beforeEach(() => {
    requireAdmin.mockReset().mockResolvedValue({ kind: "admin", permissions: ["*"] });
    list.mockReset();
    ecommerceRows.length = 0;
    classificationRows.length = 0;
    collectionReads.length = 0;
    ecommerceFilters.length = 0;
  });

  it("refuses requests without an admin session", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    requireAdmin.mockRejectedValue(Object.assign(new Error("Admin login required"), { status: 401, code: "UNAUTHENTICATED" }));
    const res = await GET(req());
    expect(res.status).toBe(401);
    expect(list).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("turns an unreachable RetailERP into a friendly 503 without leaking internals", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    list.mockRejectedValue(new Error("querySrv ENOTFOUND _mongodb._tcp.cluster0.e3s8dbr.mongodb.net (mongodb+srv://user:s3cret@cluster0.e3s8dbr.mongodb.net)"));
    for (const [handler, r] of [[GET, req()], [GET_FACETS, undefined]] as const) {
      const res = await (handler as (r?: unknown) => Promise<Response>)(r);
      const text = await res.text();
      expect(res.status).toBe(503);
      expect(JSON.parse(text).error.code).toBe("ERP_UNAVAILABLE");
      expect(text).not.toMatch(/e3s8dbr|mongodb|s3cret|ENOTFOUND/);
    }
    expect(spy.mock.calls.flat().join(" ")).not.toContain("s3cret"); // server log is redacted too
    spy.mockRestore();
  });

  it("still returns ERP rows when the website database is down", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    list.mockResolvedValue({ items: [{ id: "1", barcode: "OU5886", name: "DU-P", slug: "du-p-ou5886" }], total: 1, page: 1, limit: 40, pages: 1, skipped: 0 });
    const res = await GET(req("?q=OU5886"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toEqual([{ id: "1", barcode: "OU5886", name: "DU-P", slug: "du-p-ou5886", web: null, erpEcommerce: null }]);
    expect(body.meta).toMatchObject({ total: 1, pages: 1, source: "erp", collection: "barcodeLabel", readOnly: true });
    expect(list).toHaveBeenCalledWith({ q: "OU5886", page: 1, limit: 40 });
    spy.mockRestore();
  });

  it("loads ecommerceproduct by barcodeLabel item and business references", async () => {
    list.mockResolvedValue({
      items: [{ id: "label-1", barcode: "OU5886", name: "DU-P", itemId: "item-1", businessId: "business-1" }],
      total: 1,
      page: 1,
      limit: 40,
      pages: 1,
      skipped: 0,
    });
    ecommerceRows.push({
      _id: "catalog-1",
      itemId: "item-1",
      businessId: "business-1",
      displayName: "Storefront name",
      ecommItemCode: "EC-123",
      barcodePriceOverride: 1250,
      barcodeQtyOverride: 4,
      ecommOffPercent: 10,
      byWeave: ["64a000000000000000000001"],
      byFabric: ["64a000000000000000000002"],
      byCraft: ["64a000000000000000000003"],
      byOccasion: ["64a000000000000000000004"],
      isPublished: true,
      isFeatured: true,
      productType: "SAREES",
      seoTitle: "Storefront SEO",
      slug: "storefront-name",
      additionalImages: ["image-1.jpg"],
    });
    classificationRows.push(
      { _id: "64a000000000000000000001", name: "Brocade" },
      { _id: "64a000000000000000000002", name: "Silk" },
      { _id: "64a000000000000000000003", name: "Zari" },
      { _id: "64a000000000000000000004", name: "Wedding" },
    );

    const response = await GET(req());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(collectionReads).toContain("ecommerceproduct");
    expect(ecommerceFilters[0]).toEqual({
      $or: [{
        itemId: { $in: ["item-1"] },
        businessId: { $in: ["business-1"] },
      }],
    });
    expect(body.data[0].erpEcommerce).toMatchObject({
      id: "catalog-1",
      productName: "Storefront name",
      displayName: "Storefront name",
      ecommItemCode: "EC-123",
      barcodePriceOverride: 1250,
      barcodeQtyOverride: 4,
      ecommOffPercent: 10,
      attributes: { weave: "Brocade", fabric: "Silk", craft: "Zari", occasion: "Wedding" },
      isPublished: true,
      isFeatured: true,
      productType: "SAREES",
      seo: { title: "Storefront SEO" },
      slug: "storefront-name",
    });
    expect(body.data[0].erpEcommerce.raw).toMatchObject({
      displayName: "Storefront name",
      byWeave: ["64a000000000000000000001"],
      additionalImages: ["image-1.jpg"],
    });
  });

  it("rejects malformed queries before touching the database", async () => {
    const res = await GET(req("?limit=5000"));
    expect(res.status).toBe(400);
    expect(list).not.toHaveBeenCalled();
  });
});
