import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { handler, ok, fail } from "@/lib/api/response";
import { parseBody } from "@/lib/api/body";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth";
import { getWebConnection } from "@/lib/db";
import { getProductClassificationOptions, isClassificationOptionDeleted, type ClassificationField } from "@/lib/admin/product-classification-options";
import { ProductWebMetaModel, SiteSettingsModel } from "@/models/web/content.models";

export const dynamic = "force-dynamic";

const productTypes = ["SAREES", "FABRICS", "PLAIN FABRICS", "DUPATTA", "NEW ARRIVALS"] as const;
const classificationFields = ["By Weave", "By Fabric", "By Craft", "By Occasion", "By colour"] as const satisfies readonly ClassificationField[];

export const GET = handler(async (req: NextRequest) => {
  await requireAdmin("products:read");
  const productType = z.enum(productTypes).safeParse(req.nextUrl.searchParams.get("productType"));
  if (!productType.success) return fail("VALIDATION_ERROR", "Invalid product type", 400);

  const settings = await SiteSettingsModel(await getWebConnection())
    .findOne({ key: "default" }, { classificationOptions: 1, deletedClassificationOptions: 1 })
    .lean();
  const ProductMeta = ProductWebMetaModel(await getWebConnection());
  const savedDescriptions = await ProductMeta.find({
    $or: [
      { productType: productType.data },
      { productType: { $exists: false } },
      { productType: null },
      { productType: "" },
    ],
  }, {
    weaveDescription: 1,
    fabricDescription: 1,
    craftDescription: 1,
    occasionDescription: 1,
    colorDescription: 1,
  }).lean();
  const descriptionKeys: Record<ClassificationField, "weaveDescription" | "fabricDescription" | "craftDescription" | "occasionDescription" | "colorDescription"> = {
    "By Weave": "weaveDescription",
    "By Fabric": "fabricDescription",
    "By Craft": "craftDescription",
    "By Occasion": "occasionDescription",
    "By colour": "colorDescription",
  };
  const options: Partial<Record<ClassificationField, string[]>> = {};
  for (const field of classificationFields) {
    const defaults = getProductClassificationOptions(productType.data, field);
    if (!defaults.length) continue;
    const configured = (settings?.classificationOptions ?? [])
      .filter((option) => option.productType === productType.data && option.field === field)
      .map((option) => option.value);
    const saved = savedDescriptions.flatMap((description) => {
      const value = description[descriptionKeys[field]];
      return typeof value === "string" ? value.split(",").map((item) => item.trim()).filter(Boolean) : [];
    });
    const combined = [...defaults, ...configured, ...saved].filter((value) =>
      !isClassificationOptionDeleted(
        settings?.deletedClassificationOptions ?? [],
        productType.data,
        field,
        value,
      ),
    );
    options[field] = combined.filter((value, index) =>
      combined.findIndex((candidate) => candidate.toLocaleLowerCase() === value.toLocaleLowerCase()) === index,
    );
  }
  return ok(options);
});

export const POST = handler(async (req: NextRequest) => {
  const actor = await requireAdmin("products:write");
  const parsed = await parseBody(req, z.object({
    productType: z.enum(productTypes),
    field: z.enum(classificationFields),
    value: z.string().trim().min(1).max(100).refine((value) => !value.includes(",")),
  }));
  if (!parsed.ok) return parsed.res;

  const { productType, field, value } = parsed.data;
  if (!getProductClassificationOptions(productType, field).length) {
    return fail("VALIDATION_ERROR", "This classification field is not available for the selected product type", 422);
  }

  const Model = SiteSettingsModel(await getWebConnection());
  const before = await Model.findOne({ key: "default" }).lean();
  const exists = (before?.classificationOptions ?? []).some((option) =>
    option.productType === productType
    && option.field === field
    && option.value.toLocaleLowerCase() === value.toLocaleLowerCase());
  const wasDeleted = isClassificationOptionDeleted(
    before?.deletedClassificationOptions ?? [],
    productType,
    field,
    value,
  );
  if (!exists || wasDeleted) {
    await Model.updateOne({ key: "default" }, {
      ...(exists ? {} : { $addToSet: { classificationOptions: { productType, field, value } } }),
      ...(wasDeleted ? {
        $pull: {
          deletedClassificationOptions: {
            productType,
            field,
            value: value.toLowerCase(),
          },
        },
      } : {}),
    }, { upsert: true });
    const after = await Model.findOne({ key: "default" }).lean();
    await audit(actor, wasDeleted ? "productClassificationOption.restore" : "productClassificationOption.create", "siteSettings", "default", before, after, req);
    revalidatePath("/", "layout");
  }
  return ok({ productType, field, value });
});

export const DELETE = handler(async (req: NextRequest) => {
  const actor = await requireAdmin("products:write");
  const parsed = await parseBody(req, z.object({
    productType: z.enum(productTypes),
    field: z.enum(classificationFields),
    value: z.string().trim().min(1).max(100).refine((value) => !value.includes(",")),
  }));
  if (!parsed.ok) return parsed.res;

  const { productType, field, value } = parsed.data;
  if (!getProductClassificationOptions(productType, field).length) {
    return fail("VALIDATION_ERROR", "This classification field is not available for the selected product type", 422);
  }

  const Model = SiteSettingsModel(await getWebConnection());
  const before = await Model.findOne({ key: "default" }).lean();
  const matchingConfigured = (before?.classificationOptions ?? [])
    .filter((option) =>
      option.productType === productType
      && option.field.toLocaleLowerCase() === field.toLocaleLowerCase()
      && option.value.toLowerCase() === value.toLowerCase(),
    )
    .map((option) => option.value);
  const alreadyDeleted = isClassificationOptionDeleted(
    before?.deletedClassificationOptions ?? [],
    productType,
    field,
    value,
  );

  if (!alreadyDeleted || matchingConfigured.length) {
    await Model.updateOne({ key: "default" }, {
      $addToSet: {
        deletedClassificationOptions: { productType, field, value: value.toLowerCase() },
      },
      ...(matchingConfigured.length ? {
        $pull: {
          classificationOptions: {
            productType,
            field,
            value: { $in: matchingConfigured },
          },
        },
      } : {}),
    }, { upsert: true });
    const after = await Model.findOne({ key: "default" }).lean();
    await audit(actor, "productClassificationOption.delete", "siteSettings", "default", before, after, req);
    revalidatePath("/", "layout");
  }

  return ok({ deleted: true, productType, field, value });
});
