"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { api, ApiError } from "@/hooks/api";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Input, Select } from "@/components/ui/input";
import { SpecForm, type FieldSpec } from "./form";
import { Column, PageHeader, Pager, Table } from "./table";

export interface ResourcePageProps<T> {
  resource: string;
  title: string;
  subtitle?: string;
  columns: Column<T>[];
  fields: FieldSpec[];
  filters?: { key: string; label: string; options: { value: string; label: string }[] }[];
  filterTabs?: { key: string; value: string; label: string; count?: number }[];
  aboveFilters?: React.ReactNode;
  searchPlaceholder?: string;
  sortOptions?: { value: string; label: string }[];
  newItemLabel?: string;
  createButtonLabel?: string;
  canCreate?: boolean;
  canDelete?: boolean;
  canDeleteItem?: (row: T) => boolean;
  defaults?: Partial<T>;
  /** Extra row actions (e.g. approve/reject) */
  rowActions?: (row: T, mutate: (id: string, patch: any) => void) => React.ReactNode;
  sort?: string;
  limit?: number;
}

export function useAdminList<T>(resource: string, params: Record<string, string | number | undefined>) {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => [k, String(v)])).toString();
  return useQuery({ queryKey: ["admin", resource, qs], queryFn: async () => api<T[]>(`/api/v1/admin/${resource}?${qs}`) });
}

export function ResourcePage<T extends { _id: string }>({ resource, title, subtitle, columns, fields, filters, filterTabs, aboveFilters, searchPlaceholder = "Search…", sortOptions, newItemLabel, createButtonLabel = "New", canCreate = true, canDelete = true, canDeleteItem, defaults, rowActions, sort, limit = 50 }: ResourcePageProps<T>) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<Record<string, string>>({});
  const [selectedSort, setSelectedSort] = useState(sort ?? "");
  const [editing, setEditing] = useState<T | null | "new">(null);
  const [error, setError] = useState<string | null>(null);
  const list = useAdminList<T>(resource, { q, page, limit, sort: selectedSort, ...Object.fromEntries(Object.entries(filter).map(([k, v]) => [`filter[${k}]`, v])) });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", resource] });
  const save = useMutation({
    mutationFn: async (v: any) => (editing === "new" ? api(`/api/v1/admin/${resource}`, { method: "POST", json: v }) : api(`/api/v1/admin/${resource}/${(editing as T)._id}`, { method: "PATCH", json: strip(v) })),
    onSuccess: () => { setEditing(null); setError(null); invalidate(); },
    onError: (e) => setError(e instanceof ApiError ? `${e.message}${e.details ? " — " + JSON.stringify((e.details as { fieldErrors?: unknown }).fieldErrors ?? e.details) : ""}` : String(e)),
  });
  const patch = useMutation({ mutationFn: ({ id, body }: { id: string; body: any }) => api(`/api/v1/admin/${resource}/${id}`, { method: "PATCH", json: body }), onSuccess: invalidate });
  const remove = useMutation({ mutationFn: (id: string) => api(`/api/v1/admin/${resource}/${id}`, { method: "DELETE" }), onSuccess: () => { setEditing(null); invalidate(); } });
  const meta = list.data?.meta as { pages?: number } | undefined;
  const activeTab = filterTabs?.find((tab) => (filter[tab.key] ?? "") === tab.value) ?? filterTabs?.[0];

  const cols: Column<T>[] = [...columns];
  if (rowActions) cols.push({ key: "__actions", label: "", className: "text-right", render: (r) => <span onClick={(e) => e.stopPropagation()}>{rowActions(r, (id, body) => patch.mutate({ id, body }))}</span> });

  return (
    <div>
      <PageHeader title={title} subtitle={subtitle}>
        {canCreate && <Button size="sm" onClick={() => { setError(null); setEditing("new"); }}><Plus className="h-4 w-4" /> {createButtonLabel}</Button>}
      </PageHeader>
      {aboveFilters}
      {filterTabs && (
        <nav aria-label={`Filter ${title.toLowerCase()} by status`} className="mb-4 overflow-x-auto rounded-lg border border-[#e8ddc9] bg-[#f4eee2] p-1">
          <div className="flex min-w-max items-center gap-1" role="tablist">
            {filterTabs.map((tab) => {
              const selected = activeTab === tab;
              return (
                <button
                  key={tab.label}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => { setFilter({ ...filter, [tab.key]: tab.value }); setPage(1); }}
                  className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs transition-colors ${selected ? "bg-white text-maroon shadow-sm ring-1 ring-[#e4d3bf]" : "text-muted hover:bg-white/60 hover:text-ink"}`}
                >
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && <span className="rounded-full bg-maroon px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">{tab.count.toLocaleString("en-IN")}</span>}
                </button>
              );
            })}
          </div>
        </nav>
      )}
      <div className="mb-3 flex flex-wrap gap-2">
        <Input placeholder={searchPlaceholder} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="min-w-[240px] flex-1" />
        {filters?.filter((f) => !filterTabs?.some((tab) => tab.key === f.key)).map((f) => (
          <Select key={f.key} value={filter[f.key] ?? ""} onChange={(e) => { setFilter({ ...filter, [f.key]: e.target.value }); setPage(1); }} className="w-auto">
            <option value="">{f.label}: all</option>
            {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        ))}
        {sortOptions && <Select aria-label="Sort items" value={selectedSort} onChange={(e) => { setSelectedSort(e.target.value); setPage(1); }} className="w-auto">
          {sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </Select>}
      </div>
      <Table rows={list.data?.data ?? []} columns={cols} loading={list.isLoading} onRowClick={(r) => { setError(null); setEditing(r); }} />
      <Pager page={page} pages={meta?.pages ?? 1} onChange={setPage} />

      <Drawer open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? (newItemLabel ?? `New ${title.replace(/s$/, "").toLowerCase()}`) : `Edit`} className="max-w-2xl">
        <div className="p-5">
          {editing !== null && (
            <SpecForm key={editing === "new" ? "new" : (editing as T)._id} mode={editing === "new" ? "create" : "edit"} fields={fields} initial={editing === "new" ? (defaults ?? {}) : editing} onSubmit={(v) => save.mutate(v)} busy={save.isPending} error={error} />
          )}
          {editing && editing !== "new" && canDelete && (!canDeleteItem || canDeleteItem(editing as T)) && (
            <button onClick={() => confirm("Delete this item?") && remove.mutate((editing as T)._id)} className="mt-6 flex items-center gap-1 text-xs uppercase tracking-widest text-red-700"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
          )}
        </div>
      </Drawer>
    </div>
  );
}

/** Remove server-managed fields before PATCH. */
function strip(v: any) {
  const { _id, __v, createdAt, updatedAt, ...rest } = v;
  return rest;
}
