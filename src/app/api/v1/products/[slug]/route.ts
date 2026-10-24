import { fail, handler, ok } from "@/lib/api/response";
import { getMasterData } from "@/repositories";

export const dynamic = "force-dynamic";

/** GET /api/v1/products/:slug — full product + related */
export const GET = handler(async (_req: Request, ctx: { params: Promise<{ slug: string }> }) => {
  const { slug } = await ctx.params;
  const master = getMasterData();
  const product = await master.products.getBySlug(slug);
  if (!product) return fail("NOT_FOUND", "Product not found", 404);
  const related = await master.products.related(product, 8);
  return ok({ product, related });
});
