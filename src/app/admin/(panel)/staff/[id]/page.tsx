"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader, Stat } from "@/components/admin/table";
import { SpecForm, type FieldSpec } from "@/components/admin/form";
import { api } from "@/hooks/api";

interface StaffProfile { designation?: string; branch?: string; mobile?: string; joiningDate?: string | null; photoUrl?: string; address?: string; emergencyContact?: string; notes?: string }
interface StaffDetailData {
  user: { _id: string; name: string; email: string; isActive: boolean; roleId: string; profile: StaffProfile };
  role: { id: string; name: string; slug: string } | null;
  branches: { id: string; name: string }[];
  defaultBranchId?: string;
}
interface ActivityEntry { _id: string; action: string; entity?: string; entityId?: string; createdAt: string; before?: unknown; after?: unknown }
interface ActivityData {
  entries: ActivityEntry[];
  counts: { ordersConfirmed: number; ordersPacked: number; ordersShipped: number; enquiriesReplied: number; productsPublished: number };
}
type Tab = "details" | "activity" | "access";

export default function StaffProfilePage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("details");
  const [saved, setSaved] = useState(false);
  const [activityPage, setActivityPage] = useState(1);
  const detail = useQuery({ queryKey: ["admin", "staff", id], queryFn: async () => (await api<StaffDetailData>(`/api/v1/admin/staff/${id}`)).data });
  const activity = useQuery({ queryKey: ["admin", "staff", id, "activity", activityPage], enabled: tab === "activity", queryFn: async () => {
    const result = await api<ActivityData>(`/api/v1/admin/staff/${id}/activity?page=${activityPage}`);
    return { ...result.data, pages: Number(result.meta?.pages ?? 1) };
  } });
  const update = useMutation({
    mutationFn: (values: { profile: StaffProfile }) => api(`/api/v1/admin/staff/${id}`, { method: "PATCH", json: values }),
    onSuccess: async () => { setSaved(true); await qc.invalidateQueries({ queryKey: ["admin", "staff", id] }); await qc.invalidateQueries({ queryKey: ["admin", "staff"] }); },
  });
  const person = detail.data?.user;
  const fields: FieldSpec[] = [
    { name: "profile.designation", label: "Designation", type: "text" },
    { name: "profile.branch", label: "Branch", type: "select", options: () => (detail.data?.branches ?? []).map((item) => ({ value: item.id, label: item.name })) },
    { name: "profile.mobile", label: "Mobile", type: "mobile", hint: "Enter a 10-digit Indian mobile number starting with 6-9." },
    { name: "profile.joiningDate", label: "Joining date", type: "date" },
    { name: "profile.photoUrl", label: "Photo URL", type: "text" },
    { name: "profile.emergencyContact", label: "Emergency contact", type: "mobile", hint: "Enter a 10-digit Indian mobile number starting with 6-9." },
    { name: "profile.address", label: "Address", type: "textarea", full: true },
    { name: "profile.notes", label: "Notes", type: "textarea", full: true },
  ];

  if (detail.error) return <p className="text-sm text-red-700">{(detail.error as Error).message}</p>;
  if (!person) return <p className="text-sm text-muted">Loading staff profile…</p>;
  const branchName = detail.data?.branches.find((item) => item.id === person.profile?.branch)?.name ?? "No branch";

  return (
    <div>
      <PageHeader title={person.name} subtitle={`${person.profile?.designation || "Staff member"} · ${branchName}`}>
        <Link href="/admin/staff" className="text-xs uppercase tracking-widest text-muted hover:text-olive">← Staff directory</Link>
      </PageHeader>
      <div className="mb-5 flex gap-1 border-b border-line" role="tablist" aria-label="Staff profile sections">
        {(["details", "activity", "access"] as const).map((item) => <button key={item} role="tab" aria-selected={tab === item} onClick={() => setTab(item)} className={`border-b-2 px-4 py-2 text-sm capitalize ${tab === item ? "border-olive text-olive" : "border-transparent text-muted hover:text-ink"}`}>{item}</button>)}
      </div>

      {tab === "details" && <div className="max-w-3xl rounded-sm border border-line p-4 sm:p-6">
        <SpecForm key={`${id}-${person.profile?.branch ?? ""}`} mode="edit" fields={fields} initial={{ profile: person.profile ?? {} }} onSubmit={(values) => { setSaved(false); update.mutate(values); }} busy={update.isPending} error={update.error ? (update.error as Error).message : null} />
        {saved && <p className="mt-3 text-sm text-green-800">Profile saved.</p>}
      </div>}

      {tab === "activity" && <section>
        {activity.error && <p className="mb-3 text-sm text-red-700">{(activity.error as Error).message}</p>}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Stat label="Orders confirmed · 30 days" value={activity.data?.counts.ordersConfirmed ?? 0} />
          <Stat label="Orders packed · 30 days" value={activity.data?.counts.ordersPacked ?? 0} />
          <Stat label="Orders shipped · 30 days" value={activity.data?.counts.ordersShipped ?? 0} />
          <Stat label="Enquiries replied · 30 days" value={activity.data?.counts.enquiriesReplied ?? 0} />
          <Stat label="Products published · 30 days" value={activity.data?.counts.productsPublished ?? 0} />
        </div>
        <h2 className="mb-2 mt-6 text-[10px] uppercase tracking-[0.2em] text-muted">Audit activity</h2>
        {activity.isLoading ? <p className="text-sm text-muted">Loading activity…</p> : activity.data?.entries.length ? <ul className="divide-y divide-line rounded-sm border border-line">
          {activity.data.entries.map((entry) => <li key={entry._id} className="flex flex-wrap justify-between gap-2 px-4 py-3 text-sm"><span><b>{entry.action.replace(/[._]/g, " ")}</b>{entry.entity ? <span className="text-muted"> · {entry.entity}{entry.entityId ? ` ${entry.entityId}` : ""}</span> : null}</span><time className="text-xs text-muted">{new Date(entry.createdAt).toLocaleString("en-IN")}</time></li>)}
        </ul> : <p className="rounded-sm border border-line p-5 text-sm text-muted">No audit activity recorded.</p>}
        {(activity.data?.pages ?? 1) > 1 && <div className="mt-4 flex items-center justify-end gap-3 text-sm"><Button variant="secondary" size="sm" disabled={activityPage <= 1} onClick={() => setActivityPage((current) => current - 1)}>Previous</Button><span className="text-muted">Page {activityPage} of {activity.data?.pages}</span><Button variant="secondary" size="sm" disabled={activityPage >= (activity.data?.pages ?? 1)} onClick={() => setActivityPage((current) => current + 1)}>Next</Button></div>}
      </section>}

      {tab === "access" && <div className="max-w-2xl divide-y divide-line rounded-sm border border-line px-4">
        <div className="flex items-center justify-between gap-4 py-4"><span className="text-sm text-muted">Login role</span><Badge tone="olive">{detail.data?.role?.name ?? "Unknown role"}</Badge></div>
        <div className="flex items-center justify-between gap-4 py-4"><span className="text-sm text-muted">Login status</span><Badge tone={person.isActive ? "green" : "muted"}>{person.isActive ? "active" : "inactive"}</Badge></div>
        <div className="flex items-center justify-between gap-4 py-4"><span className="text-sm text-muted">Login email</span><span className="text-sm">{person.email}</span></div>
        <div className="flex items-center justify-between gap-4 py-4"><span className="text-sm text-muted">Password</span><Link href="/admin/users" className="text-sm text-olive underline underline-offset-2">Reset in Users</Link></div>
      </div>}
    </div>
  );
}