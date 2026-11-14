import path from "node:path";
import type { NextRequest } from "next/server";
import { fail, handler, ok } from "@/lib/api/response";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth";
import { env } from "@/lib/env";
import { saveProductImage } from "@/lib/product-upload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/v1/admin/products/gallery/upload
 * multipart/form-data: file, sku
 * Stores one real product photo on disk and returns the URL saved in productWebMeta.
 */
export const POST = handler(async (req: NextRequest) => {
  const actor = await requireAdmin("products:write");
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail("BAD_FORM", "Upload must be sent as multipart/form-data", 400);
  }

  const file = form.get("file");
  const sku = String(form.get("sku") ?? "").trim();
  if (!sku) return fail("VALIDATION_ERROR", "Product code is required", 422);
  if (!file || typeof file === "string" || typeof file.arrayBuffer !== "function") {
    return fail("VALIDATION_ERROR", "Choose an image file to upload", 422);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const saved = await saveProductImage({
    root: path.resolve(process.cwd(), env.UPLOAD_ROOT),
    sku,
    bytes,
    declaredMime: file.type || undefined,
    maxBytes: env.IMAGE_MAX_MB * 1024 * 1024,
  });
  await audit(actor, "productGallery.upload", "productWebMeta", sku, null, saved, req);
  return ok(saved);
});
