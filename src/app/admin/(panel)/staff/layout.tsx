import { getAdminSession } from "@/lib/auth";
import { canManageStaff } from "@/lib/admin/staff-access";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();
  if (!session || !canManageStaff(session.role)) return <div className="rounded-sm border border-line p-6"><h1 className="font-heading text-2xl">403 · Access denied</h1><p className="mt-2 text-sm text-muted">Only owners and managers can open the staff directory.</p></div>;
  return children;
}