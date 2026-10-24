import { handler, ok } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth";
import { env } from "@/lib/env";
import { erpInventory } from "@/lib/admin/stats";
import { getSite } from "@/repositories";

export const dynamic = "force-dynamic";
/** GET — live stock summary and alert rows directly from RetailERP items. */
export const GET = handler(async () => {
  await requireAdmin("inventory:read");
  const settings = await getSite().settings();
  const threshold = settings.commerce?.lowStockThreshold ?? 3;
  const inventory = await erpInventory(threshold);
  return ok({
    ...inventory,
    threshold,
    dataSource: "erp",
    dbName: env.ERP_DB_NAME,
    fetchedAt: new Date().toISOString(),
    lastSyncAt: settings.erp?.lastSyncAt ?? null,
    lastSyncStatus: settings.erp?.lastSyncStatus ?? null,
  });
});
