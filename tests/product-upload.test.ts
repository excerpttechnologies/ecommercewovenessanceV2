import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  isSafeUploadSegment,
  productUploadUrl,
  pruneProductUploads,
  resolveUploadFile,
  saveProductImage,
  sniffProductImageType,
  uploadContentType,
} from "@/lib/product-upload";

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const WEBP = new Uint8Array([...Buffer.from("RIFF"), 0x24, 0x00, 0x00, 0x00, ...Buffer.from("WEBPVP8 ")]);

const temporaryDirectories: string[] = [];

async function temporaryDirectory() {
  const directory = await mkdtemp(path.join(tmpdir(), "woven-upload-"));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("product image upload helpers", () => {
  it("detects JPEG, PNG and WebP from magic bytes", () => {
    expect(sniffProductImageType(JPEG)).toBe("image/jpeg");
    expect(sniffProductImageType(PNG)).toBe("image/png");
    expect(sniffProductImageType(WEBP)).toBe("image/webp");
    expect(sniffProductImageType(Buffer.from("<svg></svg>"))).toBeUndefined();
  });

  it("rejects path traversal segments", () => {
    expect(isSafeUploadSegment("4A1277")).toBe(true);
    expect(isSafeUploadSegment("4a1277-01.jpg")).toBe(true);
    expect(isSafeUploadSegment("..")).toBe(false);
    expect(isSafeUploadSegment("../secret")).toBe(false);
    expect(isSafeUploadSegment("a/b")).toBe(false);
    expect(isSafeUploadSegment("")).toBe(false);
  });

  it("keeps resolved files inside the upload root", () => {
    const root = path.resolve("uploads");
    expect(resolveUploadFile(root, ["products", "4A1277", "one.jpg"])).toBe(
      path.join(root, "products", "4A1277", "one.jpg"),
    );
    expect(resolveUploadFile(root, ["products", "..", "secret.jpg"])).toBeUndefined();
    expect(resolveUploadFile(root, ["products", "4A1277", "..", "..", "secret.jpg"])).toBeUndefined();
  });

  it("maps served extensions to image content types", () => {
    expect(uploadContentType("one.jpg")).toBe("image/jpeg");
    expect(uploadContentType("one.png")).toBe("image/png");
    expect(uploadContentType("one.webp")).toBe("image/webp");
    expect(uploadContentType("one.svg")).toBeUndefined();
  });

  it("stores a valid image outside MongoDB and returns its URL", async () => {
    const root = await temporaryDirectory();
    const saved = await saveProductImage({
      root,
      sku: "4A1277",
      bytes: JPEG,
      declaredMime: "image/jpeg",
      maxBytes: 1024,
    });

    expect(saved.url).toBe(productUploadUrl("4A1277", saved.fileName));
    expect(saved.url).toMatch(/^\/api\/v1\/uploads\/products\/4a1277\/[a-f0-9-]+\.jpg$/);
    const file = resolveUploadFile(path.resolve(root), saved.url.split("/").slice(4));
    expect(file).toBeDefined();
    expect(await readFile(file!)).toEqual(Buffer.from(JPEG));
  });

  it("reuses the same file when identical bytes are uploaded twice for one product", async () => {
    const root = await temporaryDirectory();
    const first = await saveProductImage({ root, sku: "4A1277", bytes: JPEG, maxBytes: 1024 });
    const second = await saveProductImage({ root, sku: "4A1277", bytes: JPEG, maxBytes: 1024 });

    expect(second.url).toBe(first.url);
    expect(await readdir(path.join(root, "products", "4a1277"))).toEqual([first.fileName]);
  });

  it("prunes removed uploads for one product without touching another product", async () => {
    const root = await temporaryDirectory();
    const kept = await saveProductImage({ root, sku: "4A1277", bytes: JPEG, maxBytes: 1024 });
    const removed = await saveProductImage({ root, sku: "4A1277", bytes: PNG, maxBytes: 1024 });
    const other = await saveProductImage({ root, sku: "8A2524", bytes: WEBP, maxBytes: 1024 });

    expect(await pruneProductUploads(root, "4A1277", [kept.url])).toBe(1);
    expect(await readdir(path.join(root, "products", "4a1277"))).toEqual([kept.fileName]);
    expect(await readdir(path.join(root, "products", "8a2524"))).toEqual([other.fileName]);
    expect(removed.url).not.toBe(kept.url);
  });

  it("rejects empty, oversized, mismatched and invalid files", async () => {
    const root = await temporaryDirectory();
    const base = { root, sku: "4A1277", maxBytes: 8 };
    await expect(saveProductImage({ ...base, bytes: new Uint8Array() })).rejects.toMatchObject({ code: "EMPTY_FILE" });
    await expect(saveProductImage({ ...base, bytes: new Uint8Array(9).fill(1) })).rejects.toMatchObject({ code: "FILE_TOO_LARGE" });
    await expect(saveProductImage({ ...base, bytes: JPEG, declaredMime: "image/png", maxBytes: 1024 })).rejects.toMatchObject({ code: "MIME_MISMATCH" });
    await expect(saveProductImage({ ...base, bytes: Buffer.from("not an image"), maxBytes: 1024 })).rejects.toMatchObject({ code: "UNSUPPORTED_IMAGE" });
  });
});
