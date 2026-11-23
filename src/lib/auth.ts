import { cookies } from "next/headers";
import type { Permission } from "@/models/web/commerce.models";
import { ADMIN_COOKIE, CUSTOMER_COOKIE, verifySession, type AdminSession, type CustomerSession } from "./auth-core";

export * from "./auth-core";

/* ---------- Server-component / route helpers ---------- */

export async function getCustomerSession(): Promise<CustomerSession | null> {
  try {
    const jar = await cookies();
    return verifySession<CustomerSession>(jar.get(CUSTOMER_COOKIE)?.value, "customer");
  } catch {
    return null;
  }
}

export async function getAdminSession(): Promise<AdminSession | null> {
  try {
    const jar = await cookies();
    return verifySession<AdminSession>(jar.get(ADMIN_COOKIE)?.value, "admin");
  } catch {
    return null;
  }
}

export function hasPermission(session: AdminSession | null, perm: Permission | Permission[]): boolean {
  if (!session) return false;
  if (session.permissions.includes("*")) return true;
  const needed = Array.isArray(perm) ? perm : [perm];
  return needed.every((p) => session.permissions.includes(p));
}

/** For route handlers: throws a 401/403 error understood by `handler()`. */
export async function requireAdmin(perm?: Permission | Permission[]): Promise<AdminSession> {
  const s = await getAdminSession();
  if (!s) throw Object.assign(new Error("Admin login required"), { status: 401, code: "UNAUTHENTICATED" });
  if (perm && !hasPermission(s, perm)) throw Object.assign(new Error("You don't have permission for this action"), { status: 403, code: "FORBIDDEN" });
  return s;
}

export async function requireCustomer(): Promise<CustomerSession> {
  const s = await getCustomerSession();
  if (!s) throw Object.assign(new Error("Please log in"), { status: 401, code: "UNAUTHENTICATED" });
  return s;
}
