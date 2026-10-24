import { handler, ok } from "@/lib/api/response";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth";
import { syncWebMeta } from "@/lib/admin/sync";

export const dynamic = "force-dynamic";
/** POST — create slugs/SEO rows for products that don't have one yet; stamps siteSettings.erp.lastSyncAt. */
export const POST = handler(async (req: Request) => {
  const actor = await requireAdmin("inventory:sync");
  const result = await syncWebMeta();
  await audit(actor, "erp.syncMeta", "productWebMeta", undefined, undefined, result, req);
  return ok(result);
});
