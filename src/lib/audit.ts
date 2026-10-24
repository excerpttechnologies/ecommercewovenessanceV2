import { getWebConnection } from "@/lib/db";
import type { AdminSession } from "@/lib/auth";
import { AuditLogModel } from "@/models/web/commerce.models";

export async function audit(
  actor: AdminSession | null,
  action: string,
  entity: string,
  entityId?: unknown,
  before?: unknown,
  after?: unknown,
  req?: Request,
) {
  try {
    const M = AuditLogModel(await getWebConnection());
    await M.create({
      actorId: actor?.sub,
      actorEmail: actor?.email,
      action,
      entity,
      entityId,
      before,
      after,
      ip: req?.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req?.headers.get("user-agent") ?? undefined,
    });
  } catch (e) {
    console.error("[audit] failed", e);
  }
}
