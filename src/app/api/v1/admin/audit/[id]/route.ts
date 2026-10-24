import type { NextRequest } from "next/server";
import { fail, handler, ok } from "@/lib/api/response";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth";
import { getWebConnection, isValidObjectId } from "@/lib/db";
import { AuditLogModel } from "@/models/web/commerce.models";

export const dynamic = "force-dynamic";

export const DELETE = handler(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const actor = await requireAdmin("audit:read");
  if (actor.role !== "admin") return fail("FORBIDDEN", "Only an administrator can delete audit log entries", 403);

  const { id } = await ctx.params;
  if (!isValidObjectId(id)) return fail("NOT_FOUND", "Audit log entry not found", 404);

  const AuditLog = AuditLogModel(await getWebConnection());
  const entry = await AuditLog.findById(id).lean();
  if (!entry) return fail("NOT_FOUND", "Audit log entry not found", 404);

  await AuditLog.deleteOne({ _id: id });
  await audit(actor, "audit.delete", "auditLog", id, entry, undefined, req);
  return ok({ deleted: true });
});
