import type { NextRequest } from "next/server";
import { handler, ok } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth";
import { getWebConnection } from "@/lib/db";
import { AuditLogModel } from "@/models/web/commerce.models";

export const dynamic = "force-dynamic";
export const GET = handler(async (req: NextRequest) => {
  const actor = await requireAdmin("audit:read");
  const sp = req.nextUrl.searchParams;
  const page = Number(sp.get("page") ?? 1);
  const limit = 50;
  const match: Record<string, unknown> = {};
  if (sp.get("entity")) match.entity = sp.get("entity");
  if (sp.get("actor")) match.actorEmail = sp.get("actor");
  const M = AuditLogModel(await getWebConnection());
  const [items, total] = await Promise.all([M.find(match).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(), M.countDocuments(match)]);
  return ok(items, { total, page, limit, pages: Math.ceil(total / limit), canDelete: actor.role === "admin" });
});
