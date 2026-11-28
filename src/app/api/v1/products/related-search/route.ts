import type { NextRequest } from "next/server";
import { z } from "zod";
import { fail, handler, ok } from "@/lib/api/response";
import { normalizeBarcode } from "@/lib/barcode-search";
import { getMasterData } from "@/repositories";
import type { ProductCard } from "@/domain/types";

export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  q: z.string().trim().min(1).max(100),
  exclude: z.string().max(1000).optional(),
  limit: z.coerce.number().int().min(1).max(48).default(24),
});

/** GET /api/v1/products/related-search?q=9A2594&exclude=9A2594&limit=24 */
export const GET = handler(async (req: NextRequest) => {
  const sp = req.nextUrl.searchParams;
  const parsed = QuerySchema.safeParse({
    q: sp.get("q") ?? "",
    exclude: sp.get("exclude") ?? undefined,
    limit: sp.get("limit") ?? undefined,
  });
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", "Invalid query parameters", 400, parsed.error.flatten());
  }

  const { q, exclude, limit } = parsed.data;
  const excludeSkus = (exclude ?? "")
    .split(",")
    .map((value) => normalizeBarcode(value))
    .filter(Boolean);

  const syntheticPrimary: ProductCard[] = excludeSkus.map((sku) => ({
    id: sku,
    sku,
    slug: sku.toLowerCase(),
    name: `Code ${sku}`,
    category: "",
    pricing: { mrp: 0, sellingPrice: 0, discountPercent: 0, gstPercent: 5, currency: "INR" },
    stock: { qty: 1, status: "in_stock" },
    images: [],
    isNewArrival: false,
    source: "erp",
  }));

  const items = await getMasterData().products.relatedForSearch(q, syntheticPrimary, limit);
  return ok(items, { total: items.length, query: q });
});
