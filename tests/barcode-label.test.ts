import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseBarcodeListParams } from "@/lib/api/query";
import { applyPrintDescriptionOverrides, ERP_CATEGORY_PRODUCT_TYPES } from "@/lib/barcode-image-series";
import { CODE128_PATTERNS, encodeCode128B } from "@/lib/barcode/code128";
import { barcodeImageUrl, isAllowedImageUrl, normalizeImageRef, presignS3Get, resolveRecordImage } from "@/lib/erp-images";
import { BARCODE_JOINED, barcodeProductToProduct, mapBarcodeLabel } from "@/lib/erp-mapping";

const BASE = "https://wovenessence.etpl.ai";
const SPACES = ["templeimg.blr1.digitaloceanspaces.com"];
const PLACEHOLDER = `data:image/jpeg;base64,${readFileSync(path.join(__dirname, "fixtures/erp-placeholder.jpg.b64"), "utf8").trim()}`;

describe("ERP storefront category groups", () => {
  it("maps storefront categories to ERP e-commerce product types", () => {
    expect(ERP_CATEGORY_PRODUCT_TYPES).toEqual({
      sarees: ["SAREES"],
      fabrics: ["FABRICS"],
      "plain-fabrics": ["PLAIN FABRICS"],
      dupatta: ["DUPATTA"],
      simple: ["Simple", "SIMPLE"],
    });
    const allProductTypes = Object.values(ERP_CATEGORY_PRODUCT_TYPES).flat();
    expect(new Set(allProductTypes).size).toBe(allProductTypes.length);
  });
});

/** Shape of a real grooretailerp1.barcodeLabel document (values trimmed). */
const label = {
  _id: { toHexString: () => "6abd1a091dd6ac4f2056d3c4" },
  barcodeNo: "6A2346",
  itemCode: "4-PU SLK",
  oldBarcode: "6A2346",
  supplierDescription: "handloom multi colour jari checks",
  printDescription: "handloom multi colour jari checks",
  qty: "12.85",
  qtyNum: 12.849999999999998,
  uom: "MTR",
  uomType: "MTR",
  retailPrice: "2080",
  offerPrice: "",
  hsn: "50072090",
  gst: "5",
  status: "IN_STOCK",
  batchType: "batch",
  groupId: "6a9187ddc1c6f8349932be26",
  businessId: "6a853ba0fb266c4358beb530",
  supplierId: "G589",
  imageUrl: "/api/files/66/6693a54d44985b1ddff76a2d061b8a1b76b0a740b515321d8677a873698cb2f1.jpg",
  createdAt: new Date("2026-09-30T10:00:00Z"),
  [BARCODE_JOINED.groupName]: "3 PC SET",
  [BARCODE_JOINED.businessName]: "TEMPLE FABRICS, SILKS & SAREES",
  [BARCODE_JOINED.supplierCode]: "G589",
  [BARCODE_JOINED.supplierName]: "SILK SUPPLIER",
};

