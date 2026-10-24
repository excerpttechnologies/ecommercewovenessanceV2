import type { NextRequest } from "next/server";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { fail, handler, ok } from "@/lib/api/response";
import { requireStaffManager } from "@/lib/admin/staff-access";
import { getWebConnection, isValidObjectId } from "@/lib/db";
import { getMasterData } from "@/repositories";
import { AdminUserModel, RoleModel } from "@/models/web/commerce.models";
import { env } from "@/lib/env";
import { indianMobileSchema } from "@/lib/validation/indian-mobile";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

function canManageTarget(actorRole: string, targetRole?: string) {
  return actorRole === "admin" || actorRole === "owner" || (actorRole === "manager" && targetRole === "staff");
}

const profileInput = z.object({
  designation: z.string().trim().max(120).optional(),
  branch: z.string().trim().optional(),
  mobile: indianMobileSchema,
  joiningDate: z.coerce.date().nullable().optional(),
  photoUrl: z.string().trim().max(2048).optional(),
  address: z.string().trim().max(1000).optional(),
  emergencyContact: indianMobileSchema,
  notes: z.string().trim().max(2000).optional(),
});

export const GET = handler(async (_req: NextRequest, ctx: Ctx) => {
  await requireStaffManager();
  const { id } = await ctx.params;
  if (!isValidObjectId(id)) return fail("NOT_FOUND", "Staff member not found", 404);
  const conn = await getWebConnection();
  const Users = AdminUserModel(conn);
  const user = await Users.findOne({ _id: id, profile: { $exists: true } }, { passwordHash: 0, twoFactorSecret: 0, sessions: 0, failedAttempts: 0 }).lean();
  if (!user) return fail("NOT_FOUND", "Staff member not found", 404);
  const [role, branches] = await Promise.all([
    RoleModel(conn).findById(user.roleId, { name: 1, slug: 1 }).lean(),
    getMasterData().stores.list(),
  ]);
  const configuredBranch = env.LEGACY_BRIDGE_BRANCH_ID;
  const defaultBranchId = configuredBranch && (!branches.length || branches.some((branch) => branch.id === configuredBranch)) ? configuredBranch : branches[0]?.id;
  return ok({
    user,
    role: role ? { id: String(role._id), name: role.name, slug: role.slug } : null,
    branches: branches.map((branch) => ({ id: branch.id, name: branch.name })),
    defaultBranchId,
  });
});

const updateInput = z.object({ profile: profileInput });

export const PATCH = handler(async (req: NextRequest, ctx: Ctx) => {
  const actor = await requireStaffManager();
  const { id } = await ctx.params;
  if (!isValidObjectId(id)) return fail("NOT_FOUND", "Staff member not found", 404);
  const parsed = updateInput.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail("VALIDATION_ERROR", "Invalid staff profile", 422, parsed.error.flatten());
  const conn = await getWebConnection();
  const Users = AdminUserModel(conn);
  const before = await Users.findOne({ _id: id, profile: { $exists: true } }).lean();
  if (!before) return fail("NOT_FOUND", "Staff member not found", 404);
  const targetRole = await RoleModel(conn).findById(before.roleId, { slug: 1 }).lean();
  if (!canManageTarget(actor.role, targetRole?.slug)) return fail("FORBIDDEN", "You cannot edit this staff member", 403);
  const branches = await getMasterData().stores.list();
  const branch = parsed.data.profile.branch;
  if (branch && branches.length && !branches.some((item) => item.id === branch)) return fail("VALIDATION_ERROR", "Choose an existing branch", 422);
  const after = await Users.findByIdAndUpdate(id, { $set: { profile: parsed.data.profile } }, { new: true, runValidators: true }).select("name email roleId isActive profile").lean();
  await audit(actor, "staff.profile.update", "staff", id, before.profile, after?.profile, req);
  return ok(after);
});

export const DELETE = handler(async (req: NextRequest, ctx: Ctx) => {
  const actor = await requireStaffManager();
  const { id } = await ctx.params;
  if (!isValidObjectId(id)) return fail("NOT_FOUND", "Staff member not found", 404);
  if (String(actor.sub) === id) return fail("FORBIDDEN", "You cannot delete your own account", 403);

  const conn = await getWebConnection();
  const Users = AdminUserModel(conn);
  const before = await Users.findOne({ _id: id, profile: { $exists: true } }).lean();
  if (!before) return fail("NOT_FOUND", "Staff member not found", 404);
  const targetRole = await RoleModel(conn).findById(before.roleId, { slug: 1 }).lean();
  if (!canManageTarget(actor.role, targetRole?.slug)) return fail("FORBIDDEN", "You cannot delete this staff member", 403);
  if (before.isActive && targetRole?.slug === "admin" && await Users.countDocuments({ roleId: before.roleId, isActive: true }) <= 1) {
    return fail("FORBIDDEN", "The last active Administrator cannot be deleted", 403);
  }

  const after = await Users.findByIdAndUpdate(id, { $set: { isActive: false } }, { new: true, runValidators: true }).select("name email roleId isActive profile lastLoginAt").lean();
  await audit(actor, "staff.deactivate", "staff", id, before, after, req);
  return ok(after);
});