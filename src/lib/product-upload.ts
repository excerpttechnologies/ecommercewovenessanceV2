import { createHash } from "node:crypto";
import { mkdir, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Website-owned product photo uploads.
 *
 * Binaries live on disk under UPLOAD_ROOT/products/<sku>/ and are served through
 * /api/v1/uploads/…; MongoDB only stores the returned URL. This keeps product records
 * small and works with the existing gallery URL fields.
 */

export const PRODUCT_UPLOAD_SUBDIR = "products";

export const PRODUCT_IMAGE_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export type ProductImageMime = keyof typeof PRODUCT_IMAGE_TYPES;

const CONTENT_TYPES: Record<string, ProductImageMime> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

function ascii(bytes: Uint8Array, start: number, length: number): string {
  let value = "";
  for (let index = start; index < start + length; index += 1) value += String.fromCharCode(bytes[index] ?? 0);
  return value;
}

/** Detects the real image type from magic bytes; the declared MIME type is not trusted. */
export function sniffProductImageType(bytes: Uint8Array): ProductImageMime | undefined {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (
    bytes.length >= 8
    && bytes[0] === 0x89
    && ascii(bytes, 1, 3) === "PNG"
    && bytes[4] === 0x0d
    && bytes[5] === 0x0a
    && bytes[6] === 0x1a
    && bytes[7] === 0x0a
  ) return "image/png";
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") return "image/webp";
  return undefined;
}

/** One path segment: no separators, no "." / "..". */
export function isSafeUploadSegment(value: string): boolean {
  return /^[a-z0-9][a-z0-9._-]{0,119}$/i.test(value) && value !== "." && value !== "..";
}

export function productUploadPrefix(sku: string): string {
  return `/api/v1/uploads/${PRODUCT_UPLOAD_SUBDIR}/${encodeURIComponent(sku.toLowerCase())}/`;
}

export function productUploadUrl(sku: string, fileName: string): string {
  return `${productUploadPrefix(sku)}${encodeURIComponent(fileName)}`;
}

export interface SavedProductImage {
  fileName: string;
  url: string;
  mime: ProductImageMime;
  bytes: number;
}

export async function saveProductImage({
  root,
  sku,
  bytes,
  declaredMime,
  maxBytes,
}: {
  root: string;
  sku: string;
  bytes: Uint8Array;
  declaredMime?: string;
  maxBytes: number;
}): Promise<SavedProductImage> {
  if (!isSafeUploadSegment(sku)) {
    throw Object.assign(new Error("Invalid product code for an image upload"), { status: 400, code: "INVALID_SKU" });
  }
  if (!bytes.length) {
    throw Object.assign(new Error("The uploaded file is empty"), { status: 400, code: "EMPTY_FILE" });
  }
  if (bytes.length > maxBytes) {
    throw Object.assign(new Error(`Each image must be ${Math.round(maxBytes / (1024 * 1024))} MB or smaller`), {
      status: 413,
      code: "FILE_TOO_LARGE",
    });
  }
  const mime = sniffProductImageType(bytes);
  if (!mime) {
    throw Object.assign(new Error("Upload a JPEG, PNG or WebP image"), { status: 415, code: "UNSUPPORTED_IMAGE" });
  }
  if (declaredMime && declaredMime !== mime && !(declaredMime === "image/jpg" && mime === "image/jpeg")) {
    throw Object.assign(new Error("The file content does not match its image type"), { status: 415, code: "MIME_MISMATCH" });
  }

  const directory = path.join(root, PRODUCT_UPLOAD_SUBDIR, sku.toLowerCase());
  await mkdir(directory, { recursive: true });
  // Content-addressed names make repeat uploads of the same photograph idempotent.
  const digest = createHash("sha256").update(bytes).digest("hex").slice(0, 48);
  const fileName = `${digest}.${PRODUCT_IMAGE_TYPES[mime]}`;
  const file = path.join(directory, fileName);
  try {
    await writeFile(file, bytes, { flag: "wx" });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }
  return { fileName, url: productUploadUrl(sku, fileName), mime, bytes: bytes.length };
}

function fileNameFromUrl(url: string, sku: string): string | undefined {
  try {
    const pathname = new URL(url, "http://localhost").pathname;
    const prefix = productUploadPrefix(sku);
    if (!pathname.startsWith(prefix)) return undefined;
    const fileName = pathname.slice(prefix.length);
    if (!fileName || fileName.includes("/") || !isSafeUploadSegment(fileName)) return undefined;
    return fileName;
  } catch {
    return undefined;
  }
}

/**
 * Deletes website-uploaded files for one SKU that are no longer referenced by its saved gallery.
 * Other products' folders and external/ERP URLs are never touched.
 */
export async function pruneProductUploads(root: string, sku: string, keepUrls: readonly string[]): Promise<number> {
  if (!isSafeUploadSegment(sku)) return 0;
  const directory = path.join(root, PRODUCT_UPLOAD_SUBDIR, sku.toLowerCase());
  let names: string[];
  try {
    names = await readdir(directory);
  } catch {
    return 0;
  }
  const keep = new Set(keepUrls.map((url) => fileNameFromUrl(url, sku)).filter((name): name is string => Boolean(name)));
  let removed = 0;
  for (const name of names) {
    if (!isSafeUploadSegment(name) || keep.has(name)) continue;
    try {
      await unlink(path.join(directory, name));
      removed += 1;
    } catch {
      // A file removed by another request is already in the desired state.
    }
  }
  return removed;
}

/** Resolves a public upload URL back to a file, rejecting traversal and odd segments. */
export function resolveUploadFile(root: string, segments: string[]): string | undefined {
  if (!segments.length || segments.some((segment) => !isSafeUploadSegment(segment))) return undefined;
  const base = path.resolve(root);
  const file = path.resolve(base, ...segments);
  return file.startsWith(`${base}${path.sep}`) ? file : undefined;
}

export function uploadContentType(fileName: string): ProductImageMime | undefined {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  return CONTENT_TYPES[extension];
}