describe("mapBarcodeLabel", () => {
  it("maps real barcodeLabel field names to the admin row", () => {
    const p = mapBarcodeLabel(label);
    expect(p).toMatchObject({
      id: "6abd1a091dd6ac4f2056d3c4",
      barcode: "6A2346",
      itemCode: "4-PU SLK",
      name: "handloom multi colour jari checks",
      qty: 12.85,
      uom: "MTR",
      price: 2080,
      gstPercent: 5,
      hsnCode: "50072090",
      status: "IN_STOCK",
      group: "3 PC SET",
      business: "TEMPLE FABRICS, SILKS & SAREES",
      supplierCode: "G589",
      supplierName: "SILK SUPPLIER",
      createdAt: "2026-09-30T10:00:00.000Z",
    });
    expect(p.slug).toBe("handloom-multi-colour-jari-checks-6a2346");
  });

  it("omits values that only repeat other fields or are empty", () => {
    const p = mapBarcodeLabel(label);
    expect(p.oldBarcode).toBeUndefined(); // same as barcode
    expect(p.printDescription).toBe("handloom multi colour jari checks");
    expect(p.offerPrice).toBeUndefined(); // ""
    expect("image" in p).toBe(false); // images are resolved by the repository
  });

  it("falls back through description fields and uomType", () => {
    const p = mapBarcodeLabel({ _id: "x", barcodeNo: "OU5886", itemCode: "OU5886", itemName: "15-SA", uom: "", uomType: "PC", qtyNum: 1, retailPrice: 980, offerPrice: "1089", oldBarcode: "G1308" });
    expect(p.name).toBe("15-SA");
    expect(p.itemName).toBeUndefined();
    expect(p.uom).toBe("PC");
    expect(p.offerPrice).toBe(1089);
    expect(p.oldBarcode).toBe("G1308");
    expect(p.group).toBeUndefined();
  });

  it("rejects a record without a barcode instead of inventing one", () => {
    expect(() => mapBarcodeLabel({ _id: "x", itemCode: "A" })).toThrow(/barcodeNo/);
  });
});

describe("applyPrintDescriptionOverrides", () => {
  it("uses the website print description override by barcode", () => {
    const product = mapBarcodeLabel(label);
    const [updated] = applyPrintDescriptionOverrides([product], new Map([[product.barcode, "Admin print description"]]));
    expect(updated.printDescription).toBe("Admin print description");
    expect(product.printDescription).toBe("handloom multi colour jari checks");
  });
});

describe("barcodeProductToProduct", () => {
  it("preserves the barcode SKU, ERP price, stock, and image for bag products", () => {
    const product = barcodeProductToProduct({ ...mapBarcodeLabel(label), image: "https://example.com/saree.jpg" });
    expect(product).toMatchObject({
      sku: "6A2346",
      pricing: { mrp: 2080, sellingPrice: 2080, hsnCode: "50072090" },
      stock: { qty: 12.85, status: "in_stock" },
      images: ["https://example.com/saree.jpg"],
      isActive: true,
      isBarcodeLabel: true,
    });
  });
});

describe("normalizeImageRef", () => {
  it("strips the expired presign from DigitalOcean Spaces URLs", () => {
    const stored = "https://templeimg.blr1.digitaloceanspaces.com/OU5886.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=DO00ABC%2F20260807%2Fblr1%2Fs3%2Faws4_request&X-Amz-Date=20260807T111213Z&X-Amz-Expires=300&X-Amz-Signature=abc&X-Amz-SignedHeaders=host";
    expect(normalizeImageRef(stored)).toEqual({ url: "https://templeimg.blr1.digitaloceanspaces.com/OU5886.jpg" });
    expect(normalizeImageRef("https://templeimg.blr1.digitaloceanspaces.com/1/1/barcodes/7A1257.jpg?X-Amz-Expires=300")).toEqual({ url: "https://templeimg.blr1.digitaloceanspaces.com/1/1/barcodes/7A1257.jpg" });
  });

  it("re-signs Spaces URLs when credentials are configured, only for allowed buckets", () => {
    const spaces = { accessKeyId: "KEY", secretAccessKey: "SECRET" };
    const r = normalizeImageRef("https://templeimg.blr1.digitaloceanspaces.com/OU5886.jpg?X-Amz-Expires=300", { spaces, spacesHosts: SPACES, now: new Date("2026-10-01T10:42:00Z") });
    const u = new URL((r as { url: string }).url);
    expect(u.pathname).toBe("/OU5886.jpg");
    expect(u.searchParams.get("X-Amz-Credential")).toBe("KEY/20261001/blr1/s3/aws4_request");
    expect(u.searchParams.get("X-Amz-Date")).toBe("20261001T100000Z"); // floored to the hour
    expect(u.searchParams.get("X-Amz-Signature")).toMatch(/^[0-9a-f]{64}$/);
    // never signs for a bucket that is not ours
    expect(normalizeImageRef("https://evil.nyc3.digitaloceanspaces.com/x.jpg", { spaces, spacesHosts: SPACES })).toEqual({ url: "https://evil.nyc3.digitaloceanspaces.com/x.jpg" });
  });

  it("serves relative paths from the deployed RetailERP app (ERP_IMAGE_BASE)", () => {
    expect(normalizeImageRef("/august_8A_images/4A1142.jpg", { base: BASE })).toEqual({ url: `${BASE}/august_8A_images/4A1142.jpg` });
    expect(normalizeImageRef("e4/e422.jpg", { base: BASE })).toEqual({ url: `${BASE}/e4/e422.jpg` });
    expect(normalizeImageRef("/august_8A_images/4A1142.jpg")).toBeNull(); // no base configured
  });

  it("recognises the ERP placeholder data URI but keeps real ones", () => {
    expect(normalizeImageRef(PLACEHOLDER)).toEqual({ placeholder: true });
    const real = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    expect(normalizeImageRef(real)).toEqual({ url: real });
    expect(normalizeImageRef("data:text/html;base64,PHNjcmlwdD4=")).toBeNull();
  });

  it("ignores blanks, non-strings and filesystem paths", () => {
    for (const v of ["", "   ", null, undefined, 42, "C:\\Users\\x\\a.jpg", "\\\\srv\\a.jpg"]) expect(normalizeImageRef(v, { base: BASE })).toBeNull();
  });
});

