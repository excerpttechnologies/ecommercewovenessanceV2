import type { NextRequest } from "next/server";
import { z } from "zod";
import { fail, handler, ok } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth";
import { getErpConnection, getWebConnection, redactMongoUri, toObjectIdOrString } from "@/lib/db";
import { BUSINESS_CLASSIFICATION_FIELDS, classificationValues, hasEcommerceData, type BusinessClassificationKey } from "@/lib/admin/business-export";
import { mapErpEcommerceCatalog } from "@/lib/admin/erp-ecommerce-catalog";
import { ERP_BARCODE_COLLECTIONS, BARCODE_LABEL_FIELDS as B, mapBarcodeLabel } from "@/lib/erp-mapping";
import { ProductWebMetaModel } from "@/models/web/content.models";
import { BarcodeLabelModel } from "@/models/erp/barcode-label.model";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  businessId: z.string().regex(/^[a-f\d]{24}$/i),
  limit: z.coerce.number().int().min(1).max(5000).default(5000),
});

const META_FIELDS = [
  "sku",
  "seoTitle",
  "seoDescription",
  "productName",
  "itemName",
  "barcodeName",
  "productType",
  "itemType",
  "weaveDescription",
  "fabricDescription",
  "craftDescription",
  "occasionDescription",
  "colorDescription",
  "printDescriptionOverride",
  "cardTitle",
  "cardDescription",
  "ecommOffPercent",
  "barcodePriceOverride",
  "barcodeQtyOverride",
  "barcodeStatusOverride",
  "isFeatured",
  "isActive",
  "extraImages",
  "webTags",
] as const;

const ERP_CLASSIFICATION_ATTRIBUTES: Record<
  BusinessClassificationKey,
  keyof ReturnType<typeof mapErpEcommerceCatalog>["attributes"]
> = {
  byWeave: "weave",
  byFabric: "fabric",
  byCraft: "craft",
  byOccasion: "occasion",
  byColour: "color",
};

export const GET = handler(async (req: NextRequest) => {
  await requireAdmin("products:read");

  const parsed = querySchema.safeParse({
    businessId: req.nextUrl.searchParams.get("businessId"),
    limit: req.nextUrl.searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", "Provide a valid businessId and a limit from 1 to 5000.", 400, parsed.error.flatten());
  }

  const { businessId, limit } = parsed.data;
  let rows;
  let totalProducts: number;
  try {
    const Label = BarcodeLabelModel(await getErpConnection());
    const filter = { [B.businessId]: businessId };
    [rows, totalProducts] = await Promise.all([
      Label.find(filter, Object.fromEntries(Object.values(B).map((field) => [field, 1])))
        .sort({ _id: -1 })
        .limit(limit)
        .lean(),
      Label.countDocuments(filter),
    ]);
  } catch (error) {
    console.error("[admin/erp/business-export] ERP query failed:", redactMongoUri(String((error as Error)?.message ?? error)));
    return fail("ERP_UNAVAILABLE", "Unable to load business products from RetailERP.", 503);
  }

  const products = rows.map((row) => mapBarcodeLabel(row));
  const barcodes = [...new Set(products.map((product) => product.barcode))];
  const erpEcommerceByLabelId = new Map<string, ReturnType<typeof mapErpEcommerceCatalog>>();
  try {
    const connection = await getErpConnection();
    if (!connection.db) throw new Error("RetailERP database connection is not ready");
    const catalogRows = await connection.db.collection("ecommerceProducts")
      .find(
        { erpDocumentId: { $in: products.flatMap((product) => [product.id, toObjectIdOrString(product.id)]) } },
        { projection: { _id: 1, erpDocumentId: 1, productName: 1, ecommerceItemName: 1, shortDescription: 1, description: 1, attributes: 1, visibility: 1, updatedAt: 1 } },
      )
      .sort({ updatedAt: -1 })
      .toArray();
    for (const row of catalogRows) {
      if (row.erpDocumentId != null && !erpEcommerceByLabelId.has(String(row.erpDocumentId))) {
        erpEcommerceByLabelId.set(String(row.erpDocumentId), mapErpEcommerceCatalog(row));
      }
    }
  } catch (error) {
    console.error("[admin/erp/business-export] ERP e-commerce lookup failed:", redactMongoUri(String((error as Error)?.message ?? error)));
    return fail("ERP_UNAVAILABLE", "Unable to load e-commerce catalog data from RetailERP.", 503);
  }

  let metas;
  try {
    metas = await ProductWebMetaModel(await getWebConnection())
      .find({ sku: { $in: barcodes } }, Object.fromEntries(META_FIELDS.map((field) => [field, 1])))
      .lean();
  } catch (error) {
    console.error("[admin/erp/business-export] website metadata query failed:", redactMongoUri(String((error as Error)?.message ?? error)));
    return fail("WEB_DATA_UNAVAILABLE", "Unable to load e-commerce metadata for business products.", 503);
  }

  const metaByBarcode = new Map(metas.map((meta) => [meta.sku, meta]));
  const optionSets: Record<BusinessClassificationKey, Set<string>> = {
    byWeave: new Set(),
    byFabric: new Set(),
    byCraft: new Set(),
    byOccasion: new Set(),
    byColour: new Set(),
  };
  let itemsWithEcommerceData = 0;
  let itemsWithByFabric = 0;

  const exportProducts = products.map((product) => {
    const web = metaByBarcode.get(product.barcode);
    const erpCatalog = erpEcommerceByLabelId.get(product.id) ?? null;
    if (erpCatalog || hasEcommerceData(web)) itemsWithEcommerceData += 1;
    const fabricValues = classificationValues(web?.fabricDescription ?? erpCatalog?.attributes.fabric);
    if (fabricValues.length) itemsWithByFabric += 1;

    for (const [key, field] of Object.entries(BUSINESS_CLASSIFICATION_FIELDS) as [BusinessClassificationKey, typeof BUSINESS_CLASSIFICATION_FIELDS[BusinessClassificationKey]][]) {
      const webValue = web?.[field];
      const erpValue = erpCatalog?.attributes[ERP_CLASSIFICATION_ATTRIBUTES[key]];
      for (const value of classificationValues(webValue ?? erpValue)) optionSets[key].add(value);
    }

    return { ...product, erpEcommerce: erpCatalog, web: web ?? null };
  });

  const classificationOptions = Object.fromEntries(
    Object.entries(optionSets).map(([key, values]) => [key, [...values].sort((a, b) => a.localeCompare(b))]),
  ) as Record<BusinessClassificationKey, string[]>;
  const classificationOptionCounts = Object.fromEntries(
    Object.entries(classificationOptions).map(([key, values]) => [key, values.length]),
  ) as Record<BusinessClassificationKey, number>;

  return ok(
    {
      businessId,
      classificationOptions,
      classificationOptionCounts,
      counts: {
        totalProducts,
        productsReturned: exportProducts.length,
        itemsWithEcommerceData,
        itemsWithByFabric,
      },
      products: exportProducts,
    },
    {
      source: "erp",
      collection: ERP_BARCODE_COLLECTIONS.labels,
      readOnly: true,
      limit,
      truncated: totalProducts > exportProducts.length,
      countsApplyTo: "productsReturned",
    },
    { headers: { "Content-Disposition": `attachment; filename="business-${businessId}-export.json"` } },
  );
});
