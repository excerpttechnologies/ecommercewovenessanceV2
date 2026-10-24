import { handler, ok } from "@/lib/api/response";
import { env } from "@/lib/env";
import { ALL_FIELD_MAPS, ERP_COLLECTIONS, PRODUCT_CATEGORY_REF } from "@/lib/erp-mapping";
import { getMasterData } from "@/repositories";

export const dynamic = "force-dynamic";

/**
 * Connection test for the admin "Integrations → RetailERP" screen.
 * TODO(phase 4): put behind admin auth + settings:write permission.
 */
export const GET = handler(async () => {
  const master = getMasterData();
  const ping = await master.ping();
  return ok({
    dataSource: env.DATA_SOURCE,
    readOnly: master.readOnly,
    dbName: ping.dbName,
    ping,
    mapping: { collections: ERP_COLLECTIONS, productCategoryRef: PRODUCT_CATEGORY_REF, fields: ALL_FIELD_MAPS },
  });
});
