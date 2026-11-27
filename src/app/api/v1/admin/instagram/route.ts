
import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { handler, ok } from "@/lib/api/response";
import { parseBody } from "@/lib/api/body";
import { requireAdmin } from "@/lib/auth";
import { getWebConnection } from "@/lib/db";
import {
  InstagramCurationModel,
  INSTAGRAM_CURATION_GROUP_KEYS,
} from "@/models/web/instagram-curation.model";
import { getMasterData } from "@/repositories";

export const dynamic = "force-dynamic";

const groupKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const bodySchema = z.object({
  key: groupKeySchema.default("default"),
  enabled: z.boolean(),
  title: z.string().trim().max(120).default("Shop our Instagram edit"),
  description: z.string().trim().max(300).default(""),
  skus: z.array(z.string().trim().min(1).max(120)).max(100),
});

export const GET = handler(async (req: NextRequest) => {
  await requireAdmin("products:read");

  const keyParam = req.nextUrl.searchParams.get("group") ?? "default";
  const parsedKey = groupKeySchema.safeParse(keyParam);

  if (!parsedKey.success) {
    return ok({ error: "Invalid Instagram group." });
  }

  const key = parsedKey.data;
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  const Model = InstagramCurationModel(await getWebConnection());

  // Fetch all known group configurations, including the selected group.
  const groupKeys = [
    ...new Set([...INSTAGRAM_CURATION_GROUP_KEYS, key]),
  ];

  const configs = await Model.find({
    key: { $in: groupKeys },
  }).lean();

  const config = configs.find((item) => item.key === key);

  // Counts for the group selector.
  const groupCounts = Object.fromEntries(
    configs.map((item) => [
      item.key,
      item.skus?.length ?? 0,
    ]),
  );

  const master = getMasterData();

  // Product search.
  const products =
    q.length >= 2
      ? await master.products.search(q, 20)
      : [];

  // Products selected in the currently active group.
  const selectedProducts =
    config?.skus?.length
      ? await master.products.getBySkus(config.skus, {
          skipCache: true,
        })
      : [];

  // Resolve saved products for every Instagram group.
  // Keep the SKU even if product details cannot be resolved.
  const allGroups = await Promise.all(
    configs
      .filter((item) => item.skus?.length)
      .map(async (item) => {
        const groupProducts = await master.products.getBySkus(
          item.skus,
          { skipCache: true },
        );

        const productsBySku = new Map(
          groupProducts.map((product) => [
            product.sku.toUpperCase(),
            product,
          ]),
        );

        return {
          key: item.key,
          enabled: item.enabled ?? true,
          title: item.title ?? "Shop our Instagram edit",
          description: item.description ?? "",
          skus: item.skus,
          products: (item.skus as string[]).map((sku: string) => ({
  sku,
  product: productsBySku.get(sku.toUpperCase()) ?? null,
})),
        };
      }),
  );

  return ok({
    config: {
      enabled: config?.enabled ?? true,
      title: config?.title ?? "Shop our Instagram edit",
      description: config?.description ?? "",
      skus: config?.skus ?? [],
    },
    groupCounts,
    allGroups,
    products,
    selectedProducts,
  });
});

const saveInstagramCuration = handler(async (req: NextRequest) => {
  await requireAdmin("products:write");

  const parsed = await parseBody(req, bodySchema);

  if (!parsed.ok) {
    return parsed.res;
  }

  const data = parsed.data;

  // Remove duplicate SKUs while preserving their order.
  const skus = [
    ...new Set(
      data.skus
        .map((sku) => sku.trim())
        .filter(Boolean),
    ),
  ];

  const Model = InstagramCurationModel(await getWebConnection());

  await Model.findOneAndUpdate(
    { key: data.key },
    {
      $set: {
        enabled: data.enabled,
        title: data.title,
        description: data.description,
        skus,
      },
      $setOnInsert: {
        key: data.key,
      },
    },
    {
      upsert: true,
      new: true,
      runValidators: true,
    },
  );

  // Refresh storefront pages after any group's products change.
  revalidatePath("/", "page");
  revalidatePath("/instagram", "page");

  return ok({
    saved: true,
    key: data.key,
    count: skus.length,
  });
});

export const POST = saveInstagramCuration;
export const PUT = saveInstagramCuration;
