import type { NextRequest } from "next/server";
import { handler, ok } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth";
import { reports } from "@/lib/admin/stats";

export const dynamic = "force-dynamic";
export const GET = handler(async (req: NextRequest) => {
  await requireAdmin("reports:read");
  const sp = req.nextUrl.searchParams;
  const to = sp.get("to") ? new Date(sp.get("to")!) : new Date();
  const from = sp.get("from") ? new Date(sp.get("from")!) : new Date(to.getTime() - 30 * 864e5);
  return ok(await reports(from, to), { from, to });
});
