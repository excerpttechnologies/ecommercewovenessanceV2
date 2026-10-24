import { redirect } from "next/navigation";
import { getAdminSession, hasPermission } from "@/lib/auth";
import { env } from "@/lib/env";
import { ADMIN_NAV } from "@/lib/admin/nav";
import { canManageStaff } from "@/lib/admin/staff-access";
import { AdminShell } from "@/components/admin/shell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  const nav = ADMIN_NAV.filter((n) => n.href === "/admin/staff" ? canManageStaff(session.role) : hasPermission(session, n.perm));
  return (
    <AdminShell nav={nav} user={{ name: session.name, email: session.email, role: session.role }} dataSource={env.DATA_SOURCE}>
      {children}
    </AdminShell>
  );
}
