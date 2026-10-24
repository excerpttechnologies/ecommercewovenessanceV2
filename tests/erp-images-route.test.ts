import { beforeEach, describe, expect, it, vi } from "vitest";

const getBarcodeImageSeries = vi.fn();
vi.mock("@/lib/barcode-image-series", () => ({ getBarcodeImageSeries }));

const { GET } = await import("@/app/api/v1/products/erp-images/route");
const req = (qs = "") => ({ nextUrl: new URL(`http://localhost/api/v1/products/erp-images${qs}`) }) as never;

describe("GET /api/v1/products/erp-images", () => {
  beforeEach(() => getBarcodeImageSeries.mockReset());

  it.each(["sarees", "fabrics", "plain-fabrics", "dupatta"] as const)("returns resolved ERP image series for %s", async (group) => {
    const series = [{ title: `${group} - 8A Series`, items: [{ barcode: "8A001", image: "https://images.example/item.jpg" }] }];
    getBarcodeImageSeries.mockResolvedValue(series);

    const response = await GET(req(`?group=${group}`));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ ok: true, data: series, meta: { group, source: "erp", collection: "barcodeLabel" } });
    expect(getBarcodeImageSeries).toHaveBeenCalledWith(group);
  });

  it("rejects missing or unsupported groups without querying RetailERP", async () => {
    for (const query of ["", "?group=other", "?group=plain_fabric"]) {
      const response = await GET(req(query));
      expect(response.status).toBe(400);
    }
    expect(getBarcodeImageSeries).not.toHaveBeenCalled();
  });

});