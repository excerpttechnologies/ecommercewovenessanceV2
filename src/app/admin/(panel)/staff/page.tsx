"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Input, Select } from "@/components/ui/input";
import { PageHeader, Pager, Table } from "@/components/admin/table";
import { SpecForm, type FieldSpec } from "@/components/admin/form";
import { api } from "@/hooks/api";

interface StaffProfile {
  designation?: string;
  branch?: string;
  mobile?: string;
  joiningDate?: string | null;
  photoUrl?: string;
  address?: string;
  emergencyContact?: string;
  notes?: string;
}
interface StaffMember {
  _id: string;
  name: string;
  email: string;
  roleId: string;
  isActive: boolean;
  lastLoginAt?: string;
  profile?: StaffProfile;
}
interface StaffRole { id: string; name: string; slug: string }
interface Branch { id: string; name: string }
interface DirectoryData {
  staff: StaffMember[];
  roles: StaffRole[];
  branches: Branch[];
  defaultBranchId?: string;
  actorRole: string;
  actorId: string;
  lastActiveAdministratorId?: string;
  pages: number;
}
interface StaffDetailData { user: StaffMember; branches: Branch[] }

export default function StaffDirectoryPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [branch, setBranch] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const [showInactive, setShowInactive] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const params = new URLSearchParams({ q, branch, role, page: String(page), limit: "100", showInactive: String(showInactive) }).toString();
  const directory = useQuery({ queryKey: ["admin", "staff", params], queryFn: async () => {
    const result = await api<Omit<DirectoryData, "pages">>(`/api/v1/admin/staff?${params}`);
    return { ...result.data, pages: Number(result.meta?.pages ?? 1) };
  } });
  const data = directory.data;
  const pages = data?.pages ?? 1;
  const editId = editing?._id;
  const editDetail = useQuery({
    queryKey: ["admin", "staff", editId],
    enabled: Boolean(editId),
    queryFn: async () => (await api<StaffDetailData>(`/api/v1/admin/staff/${editId}`)).data,
  });
  const create = useMutation({
    mutationFn: (values: unknown) => api("/api/v1/admin/staff", { method: "POST", json: values }),
    onSuccess: () => { setAdding(false); setCreateError(null); qc.invalidateQueries({ queryKey: ["admin", "staff"] }); },
    onError: (error) => setCreateError((error as Error).message),
  });
  const update = useMutation({
    mutationFn: (values: { id: string; profile: StaffProfile }) => api(`/api/v1/admin/staff/${values.id}`, { method: "PATCH", json: { profile: values.profile } }),
    onSuccess: async () => { setEditing(null); setActionError(null); await qc.invalidateQueries({ queryKey: ["admin", "staff"] }); },
    onError: (error) => setActionError((error as Error).message),
  });
  const deactivate = useMutation({
    mutationFn: (id: string) => api(`/api/v1/admin/staff/${id}`, { method: "DELETE" }),
    onSuccess: async () => { setActionError(null); await qc.invalidateQueries({ queryKey: ["admin", "staff"] }); },
    onError: (error) => setActionError((error as Error).message),
  });
  const fields: FieldSpec[] = [
    { name: "name", label: "Name", type: "text", required: true },
    { name: "email", label: "Login email", type: "text", required: true },
    { name: "roleId", label: "Login role", type: "select", required: true, options: () => (data?.roles ?? []).map((item) => ({ value: item.id, label: item.name })) },
    { name: "password", label: "Temporary password", type: "text", required: true, hint: "At least 8 characters. The staff member can change it after signing in." },
    { name: "isActive", label: "Active login", type: "boolean" },
    { name: "profile.designation", label: "Designation", type: "text", placeholder: "Sales executive, Packer, Store manager" },
    { name: "profile.branch", label: "Branch", type: "select", options: () => (data?.branches ?? []).map((item) => ({ value: item.id, label: item.name })) },
    { name: "profile.mobile", label: "Mobile", type: "mobile", hint: "Enter a 10-digit Indian mobile number starting with 6-9." },
    { name: "profile.joiningDate", label: "Joining date", type: "date" },
    { name: "profile.photoUrl", label: "Photo URL", type: "text" },
    { name: "profile.emergencyContact", label: "Emergency contact", type: "mobile", hint: "Enter a 10-digit Indian mobile number starting with 6-9." },
    { name: "profile.address", label: "Address", type: "textarea", full: true },
    { name: "profile.notes", label: "Notes", type: "textarea", full: true },
  ];
  const editFields: FieldSpec[] = [
    { name: "profile.designation", label: "Designation", type: "text" },
    { name: "profile.branch", label: "Branch", type: "select", options: () => (editDetail.data?.branches ?? []).map((item) => ({ value: item.id, label: item.name })) },
    { name: "profile.mobile", label: "Mobile", type: "mobile", hint: "Enter a 10-digit Indian mobile number starting with 6-9." },
    { name: "profile.joiningDate", label: "Joining date", type: "date" },
    { name: "profile.photoUrl", label: "Photo URL", type: "text" },
    { name: "profile.emergencyContact", label: "Emergency contact", type: "mobile", hint: "Enter a 10-digit Indian mobile number starting with 6-9." },
    { name: "profile.address", label: "Address", type: "textarea", full: true },
    { name: "profile.notes", label: "Notes", type: "textarea", full: true },
  ];
  const roleFor = (person: StaffMember) => data?.roles.find((item) => item.id === person.roleId);
  const canActOn = (person: StaffMember) => {
    const actorRole = data?.actorRole;
    const targetRole = roleFor(person)?.slug;
    return actorRole === "admin" || actorRole === "owner" || (actorRole === "manager" && targetRole === "staff");
  };
  const canDelete = (person: StaffMember) => canActOn(person)
    && person._id !== data?.actorId
    && !(person.isActive && roleFor(person)?.slug === "admin" && person._id === data?.lastActiveAdministratorId);

  if (directory.error) return <p className="text-sm text-red-700">{(directory.error as Error).message}</p>;

  return (
    <div>
      <PageHeader title="Staff">
        <Button size="sm" onClick={() => { setCreateError(null); setAdding(true); }}><Plus className="h-4 w-4" /> Add staff</Button>
      </PageHeader>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Input aria-label="Search staff" placeholder="Name / email / mobile…" value={q} onChange={(event) => { setQ(event.target.value); setPage(1); }} className="max-w-xs" />
        <Select aria-label="Filter by branch" value={branch} onChange={(event) => { setBranch(event.target.value); setPage(1); }} className="w-auto">
          <option value="">All branches</option>{(data?.branches ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </Select>
        <Select aria-label="Filter by role" value={role} onChange={(event) => { setRole(event.target.value); setPage(1); }} className="w-auto">
          <option value="">All roles</option>{(data?.roles ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </Select>
        <label className="flex h-10 items-center gap-2 px-2 text-sm text-ink">
          <input type="checkbox" checked={showInactive} onChange={(event) => { setShowInactive(event.target.checked); setPage(1); }} className="h-4 w-4 accent-[var(--we-olive)]" />
          Show inactive
        </label>
      </div>
      {actionError && <p className="mb-3 text-sm text-red-700">{actionError}</p>}
      <Table<StaffMember>
        rows={data?.staff ?? []}
        loading={directory.isLoading}
        empty={showInactive ? "No staff profiles found." : "No active staff profiles found."}
        onRowClick={(person) => router.push(`/admin/staff/${person._id}`)}
        columns={[
          { key: "name", label: "Name", render: (person) => <div><p className="font-medium">{person.name}</p><p className="mt-0.5 text-xs text-muted">{person.profile?.designation || "—"}</p></div> },
          { key: "email", label: "Email", className: "text-xs" },
          { key: "roleId", label: "Role", render: (person) => <Badge tone="olive">{roleFor(person)?.name ?? "—"}</Badge> },
          { key: "branch", label: "Branch", render: (person) => data?.branches.find((item) => item.id === person.profile?.branch)?.name ?? "—" },
          { key: "mobile", label: "Mobile", render: (person) => person.profile?.mobile || "—" },
          { key: "lastLoginAt", label: "Last login", render: (person) => person.lastLoginAt ? new Date(person.lastLoginAt).toLocaleString("en-IN") : "never" },
          { key: "isActive", label: "Status", render: (person) => <Badge tone={person.isActive ? "green" : "muted"}>{person.isActive ? "active" : "inactive"}</Badge> },
          { key: "actions", label: "Actions", className: "w-[100px] min-w-[100px] whitespace-nowrap px-1 text-right", render: (person) => <div className="flex justify-end gap-1" onClick={(event) => event.stopPropagation()}>
            <Link href={`/admin/staff/${person._id}`} title="View" className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] border border-line text-muted transition-colors hover:bg-olive/5 hover:text-ink" aria-label={`View ${person.name}`}><Eye className="h-3.5 w-3.5" /></Link>
            {canActOn(person) ? <>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0 rounded-[6px] border border-line p-0 text-muted hover:bg-olive/5 hover:text-ink" title="Edit" onClick={() => { setActionError(null); setEditing(person); }} aria-label={`Edit ${person.name}`}><Pencil className="h-3.5 w-3.5" /></Button>
            </> : <span aria-hidden="true" className="invisible h-7 w-7 shrink-0" />}
            {canDelete(person) ? <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0 rounded-[6px] border border-line p-0 text-red-700 hover:bg-red-50 hover:text-red-900" disabled={deactivate.isPending} title="Delete" onClick={() => { if (window.confirm(`Delete ${person.name}? This will deactivate the account.`)) deactivate.mutate(person._id); }} aria-label={`Delete ${person.name}`}><Trash2 className="h-3.5 w-3.5" /></Button> : <span aria-hidden="true" className="invisible h-7 w-7 shrink-0" />}
          </div> },
        ]}
      />
      <Pager page={page} pages={pages} onChange={setPage} />

      <Drawer open={adding} onClose={() => setAdding(false)} title="Add staff member" className="max-w-3xl">
        <div className="p-5">
          <SpecForm key={adding ? "new-staff" : "closed"} mode="create" fields={fields} initial={{ isActive: true, profile: { branch: data?.defaultBranchId } }} onSubmit={(values) => create.mutate(values)} busy={create.isPending} error={createError} submitLabel="Create staff login and profile" />
        </div>
      </Drawer>
      <Drawer open={Boolean(editing)} onClose={() => setEditing(null)} title={editing ? `Edit ${editing.name}` : "Edit staff member"} className="max-w-3xl">
        <div className="p-5">
          {editDetail.isLoading ? <p className="text-sm text-muted">Loading staff profile…</p> : editDetail.data && editId ? <SpecForm key={editId} mode="edit" fields={editFields} initial={{ profile: editDetail.data.user.profile ?? {} }} onSubmit={(values) => update.mutate({ id: editId, profile: values.profile })} busy={update.isPending} error={actionError} submitLabel="Save changes" /> : editDetail.error ? <p className="text-sm text-red-700">{(editDetail.error as Error).message}</p> : null}
        </div>
      </Drawer>
    </div>
  );
}