describe("isAllowedImageUrl", () => {
  it("allows only configured image hosts, the barcode image directory and data URIs", () => {
    const opts = { base: BASE, spacesHosts: SPACES };
    expect(isAllowedImageUrl("https://templeimg.blr1.digitaloceanspaces.com/a.jpg", opts)).toBe(true);
    expect(isAllowedImageUrl(`${BASE}/august_8A_images/a.jpg`, opts)).toBe(true);
    expect(isAllowedImageUrl("https://erp.wovenessence.in/august_8A_images/8A2524.jpg")).toBe(true);
    expect(isAllowedImageUrl("https://erp.wovenessence.in/private/a.jpg")).toBe(false);
    expect(isAllowedImageUrl("http://erp.wovenessence.in/august_8A_images/8A2524.jpg")).toBe(false);
    expect(isAllowedImageUrl("data:image/jpeg;base64,AA==", opts)).toBe(true);
    expect(isAllowedImageUrl("https://evil.nyc3.digitaloceanspaces.com/a.jpg", opts)).toBe(false);
    expect(isAllowedImageUrl("http://templeimg.blr1.digitaloceanspaces.com/a.jpg", opts)).toBe(false);
    expect(isAllowedImageUrl("http://wovenessencemobile.etpl.ai/uploads/a.jpg", opts)).toBe(false);
    expect(isAllowedImageUrl(`${BASE}/a.jpg`, { spacesHosts: SPACES })).toBe(false); // base not configured
  });
});

describe("barcodeImageUrl", () => {
  it("builds the ERP photo URL from a safe barcode", () => {
    expect(barcodeImageUrl("8A2524")).toBe("https://erp.wovenessence.in/august_8A_images/8A2524.jpg");
    expect(barcodeImageUrl("../private")).toBeUndefined();
  });
});

