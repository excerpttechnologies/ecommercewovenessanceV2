import { handler, ok } from "@/lib/api/response";
import { getErpSettings } from "@/lib/admin/erp-settings";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  await requireAdmin("settings:write");
  return ok(await getErpSettings());
});
