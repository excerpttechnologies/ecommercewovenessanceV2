import type { NextRequest } from "next/server";
import { handler, ok } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth";
import { getErpReviewSummary } from "@/lib/admin/erp-reviews";

export const dynamic = "force-dynamic";

export const GET = handler(async (req: NextRequest) => {
  await requireAdmin("reviews:moderate");
  const page = Number(req.nextUrl.searchParams.get("page") ?? 1);
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? 50);
  const result = await getErpReviewSummary({
    search: req.nextUrl.searchParams.get("q") ?? "",
    page: Number.isFinite(page) ? page : 1,
    limit: Number.isFinite(limit) ? limit : 50,
  });
  return ok(result.items, {
    total: result.total,
    page: result.page,
    limit: result.limit,
    pages: result.pages,
    summary: result.summary,
    source: "erp",
    collection: "items",
  });
});
