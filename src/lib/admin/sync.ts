/* eslint-disable @typescript-eslint/no-explicit-any */
import { getMasterConnection, getWebConnection } from "@/lib/db";
import { ACTIVE_PRODUCT_QUERY, PRODUCT_FIELDS, productSlug, toStr } from "@/lib/erp-mapping";
import { getPath } from "@/lib/utils";
import { ProductModel } from "@/models/erp/product.model";
import { ProductWebMetaModel, SiteSettingsModel } from "@/models/web/content.models";

/** Shared by `npm run erp:sync-meta` and the admin "Re-sync" button. */
export async function syncWebMeta() {
  const started = Date.now();
  const master = await getMasterConnection();
  const web = await getWebConnection();
  const Products = ProductModel(master);
  const Meta = ProductWebMetaModel(web);

  const existing = new Set((await Meta.find({}, { sku: 1 }).lean()).map((m) => m.sku));
  const usedSlugs = new Set((await Meta.find({}, { slug: 1 }).lean()).map((m) => m.slug));
  const cursor = Products.find(ACTIVE_PRODUCT_QUERY as any, { [PRODUCT_FIELDS.sku]: 1, [PRODUCT_FIELDS.name]: 1 }).lean().cursor();
  const batch: any[] = [];
  let scanned = 0;
  let created = 0;
  for await (const doc of cursor) {
    scanned++;
    const sku = toStr(getPath(doc, PRODUCT_FIELDS.sku)) ?? String(doc._id);
    if (existing.has(sku)) continue;
    const name = toStr(getPath(doc, PRODUCT_FIELDS.name)) ?? "product";
    let slug = productSlug(name, sku);
    let n = 2;
    while (usedSlugs.has(slug)) slug = `${productSlug(name, sku)}-${n++}`;
    usedSlugs.add(slug);
    batch.push({ sku, slug, itemCode: `web:${sku}` });
    if (batch.length >= 500) {
      await Meta.insertMany(batch.splice(0), { ordered: false });
    }
  }
  if (batch.length) await Meta.insertMany(batch, { ordered: false });
  created = usedSlugs.size - existing.size;
  const ms = Date.now() - started;
  await SiteSettingsModel(web).updateOne({ key: "default" }, { $set: { "erp.lastSyncAt": new Date(), "erp.lastSyncStatus": `ok: ${created} created / ${scanned} scanned in ${ms}ms` } }, { upsert: true });
  return { scanned, created, ms };
}
