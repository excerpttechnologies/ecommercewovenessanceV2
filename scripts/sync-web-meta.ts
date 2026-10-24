/**
 * npm run erp:sync-meta
 *
 * Ensures every active product in the master data source (mock or RetailERP)
 * has a productWebMeta row with a stable slug. Run after pointing at the ERP,
 * and on a schedule afterwards (new SKUs get slugs; nothing is deleted).
 * Read-only against the ERP; writes only to WEB_DB_NAME.productWebMeta.
 * The same function powers the admin "Re-sync" button.
 */
import "dotenv/config";
import { closeConnections } from "@/lib/db";
import { env } from "@/lib/env";
import { syncWebMeta } from "@/lib/admin/sync";

async function main() {
  console.log(`Syncing web meta from ${env.DATA_SOURCE === "erp" ? `RetailERP (${env.ERP_DB_NAME})` : "mock catalogue"} → ${env.WEB_DB_NAME}.productWebMeta`);
  const r = await syncWebMeta();
  console.log(`  scanned ${r.scanned} products, created ${r.created} slugs in ${r.ms}ms`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(closeConnections);
