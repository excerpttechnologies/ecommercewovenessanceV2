import { fail, handler, ok } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth";
import { redactMongoUri } from "@/lib/db";
import { getBarcodeLabels } from "@/repositories";

export const dynamic = "force-dynamic";

/** GET /api/v1/admin/products/facets — filter options with live counts from RetailERP barcodeLabel. */
export const GET = handler(async () => {
  await requireAdmin("products:read");
  try {
    return ok(await getBarcodeLabels().facets());
  } catch (e) {
    console.error("[admin/products/facets] barcodeLabel aggregation failed:", redactMongoUri(String((e as Error)?.message ?? e)));
    return fail("ERP_UNAVAILABLE", "Unable to load filters. Please try again.", 503);
  }
});
