/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { fail, handler, ok } from "@/lib/api/response";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth";
import { getWebConnection } from "@/lib/db";
import { getResource } from "@/lib/admin/resources";
import { isValidObjectId } from "@/lib/db";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ resource: string; id: string }> };

const hide = (doc: any, hidden?: string[]) => {
  for (const h of hidden ?? []) delete doc[h];
  return doc;
};

export const GET = handler(async (_req: NextRequest, ctx: Ctx) => {
  const { resource, id } = await ctx.params;
  const def = getResource(resource);
  await requireAdmin(def.read);
  if (!isValidObjectId(id)) return fail("NOT_FOUND", "Not found", 404);
  const doc = await def.model(await getWebConnection()).findById(id).lean();
  if (!doc) return fail("NOT_FOUND", "Not found", 404);
  return ok(hide(doc, def.hidden));
});

export const PATCH = handler(async (req: NextRequest, ctx: Ctx) => {
  const { resource, id } = await ctx.params;
  const def = getResource(resource);
  const actor = await requireAdmin(def.write);
  if (!isValidObjectId(id)) return fail("NOT_FOUND", "Not found", 404);
  const parsed = def.update.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail("VALIDATION_ERROR", "Invalid body", 422, parsed.error.flatten());
  const data: any = { ...parsed.data };
  if (resource === "users" && data.password) {
    data.passwordHash = await bcrypt.hash(data.password, 10);
    delete data.password;
  }
  const M = def.model(await getWebConnection());
  const before = await M.findById(id).lean();
  if (!before) return fail("NOT_FOUND", "Not found", 404);
  const isAdministrator = actor.role === "admin" || actor.permissions.includes("*");
  if (resource === "roles" && (before as any).isSystem && !isAdministrator) return fail("FORBIDDEN", "Only an administrator can manage system roles", 403);
  if (resource === "roles" && (before as any).slug === "admin" && data.slug && data.slug !== "admin") return fail("FORBIDDEN", "The Administrator role slug cannot be changed", 403);
  const after = await M.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true }).lean();
  await audit(actor, `${resource}.update`, resource, id, hide(before, def.hidden), hide(after, def.hidden), req);
  return ok(hide(after, def.hidden));
});

export const DELETE = handler(async (req: NextRequest, ctx: Ctx) => {
  const { resource, id } = await ctx.params;
  const def = getResource(resource);
  const actor = await requireAdmin(def.write);
  if (!isValidObjectId(id)) return fail("NOT_FOUND", "Not found", 404);
  const M = def.model(await getWebConnection());
  const before = await M.findById(id).lean();
  if (!before) return fail("NOT_FOUND", "Not found", 404);
  const isAdministrator = actor.role === "admin" || actor.permissions.includes("*");
  if (resource === "roles" && (before as any).isSystem && !isAdministrator) return fail("FORBIDDEN", "Only an administrator can manage system roles", 403);
  if (resource === "roles" && (before as any).slug === "admin") return fail("FORBIDDEN", "The Administrator role cannot be deleted", 403);
  if (resource === "users" && String(id) === actor.sub) return fail("FORBIDDEN", "You cannot delete your own account", 403);
  await M.deleteOne({ _id: id });
  if (resource === "menu") await M.deleteMany({ parentId: id }); // cascade children
  await audit(actor, `${resource}.delete`, resource, id, hide(before, def.hidden), undefined, req);
  return ok({ deleted: true });
});
