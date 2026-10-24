import type { NextRequest } from "next/server";
import { z } from "zod";
import { fail, handler, ok } from "@/lib/api/response";
import { parseProductListParams } from "@/lib/api/query";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth";
import { getWebConnection } from "@/lib/db";
import { ProductWebMetaModel } from "@/models/web/content.models";
import { getMasterData } from "@/repositories";
import { randomUUID } from "node:crypto";

export const dynamic = "force-dynamic";

/** GET /api/v1/admin/descriptions?q=&page=&limit= */
export const GET = handler(async (req: NextRequest) => {
  await requireAdmin(["products:read", "products:write"]);
  const parsed = parseProductListParams(req.nextUrl.searchParams);
  if (!parsed.ok) return fail("VALIDATION_ERROR", "Invalid query", 400, parsed.error.flatten());
  const result = await getMasterData().products.list({ ...parsed.params, sort: "featured" });
  const { items, ...meta } = result;
  return ok(items, meta);
});

/** PATCH /api/v1/admin/descriptions { sku, cardTitle?, cardDescription?, priceOverride? } */
export const PATCH = handler(async (req: NextRequest) => {
  const actor = await requireAdmin("products:write");
  const parsed = z.object({
    sku: z.string().trim().min(1).max(120),
    cardTitle: z.string().trim().max(120).optional(),
    cardDescription: z.string().trim().max(240).optional(),
    priceOverride: z.number().finite().min(0.01).max(100_000_000).nullable().optional(),
  }).refine(({ cardTitle, cardDescription, priceOverride }) =>
    cardTitle !== undefined || cardDescription !== undefined || priceOverride !== undefined)
    .safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail("VALIDATION_ERROR", "Enter a product and at least one storefront field", 422, parsed.error.flatten());

  const { sku, ...fields } = parsed.data;
  const products = getMasterData().products;
  const product = await products.getBySku(sku)
    ?? (await products.list({ ids: [sku], limit: 1 })).items[0];
  if (!product) return fail("NOT_FOUND", "Product not found", 404);

  const Model = ProductWebMetaModel(await getWebConnection());
  const metaSku = product.sku;
  let lookupSku = metaSku;
  let before = await Model.findOne({ sku: metaSku }).lean();
  if (!before && sku !== metaSku) {
    before = await Model.findOne({ sku }).lean();
    if (before) lookupSku = sku;
  }
  const set: Record<string, string | number> = {};
  const unset: Record<string, 1> = {};
  for (const key of ["cardTitle", "cardDescription"] as const) {
    const value = fields[key];
    if (value === undefined) continue;
    if (value) set[key] = value;
    else unset[key] = 1;
  }
  if (fields.priceOverride !== undefined) {
    if (fields.priceOverride === null) unset.priceOverride = 1;
    else set.priceOverride = fields.priceOverride;
  }
  if (lookupSku !== metaSku) set.sku = metaSku;

  const update = {
    $set: set,
    ...(Object.keys(unset).length ? { $unset: unset } : {}),
  };
  let after = before
    ? await Model.findOneAndUpdate({ sku: lookupSku }, update, { new: true }).lean()
    : null;

  for (let attempt = 0; !before && !after && attempt < 5; attempt += 1) {
    const slug = `${product.slug.slice(0, 80)}-${randomUUID()}`;
    try {
      after = await Model.findOneAndUpdate(
        { sku: metaSku },
        { ...update, $setOnInsert: { slug, itemCode: `web:${metaSku}` } },
        { upsert: true, new: true },
      ).lean();
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error;

      const concurrent = await Model.findOne({ sku: metaSku }).lean();
      if (concurrent) {
        after = await Model.findOneAndUpdate(
          { sku: metaSku },
          update,
          { new: true },
        ).lean();
      } else if (attempt === 4) {
        throw error;
      }
    }
  }
  if (!after) return fail("CONFLICT", "Could not save product storefront details because its metadata is conflicting", 409);
  await audit(actor, "productMeta.description.update", "productWebMeta", metaSku, before, after, req);
  return ok({
    sku: metaSku,
    cardTitle: after?.cardTitle ?? "",
    cardDescription: after?.cardDescription ?? "",
    priceOverride: after?.priceOverride ?? null,
  });
});
