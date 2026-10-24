import type { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { parseBody } from "@/lib/api/body";
import { fail, handler, ok } from "@/lib/api/response";
import { parseBarcodeListParams } from "@/lib/api/query";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth";
import { getErpConnection, getWebConnection, redactMongoUri } from "@/lib/db";
import { ERP_BARCODE_COLLECTIONS } from "@/lib/erp-mapping";
import { ProductWebMetaModel } from "@/models/web/content.models";
import {
  erpEcommerceKey,
  loadErpEcommerceCatalogs,
  type ErpEcommerceCatalog,
} from "@/lib/admin/erp-ecommerce-catalog";
import { getBarcodeLabels } from "@/repositories";

export const dynamic = "force-dynamic";

const ERP_UNAVAILABLE = "Unable to load products. Please try again.";

/**
 * GET /api/v1/admin/products?q=&status=&group=&business=&uomType=&page=&limit=
 * RetailERP barcodeLabel records (server-side search, filters, pagination) + the website's
 * productWebMeta overlay, keyed by barcode.
 */
export const GET = handler(async (req: NextRequest) => {
  await requireAdmin("products:read");
  const parsed = parseBarcodeListParams(req.nextUrl.searchParams);
  if (!parsed.ok) return fail("VALIDATION_ERROR", "Invalid query", 400, parsed.error.flatten());

  let r;
  try {
    r = await getBarcodeLabels().list(parsed.params);
  } catch (e) {
    console.error("[admin/products] barcodeLabel query failed:", redactMongoUri(String((e as Error)?.message ?? e)));
    return fail("ERP_UNAVAILABLE", ERP_UNAVAILABLE, 503);
  }

  // The overlay is optional: if the web database is down the ERP rows still load.
  const web = new Map<string, Record<string, unknown>>();
  const erpEcommerce = new Map<string, ErpEcommerceCatalog>();
  try {
    if (r.items.length) {
      const connection = await getErpConnection();
      if (!connection.db) throw new Error("RetailERP database connection is not ready");
      const catalogs = await loadErpEcommerceCatalogs(connection, r.items);
      for (const product of r.items) {
        const key = erpEcommerceKey(product.itemId, product.businessId);
        if (key) {
          const catalog = catalogs.get(key);
          if (catalog) erpEcommerce.set(product.id, catalog);
        }
      }
    }
  } catch (e) {
    console.error("[admin/products] ERP e-commerce lookup failed:", redactMongoUri(String((e as Error)?.message ?? e)));
    return fail("ERP_UNAVAILABLE", "Unable to load e-commerce details from RetailERP. Please try again.", 503);
  }

  try {
    const metas = await ProductWebMetaModel(await getWebConnection())
      .find({ sku: { $in: Array.from(new Set(r.items.map((p) => p.barcode))) } })
      .lean();
    for (const m of metas) {
      web.set(m.sku, {
        id: String(m._id),
        slug: m.slug,
        seoTitle: m.seoTitle,
        seoDescription: m.seoDescription,
        barcodePriceOverride: m.barcodePriceOverride,
        barcodeQtyOverride: m.barcodeQtyOverride,
        barcodeStatusOverride: m.barcodeStatusOverride,
        productName: m.productName,
        itemName: m.itemName,
        barcodeName: m.barcodeName,
        productType: m.productType,
        itemType: m.itemType,
        weaveDescription: m.weaveDescription,
        fabricDescription: m.fabricDescription,
        craftDescription: m.craftDescription,
        occasionDescription: m.occasionDescription,
        colorDescription: m.colorDescription,
        groupNameOverride: m.groupNameOverride,
        supplierCodeOverride: m.supplierCodeOverride,
        supplierNameOverride: m.supplierNameOverride,
        printDescriptionOverride: m.printDescriptionOverride,
        ecommOffPercent: m.ecommOffPercent,
        isFeatured: m.isFeatured,
        isActive: m.isActive,
        salesCount: m.salesCount,
      });
    }
  } catch (e) {
    console.error("[admin/products] productWebMeta lookup failed:", redactMongoUri(String((e as Error)?.message ?? e)));
  }

  const { items, ...meta } = r;
  return ok(
    items.map((p) => ({
      ...p,
      web: web.get(p.barcode) ?? null,
      erpEcommerce: erpEcommerce.get(p.id) ?? null,
    })),
    { ...meta, source: "erp", collection: ERP_BARCODE_COLLECTIONS.labels, readOnly: true },
  );
});

/** PATCH /api/v1/admin/products — website-owned product overlay only. */
export const PATCH = handler(async (req: NextRequest) => {
  const actor = await requireAdmin("products:write");
  const b = await parseBody(req, z.object({
    sku: z.string().min(1).max(120),
    slug: z.string().regex(/^[a-z0-9-]+$/).optional(),
    seoTitle: z.string().max(120).optional(),
    seoDescription: z.string().max(240).optional(),
    productName: z.string().trim().max(160).nullable().optional(),
    itemName: z.string().trim().max(160).nullable().optional(),
    barcodeName: z.string().trim().max(160).nullable().optional(),
    productType: z.enum(["SAREES", "FABRICS", "PLAIN FABRICS", "DUPATTA", "NEW ARRIVALS"]).nullable().optional(),
    itemType: z.enum(["By Weave", "By Fabric", "By Craft", "By Occasion"]).nullable().optional(),
    weaveDescription: z.string().trim().max(1000).nullable().optional(),
    fabricDescription: z.string().trim().max(1000).nullable().optional(),
    craftDescription: z.string().trim().max(1000).nullable().optional(),
    occasionDescription: z.string().trim().max(1000).nullable().optional(),
    colorDescription: z.string().trim().max(1000).nullable().optional(),
    groupNameOverride: z.string().trim().max(160).nullable().optional(),
    supplierCodeOverride: z.string().trim().max(120).nullable().optional(),
    supplierNameOverride: z.string().trim().max(160).nullable().optional(),
    printDescriptionOverride: z.string().trim().max(1000).nullable().optional(),
    ecommOffPercent: z.number().finite().min(0).max(100).nullable().optional(),
    barcodePriceOverride: z.number().finite().min(0).max(100_000_000).nullable().optional(),
    barcodeQtyOverride: z.number().finite().min(0).max(1_000_000).nullable().optional(),
    barcodeStatusOverride: z.enum(["IN_STOCK", "IN_TRANSIT", "SOLD", "HISTORY", "VOID"]).nullable().optional(),
    isFeatured: z.boolean().optional(),
    isActive: z.boolean().optional(),
    extraImages: z.array(z.string()).optional(),
    webTags: z.array(z.string()).optional(),
  }).refine(({ slug, seoTitle, seoDescription, productName, itemName, barcodeName, productType, itemType, weaveDescription, fabricDescription, craftDescription, occasionDescription, colorDescription, groupNameOverride, supplierCodeOverride, supplierNameOverride, printDescriptionOverride, ecommOffPercent, barcodePriceOverride, barcodeQtyOverride, barcodeStatusOverride, isFeatured, isActive, extraImages, webTags }) =>
    [slug, seoTitle, seoDescription, productName, itemName, barcodeName, productType, itemType, weaveDescription, fabricDescription, craftDescription, occasionDescription, colorDescription, groupNameOverride, supplierCodeOverride, supplierNameOverride, printDescriptionOverride, ecommOffPercent, barcodePriceOverride, barcodeQtyOverride, barcodeStatusOverride, isFeatured, isActive, extraImages, webTags].some((value) => value !== undefined)));
  if (!b.ok) return b.res;
  const { sku, ...patch } = b.data;
  let product;
  try {
    product = await getBarcodeLabels().getByBarcode(sku);
  } catch (e) {
    console.error("[admin/products] barcodeLabel lookup failed:", redactMongoUri(String((e as Error)?.message ?? e)));
    return fail("ERP_UNAVAILABLE", "RetailERP is unreachable. Please try again.", 503);
  }
  if (!product) return fail("NOT_FOUND", "Barcode not found in RetailERP", 404);
  const M = ProductWebMetaModel(await getWebConnection());
  const before = await M.findOne({ sku }).lean();
  const set: Record<string, unknown> = {};
  const unset: Record<string, 1> = {};
  for (const key of ["productName", "itemName", "barcodeName", "productType", "itemType", "weaveDescription", "fabricDescription", "craftDescription", "occasionDescription", "colorDescription", "groupNameOverride", "supplierCodeOverride", "supplierNameOverride", "printDescriptionOverride", "ecommOffPercent", "barcodePriceOverride", "barcodeQtyOverride", "barcodeStatusOverride"] as const) {
    const value = patch[key];
    if (value === undefined) continue;
    if (value !== null && value !== "") set[key] = value;
    else unset[key] = 1;
  }
  for (const key of ["slug", "seoTitle", "seoDescription", "isFeatured", "isActive", "extraImages", "webTags"] as const) {
    const value = patch[key];
    if (value !== undefined) set[key] = value;
  }
  // A path may not appear in both $set and $setOnInsert (MongoDB error 40), so the default slug is only seeded when none was sent.
  const update = {
    $set: set,
    ...(Object.keys(unset).length ? { $unset: unset } : {}),
    ...(!before ? { $setOnInsert: { slug: `${product.slug.slice(0, 80)}-${randomUUID()}`, itemCode: `web:${sku}` } } : {}),
  };
  let after;
  try {
    after = await M.findOneAndUpdate({ sku }, update, { upsert: true, new: true }).lean();
  } catch (e) {
    if ((e as { code?: number }).code === 11000) return fail("CONFLICT", "That URL slug is already used by another product", 409);
    throw e;
  }
  await audit(actor, "productMeta.update", "productWebMeta", sku, before, after, req);
  return ok(after);
});
