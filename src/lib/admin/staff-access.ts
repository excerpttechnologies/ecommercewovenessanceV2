import { requireAdmin } from "@/lib/auth";

export function canManageStaff(role: string) {
  return role === "admin" || role === "owner" || role === "manager";
}

export async function requireStaffManager() {
  const actor = await requireAdmin();
  if (!canManageStaff(actor.role)) {
    throw Object.assign(new Error("Only owners and managers can access staff records"), { status: 403, code: "FORBIDDEN" });
  }
  return actor;
}