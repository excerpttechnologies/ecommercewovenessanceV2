import type { NextRequest } from "next/server";
import { ERP_CATEGORY_TITLES, getBarcodeImageSeries, type StorefrontCategoryGroup } from "@/lib/barcode-image-series";
import { redactMongoUri } from "@/lib/db";
import { fail, handler, ok } from "@/lib/api/response";

export const dynamic = "force-dynamic";

/** GET /api/v1/products/erp-images?group=<storefront-category> */
export const GET = handler(async (req: NextRequest) => {
  const group = req.nextUrl.searchParams.get("group");
  if (!group || !Object.hasOwn(ERP_CATEGORY_TITLES, group)) {
    return fail("VALIDATION_ERROR", "group must be a supported storefront category", 400);
  }

  try {
    const series = await getBarcodeImageSeries(group as StorefrontCategoryGroup);
    return ok(series, { group, source: "erp", collection: "barcodeLabel" });
  } catch (error) {
    console.error("[products/erp-images] RetailERP query failed:", redactMongoUri(String((error as Error)?.message ?? error)));
    return fail("ERP_UNAVAILABLE", "Unable to load product images. Please try again.", 503);
  }
});