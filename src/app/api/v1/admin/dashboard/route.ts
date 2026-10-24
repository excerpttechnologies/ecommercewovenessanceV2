import { handler, ok } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth";
import { dashboardStats } from "@/lib/admin/stats";

export const dynamic = "force-dynamic";
export const GET = handler(async () => {
  await requireAdmin("dashboard:read");
  return ok(await dashboardStats());
});