describe("resolveRecordImage", () => {
  let n = 0;
  const OPTS = { base: BASE, spacesHosts: SPACES };
  const seen: { url: string; method?: string; range?: string }[] = [];
  const fakeFetch = (status: Record<string, number | "throw" | "hang">) =>
    (async (url: string, init?: RequestInit) => {
      seen.push({ url, method: init?.method, range: new Headers(init?.headers).get("range") ?? undefined });
      const s = status[url];
      if (s === "throw") throw new Error("ENOTFOUND");
      if (s === "hang") return new Promise(() => {});
      const ok = s === 200 || s === 206;
      return new Response(ok ? "x" : null, { status: s ?? 404, headers: { "content-type": ok ? "image/jpeg" : "text/html" } });
    }) as unknown as typeof fetch;

  it("uses the first candidate that loads, in order, from the same record only", async () => {
    const a = `${BASE}/august_8A_images/T${++n}.jpg`;
    const b = `${BASE}/uploads/T${n}.jpg`;
    expect(await resolveRecordImage([a, b], OPTS, fakeFetch({ [a]: 206, [b]: 200 }))).toEqual({ image: a });
    const c = `https://templeimg.blr1.digitaloceanspaces.com/T${++n}.jpg`;
    const d = `${BASE}/uploads/T${n}.jpg`;
    expect(await resolveRecordImage([`${c}?X-Amz-Expires=300`, d], OPTS, fakeFetch({ [c]: 403, [d]: 200 }))).toEqual({ image: d });
  });

  it("checks with a 1-byte ranged GET, which presigned GET URLs accept", async () => {
    const a = `${BASE}/august_8A_images/T${++n}.jpg`;
    await resolveRecordImage([a], OPTS, fakeFetch({ [a]: 206 }));
    expect(seen.find((s) => s.url === a)).toEqual({ url: a, method: "GET", range: "bytes=0-0" });
  });

  it("uses the exact barcode image in Spaces before trying the unavailable ERP image host", async () => {
    const original = `${BASE}/august_8A_images/8A4001.jpg`;
    const spaces = `https://${SPACES[0]}/1/1/barcodes/8A4001.jpg`;

    expect(await resolveRecordImage([original], OPTS, fakeFetch({ [spaces]: 206 }))).toEqual({ image: spaces });
    expect(seen.find((entry) => entry.url === spaces)).toMatchObject({ method: "GET", range: "bytes=0-0" });
  });

  it("fetches the barcode-named ERP image without an ERP_IMAGE_BASE setting", async () => {
    const image = barcodeImageUrl("8A2525")!;

    const spaces = `https://${SPACES[0]}/1/1/barcodes/8A2525.jpg`;
    expect(await resolveRecordImage([image], OPTS, fakeFetch({ [image]: 206, [spaces]: 206 }))).toEqual({ image });
    expect(seen.find((entry) => entry.url === image)).toMatchObject({ method: "GET", range: "bytes=0-0" });
    expect(seen.some((entry) => entry.url === spaces)).toBe(false);
  });

  it("reports why there is no image", async () => {
    const e = `https://templeimg.blr1.digitaloceanspaces.com/T${++n}.jpg`;
    expect(await resolveRecordImage([e, ""], OPTS, fakeFetch({ [e]: 403 }))).toEqual({ imageIssue: "unavailable" });
    expect(await resolveRecordImage([PLACEHOLDER, ""], OPTS, fakeFetch({}))).toEqual({ imageIssue: "placeholder" });
    expect(await resolveRecordImage(["", undefined], OPTS, fakeFetch({}))).toEqual({ imageIssue: "none" });
  });

  it("never hands a disallowed host to the browser, nor contacts it", async () => {
    let called = false;
    const spy = (async () => { called = true; return new Response(null, { status: 200 }); }) as unknown as typeof fetch;
    expect(await resolveRecordImage(["http://wovenessencemobile.etpl.ai/uploads/x.jpg", "https://evil.nyc3.digitaloceanspaces.com/x.jpg"], OPTS, spy)).toEqual({ imageIssue: "unavailable" });
    expect(called).toBe(false);
  });

  it("does not cache transient 5xx answers as 'not an image'", async () => {
    const a = `${BASE}/august_8A_images/T${++n}.jpg`;
    expect(await resolveRecordImage([a], OPTS, fakeFetch({ [a]: 502 }))).toEqual({ image: a }); // unknown -> browser decides
    expect(await resolveRecordImage([a], OPTS, fakeFetch({ [a]: 200 }))).toEqual({ image: a });
    const b = `${BASE}/august_8A_images/T${++n}.jpg`;
    expect(await resolveRecordImage([b], OPTS, fakeFetch({ [b]: 404 }))).toEqual({ imageIssue: "unavailable" });
    expect(await resolveRecordImage([b], OPTS, fakeFetch({ [b]: 200 }))).toEqual({ imageIssue: "unavailable" }); // 404 is cached
  });

  it("stops waiting at the page deadline", async () => {
    const a = `${BASE}/august_8A_images/T${++n}.jpg`;
    const spaces = `https://${SPACES[0]}/1/1/barcodes/T${n}.jpg`;
    const t = Date.now();
    expect(await resolveRecordImage([a], OPTS, fakeFetch({ [spaces]: "hang" }), Date.now() + 50)).toEqual({ image: spaces });
    expect(Date.now() - t).toBeLessThan(1000);
  });

  it("tries the ERP image when the matching Spaces object cannot be reached", async () => {
    const down = "https://erp-down.example"; // own host: an unreachable host is skipped for 60 s afterwards
    const f = `${down}/august_8A_images/T${++n}.jpg`;
    const spaces = `https://${SPACES[0]}/1/1/barcodes/T${n}.jpg`;
    expect(await resolveRecordImage([f], { base: down, spacesHosts: SPACES }, fakeFetch({ [spaces]: "throw", [f]: 200 }))).toEqual({ image: f });
  });
});

