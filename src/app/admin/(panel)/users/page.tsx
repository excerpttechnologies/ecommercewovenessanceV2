"use client";
import { Badge } from "@/components/ui/badge";
import { ResourcePage, useAdminList } from "@/components/admin/resource-page";

interface U { _id: string; name: string; email: string; roleId: string; isActive: boolean; lastLoginAt?: string; lockedUntil?: string | null }

export default function UsersPage() {
  const roles = useAdminList<{ _id: string; name: string }>("roles", { limit: 100 });
  const roleName = (id: string) => roles.data?.data.find((r) => r._id === id)?.name ?? "—";
  return (
    <ResourcePage<U>
      resource="users"
      title="Admin users"
      columns={[
        { key: "name", label: "Name", render: (r) => <span className="font-medium">{r.name}</span> },
        { key: "email", label: "Email", className: "text-xs" },
        { key: "roleId", label: "Role", render: (r) => <Badge tone="olive">{roleName(r.roleId)}</Badge> },
        { key: "lastLoginAt", label: "Last login", render: (r) => (r.lastLoginAt ? new Date(r.lastLoginAt).toLocaleString("en-IN") : "never") },
        { key: "isActive", label: "Status", render: (r) => <Badge tone={r.lockedUntil && new Date(r.lockedUntil) > new Date() ? "red" : r.isActive ? "green" : "muted"}>{r.lockedUntil && new Date(r.lockedUntil) > new Date() ? "locked" : r.isActive ? "active" : "disabled"}</Badge> },
      ]}
      fields={[
        { name: "name", label: "Name", type: "text", required: true },
        { name: "email", label: "Email", type: "text", required: true },
        { name: "roleId", label: "Role", type: "select", required: true, options: () => (roles.data?.data ?? []).map((r) => ({ value: r._id, label: r.name })) },
        { name: "password", label: "Password", type: "text", hint: "Min 8 characters. Leave blank when editing to keep the current password." },
        { name: "isActive", label: "Active", type: "boolean" },
      ]}
      defaults={{ isActive: true }}
    />
  );
}
