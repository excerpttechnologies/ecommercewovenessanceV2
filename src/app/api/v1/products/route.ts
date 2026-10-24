import type { NextRequest } from "next/server";
import { fail, handler, ok } from "@/lib/api/response";
import { parseProductListParams } from "@/lib/api/query";
import { getMasterData } from "@/repositories";

export const dynamic = "force-dynamic";

/** GET /api/v1/products?category=sarees&fabric=Kanchipuram%20Silk,Banarasi%20Silk&sort=price_asc&page=1 */
export const GET = handler(async (req: NextRequest) => {
  const parsed = parseProductListParams(req.nextUrl.searchParams);
  if (!parsed.ok) return fail("VALIDATION_ERROR", "Invalid query parameters", 400, parsed.error.flatten());
  const result = await getMasterData().products.list(parsed.params);
  const { items, ...meta } = result;
  return ok(items, meta);
});
