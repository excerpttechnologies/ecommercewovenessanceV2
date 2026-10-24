"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, ApiError } from "@/hooks/api";
import { PageHeader, Pager, Table } from "@/components/admin/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Log { _id: string; actorEmail: string; action: string; entity: string; entityId?: string; ip?: string; createdAt: string; before?: unknown; after?: unknown }
interface AuditMeta { pages?: number; canDelete?: boolean }

export default function AuditPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<Log | null>(null);
  const [error, setError] = useState<string | null>(null);
  const list = useQuery({ queryKey: ["admin", "audit", page], queryFn: () => api<Log[]>(`/api/v1/admin/audit?page=${page}`) });
  const meta = list.data?.meta as AuditMeta | undefined;
  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/v1/admin/audit/${id}`, { method: "DELETE" }),
    onSuccess: (_result, id) => {
      if (open?._id === id) setOpen(null);
      setError(null);
      qc.invalidateQueries({ queryKey: ["admin", "audit"] });
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Could not delete the audit entry."),
  });
  return (
    <div>
      <PageHeader title="Audit log" />
      {error && <p role="alert" className="mb-3 rounded-sm bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <Table<Log> rows={list.data?.data ?? []} loading={list.isLoading} onRowClick={setOpen} columns={[
        { key: "createdAt", label: "When", render: (l) => new Date(l.createdAt).toLocaleString("en-IN") },
        { key: "actorEmail", label: "Who", className: "text-xs" },
        { key: "action", label: "Action", render: (l) => <Badge tone="olive">{l.action}</Badge> },
        { key: "entity", label: "Entity", render: (l) => <>{l.entity}<span className="block font-mono text-xs text-muted">{l.entityId}</span></> },
        ...(meta?.canDelete ? [{
          key: "delete",
          label: "Delete",
          render: (l: Log) => (
            <Button
              type="button"
              size="sm"
              variant="danger"
              loading={remove.isPending && remove.variables === l._id}
              disabled={remove.isPending}
              onClick={(event) => {
                event.stopPropagation();
                if (window.confirm("Delete this audit log entry? This cannot be undone.")) remove.mutate(l._id);
              }}
            >
              Delete
            </Button>
          ),
        }] : []),
      ]} />
      <Pager page={page} pages={meta?.pages ?? 1} onChange={setPage} />
      {open && (
        <div className="mt-4 grid gap-3 rounded-sm border border-line p-4 text-xs md:grid-cols-2">
          <div><p className="mb-1 uppercase tracking-widest text-muted">Before</p><pre className="max-h-72 overflow-auto rounded-sm bg-ivory p-2">{JSON.stringify(open.before ?? null, null, 2)}</pre></div>
          <div><p className="mb-1 uppercase tracking-widest text-muted">After</p><pre className="max-h-72 overflow-auto rounded-sm bg-ivory p-2">{JSON.stringify(open.after ?? null, null, 2)}</pre></div>
        </div>
      )}
    </div>
  );
}