describe("presignS3Get", () => {
  it("matches the AWS SigV4 query-string example", () => {
    const url = presignS3Get(
      new URL("https://examplebucket.s3.amazonaws.com/test.txt"),
      { accessKeyId: "AKIAIOSFODNN7EXAMPLE", secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" },
      "us-east-1",
      new Date("2013-05-24T00:00:00Z"),
      86400,
      false,
    );
    expect(new URL(url).searchParams.get("X-Amz-Signature")).toBe("aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404");
  });
});

describe("Code 128", () => {
  it("has a well-formed symbol table", () => {
    expect(CODE128_PATTERNS).toHaveLength(107);
    expect(new Set(CODE128_PATTERNS).size).toBe(107);
    CODE128_PATTERNS.forEach((p, i) => {
      const w = p.split("").map(Number);
      const bars = w.filter((_, j) => j % 2 === 0).reduce((a, b) => a + b, 0);
      const spaces = w.filter((_, j) => j % 2 === 1).reduce((a, b) => a + b, 0);
      expect(bars + spaces, `symbol ${i}`).toBe(i === 106 ? 13 : 11);
      if (i < 106) {
        expect(bars % 2, `bar parity of symbol ${i}`).toBe(0);
        expect(spaces % 2, `space parity of symbol ${i}`).toBe(1);
      }
    });
  });

  it("encodes a real barcode with the right checksum", () => {
    // OU5886: O=47 U=53 5=21 8=24 8=24 6=22; (104 + 47·1 + 53·2 + 21·3 + 24·4 + 24·5 + 22·6) mod 103 = 668 mod 103 = 50
    const s = encodeCode128B("OU5886")!;
    expect(s.values).toEqual([104, 47, 53, 21, 24, 24, 22, 50, 106]);
    expect(s.modules).toBe(11 + 6 * 11 + 11 + 13);
    expect(s.widths.length % 2).toBe(1); // starts and ends with a bar
  });

  it("refuses values it cannot encode", () => {
    expect(encodeCode128B("")).toBeNull();
    expect(encodeCode128B("4A1142\n")).toBeNull();
    expect(encodeCode128B("साड़ी")).toBeNull();
  });
});

describe("parseBarcodeListParams", () => {
  it("parses and bounds the admin list query", () => {
    const r = parseBarcodeListParams(new URLSearchParams("q=%20OU58%20&status=IN_STOCK&page=2&limit=500&group="));
    expect(r.ok).toBe(false); // limit > 96
    const ok = parseBarcodeListParams(new URLSearchParams("q=%20OU58%20&status=IN_STOCK&page=2&group="));
    expect(ok).toEqual({ ok: true, params: { q: "OU58", status: "IN_STOCK", page: 2, limit: 40 } });
  });
});
