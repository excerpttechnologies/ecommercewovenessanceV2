import { describe, expect, it } from "vitest";
import {
  ADDRESS_FIELDS,
  CATEGORY_FIELDS,
  PRODUCT_FIELDS,
  buildDoc,
  buildProductDoc,
  mapCategory,
  mapProduct,
  productSlug,
  skuCandidatesFromSlug,
  stockStatus,
  toProductCard,
  toArr,
  toBool,
  toImages,
  toNum,
} from "@/lib/erp-mapping";

const raw = {
  _id: "66f1a2b3c4d5e6f7a8b9c0d1",
  sku: "WE-SAR-0001",
  productName: "Kanchipuram Silk Saree — Yanai Motif",
  category: "Sarees",
  subCategory: "Kanchipuram",
  fabric: "Kanchipuram Silk",
  occasion: "Wedding, Festive",
  pattern: "Elephant (Yanai)",
  mrp: 42000,
  sellingPrice: 37800,
  gstPercent: 5,
  stockQty: 2,
  images: [{ url: "https://picsum.photos/seed/a/800/1000" }, "https://picsum.photos/seed/b/800/1000"],
  isActive: "Y",
  isNewArrival: 1,
  createdAt: new Date("2026-09-01T00:00:00Z"),
};

describe("mapProduct", () => {
  it("normalises an ERP-shaped document into the domain Product", () => {
    const p = mapProduct(raw, { source: "erp" });
    expect(p.id).toBe(raw._id);
    expect(p.sku).toBe("WE-SAR-0001");
    expect(p.name).toBe(raw.productName);
    expect(p.slug).toBe(productSlug(raw.productName, raw.sku));
    expect(p.occasion).toEqual(["Wedding", "Festive"]);
    expect(p.motif).toBe("Elephant (Yanai)");
    expect(p.pricing.discountPercent).toBe(10); // derived: (42000-37800)/42000
    expect(p.stock.status).toBe("low_stock");
    expect(p.images).toEqual(["https://picsum.photos/seed/a/800/1000", "https://picsum.photos/seed/b/800/1000"]);
    expect(p.isActive).toBe(true);
    expect(p.isNewArrival).toBe(true);
    expect(p.source).toBe("erp");
    expect(toProductCard(p).source).toBe("erp");
    expect(p.createdAt).toBe("2026-09-01T00:00:00.000Z");
  });

  it("respects an explicit discountPercent and honours a custom low-stock threshold", () => {
    const p = mapProduct({ ...raw, discountPercent: 15, stockQty: 6 }, { lowStockThreshold: 10 });
    expect(p.pricing.discountPercent).toBe(15);
    expect(p.stock.status).toBe("low_stock");
  });

  it("falls back to sellingPrice = mrp when sellingPrice is missing", () => {
    const p = mapProduct({ ...raw, sellingPrice: undefined });
    expect(p.pricing.sellingPrice).toBe(42000);
    expect(p.pricing.discountPercent).toBe(0);
  });
});

describe("mapCategory", () => {
  it("derives a slug from the name when the ERP has none", () => {
    const c = mapCategory({ _id: "1", categoryName: "Plain Fabrics", isActive: true, sortOrder: 3 });
    expect(c.slug).toBe("plain-fabrics");
    expect(c.name).toBe("Plain Fabrics");
  });
});

describe("normalisers", () => {
  it("toBool handles Y/N, 0/1 and booleans", () => {
    expect(toBool("Y")).toBe(true);
    expect(toBool("N")).toBe(false);
    expect(toBool(0)).toBe(false);
    expect(toBool("1")).toBe(true);
    expect(toBool(undefined, true)).toBe(true);
  });
  it("toArr handles csv strings and arrays", () => {
    expect(toArr("a, b,c")).toEqual(["a", "b", "c"]);
    expect(toArr(["x"])).toEqual(["x"]);
    expect(toArr(null)).toEqual([]);
  });
  it("toNum tolerates numeric strings", () => {
    expect(toNum("1,250.50")).toBe(1250.5);
    expect(toNum("abc", 7)).toBe(7);
  });
  it("toImages accepts string[], {url}[] and csv", () => {
    expect(toImages("a.jpg,b.jpg")).toEqual(["a.jpg", "b.jpg"]);
    expect(toImages([{ url: "c.jpg" }])).toEqual(["c.jpg"]);
  });
  it("stockStatus thresholds", () => {
    expect(stockStatus(0)).toBe("out_of_stock");
    expect(stockStatus(3)).toBe("low_stock");
    expect(stockStatus(4)).toBe("in_stock");
  });
});

describe("buildDoc (reverse mapping)", () => {
  it("writes values under the ERP field paths and never sets _id", () => {
    const doc = buildProductDoc({ id: "should-be-ignored", name: "Test", motif: "Paisley", mrp: 100 });
    expect(doc).toEqual({ productName: "Test", pattern: "Paisley", mrp: 100 });
    expect(doc).not.toHaveProperty("_id");
  });

  it("supports dotted paths (nested ERP fields)", () => {
    const map = { price: "pricing.mrp", city: "address.city" } as const;
    const doc = buildDoc(map, { price: 10, city: "Bengaluru" });
    expect(doc).toEqual({ pricing: { mrp: 10 }, address: { city: "Bengaluru" } });
  });

  it("round-trips through mapProduct", () => {
    const doc = buildProductDoc({ sku: "X-1", name: "Round Trip", mrp: 500, sellingPrice: 400, isActive: true });
    const p = mapProduct({ _id: "abc", ...doc });
    expect(p.name).toBe("Round Trip");
    expect(p.pricing.discountPercent).toBe(20);
  });
});

describe("slugs", () => {
  it("productSlug is stable and URL-safe", () => {
    expect(productSlug("Kanchipuram Silk Saree — Yanai Motif", "WE-SAR-0001")).toBe("kanchipuram-silk-saree-yanai-motif-we-sar-0001");
  });
  it("skuCandidatesFromSlug returns tail tokens longest-last", () => {
    expect(skuCandidatesFromSlug("silk-saree-we-sar-0001", 3)).toEqual(["0001", "sar-0001", "we-sar-0001"]);
  });
});

describe("mapping tables", () => {
  it("every field map is a flat string record", () => {
    for (const m of [PRODUCT_FIELDS, CATEGORY_FIELDS, ADDRESS_FIELDS]) {
      for (const [k, v] of Object.entries(m)) {
        expect(typeof k).toBe("string");
        expect(typeof v).toBe("string");
        expect(v.length).toBeGreaterThan(0);
      }
    }
  });
});
