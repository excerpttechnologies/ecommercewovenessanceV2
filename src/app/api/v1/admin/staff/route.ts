import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { fail, handler, ok } from "@/lib/api/response";
import { env } from "@/lib/env";
import { requireStaffManager } from "@/lib/admin/staff-access";
import { escapeRegex } from "@/lib/utils";
import { getWebConnection, isValidObjectId } from "@/lib/db";
import { getMasterData } from "@/repositories";
import { AdminUserModel, RoleModel } from "@/models/web/commerce.models";
import { indianMobileSchema } from "@/lib/validation/indian-mobile";

export const dynamic = "force-dynamic";

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

async function getBranches() {
  return getMasterData().stores.list();
}

function defaultBranchId(branches: Awaited<ReturnType<typeof getBranches>>) {
  const legacyId = env.LEGACY_BRIDGE_BRANCH_ID;
  if (legacyId && (!branches.length || branches.some((branch) => branch.id === legacyId))) return legacyId;
  return branches[0]?.id;
}

function hideCredentials<T extends Record<string, unknown>>(user: T) {
  const safe = { ...user };
  delete safe.passwordHash;
  delete safe.twoFactorSecret;
  delete safe.sessions;
  delete safe.failedAttempts;
  return safe;
}

export const GET = handler(async (req: NextRequest) => {
  const actor = await requireStaffManager();
  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page") ?? 1));
  const limit = Math.min(100, Math.max(1, Number(sp.get("limit") ?? 100)));
  const match: Record<string, unknown> = { profile: { $exists: true } };
  if (sp.get("showInactive") !== "true") match.isActive = true;
  const q = sp.get("q")?.trim();
  if (q) match.$or = [
    { name: { $regex: escapeRegex(q), $options: "i" } },
    { email: { $regex: escapeRegex(q), $options: "i" } },
    { "profile.mobile": { $regex: escapeRegex(q), $options: "i" } },
  ];
  const branch = sp.get("branch");
  if (branch) match["profile.branch"] = branch;
  const role = sp.get("role");
  if (role) {
    if (!isValidObjectId(role)) return fail("VALIDATION_ERROR", "Invalid role filter", 400);
    match.roleId = role;
  }

  const conn = await getWebConnection();
  const Users = AdminUserModel(conn);
  const Roles = RoleModel(conn);
  const [staff, total, roles, branches] = await Promise.all([
    Users.find(match, { passwordHash: 0, twoFactorSecret: 0, sessions: 0, failedAttempts: 0 }).sort({ name: 1 }).skip((page - 1) * limit).limit(limit).lean(),
    Users.countDocuments(match),
    Roles.find({}, { name: 1, slug: 1 }).sort({ name: 1 }).lean(),
    getBranches(),
  ]);
  const adminRoleIds = roles.filter((roleItem) => roleItem.slug === "admin").map((roleItem) => roleItem._id);
  const activeAdministrators = adminRoleIds.length
    ? await Users.find({ roleId: { $in: adminRoleIds }, isActive: true }, { _id: 1 }).limit(2).lean()
    : [];
  return ok({
    staff,
    actorRole: actor.role,
    actorId: String(actor.sub),
    lastActiveAdministratorId: activeAdministrators.length === 1 ? String(activeAdministrators[0]._id) : undefined,
    roles: roles.map((roleItem) => ({ id: String(roleItem._id), name: roleItem.name, slug: roleItem.slug })),
    branches: branches.map((item) => ({ id: item.id, name: item.name })),
    defaultBranchId: defaultBranchId(branches),
  }, { total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) });
});

const createInput = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  roleId: z.string().regex(/^[a-f\d]{24}$/i),
  password: z.string().min(8),
  isActive: z.boolean().default(true),
  profile: profileInput,
});

export const POST = handler(async (req: NextRequest) => {
  const actor = await requireStaffManager();
  const parsed = createInput.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail("VALIDATION_ERROR", "Invalid staff details", 422, parsed.error.flatten());

  const conn = await getWebConnection();
  const Roles = RoleModel(conn);
  if (!await Roles.exists({ _id: parsed.data.roleId })) return fail("VALIDATION_ERROR", "Choose an existing role", 422);
  const branches = await getBranches();
  const profile = { ...parsed.data.profile, branch: parsed.data.profile.branch || defaultBranchId(branches) };
  if (profile.branch && branches.length && !branches.some((branch) => branch.id === profile.branch)) return fail("VALIDATION_ERROR", "Choose an existing branch", 422);

  const Users = AdminUserModel(conn);
  try {
    const created = await Users.create({
      name: parsed.data.name,
      email: parsed.data.email,
      roleId: parsed.data.roleId,
      passwordHash: await bcrypt.hash(parsed.data.password, 10),
      isActive: parsed.data.isActive,
      profile,
    });
    const safeUser = hideCredentials(created.toObject() as unknown as Record<string, unknown>);
    await audit(actor, "staff.create", "staff", created._id, undefined, safeUser, req);
    return ok(safeUser, undefined, { status: 201 });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) return fail("CONFLICT", "An account with that email already exists", 409);
    throw error;
  }
});