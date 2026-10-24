import type { NextRequest } from "next/server";
import { fail, handler, ok } from "@/lib/api/response";
import { parseProductListParams } from "@/lib/api/query";
import { getMasterData } from "@/repositories";

export const dynamic = "force-dynamic";

/** GET /api/v1/products/facets?category=sarees&fabric=... — filter options + counts for the sidebar */
export const GET = handler(async (req: NextRequest) => {
  const parsed = parseProductListParams(req.nextUrl.searchParams);
  if (!parsed.ok) return fail("VALIDATION_ERROR", "Invalid query parameters", 400, parsed.error.flatten());
  return ok(await getMasterData().products.facets(parsed.params));
});
