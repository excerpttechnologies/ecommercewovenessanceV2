import { handler, ok } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth";
import { erpOverview } from "@/lib/admin/stats";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  await requireAdmin("settings:write");
  return ok(await erpOverview());
});
