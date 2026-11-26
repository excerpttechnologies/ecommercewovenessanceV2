import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { handler, ok } from "@/lib/api/response";
import { parseBody } from "@/lib/api/body";
import { requireAdmin } from "@/lib/auth";
import { getWebConnection } from "@/lib/db";
import { InstagramCurationModel } from "@/models/web/instagram-curation.model";
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
  const config = await Model.findOne({ key }).lean();
  const master = getMasterData();

  const products = q.length >= 2 ? await master.products.search(q, 20) : [];

  const selectedProducts = config?.skus?.length
  ? await master.products.getBySkus(config.skus)
  : [];

  return ok({
    config: {
      enabled: config?.enabled ?? true,
      title: config?.title ?? "Shop our Instagram edit",
      description: config?.description ?? "",
      skus: config?.skus ?? [],
    },
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
  const skus = [...new Set(data.skus.map((sku) => sku.trim()).filter(Boolean))];

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
      $setOnInsert: { key: data.key },
    },
    {
      upsert: true,
      new: true,
      runValidators: true,
    },
  );

  revalidatePath("/", "page");
revalidatePath("/instagram", "page");

  return ok({ saved: true, key: data.key, count: skus.length });
});

export const POST = saveInstagramCuration;
export const PUT = saveInstagramCuration;