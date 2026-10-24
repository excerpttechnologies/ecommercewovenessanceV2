"use client";
import { cn } from "@/lib/utils";

export interface Column<T> { key: string; label: string; className?: string; render?: (row: T) => React.ReactNode }

export function Table<T extends { _id?: unknown; id?: string }>({ rows, columns, onRowClick, empty = "Nothing here yet.", loading, loadingText = "Loading…" }: { rows: T[]; columns: Column<T>[]; onRowClick?: (row: T) => void; empty?: string; loading?: boolean; loadingText?: string }) {
  return (
    <div className="overflow-x-auto rounded-sm border border-line">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-ivory text-left text-[10px] uppercase tracking-[0.18em] text-muted">
          <tr>{columns.map((c) => <th key={c.key} className={cn("px-3 py-2 font-medium", c.className)}>{c.label}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-line">
          {loading && <tr><td colSpan={columns.length} className="px-3 py-6 text-center text-muted">{loadingText}</td></tr>}
          {!loading && rows.length === 0 && <tr><td colSpan={columns.length} className="px-3 py-6 text-center text-muted">{empty}</td></tr>}
          {rows.map((r, i) => (
            <tr key={String(r._id ?? r.id ?? i)} onClick={onRowClick ? () => onRowClick(r) : undefined} className={cn(onRowClick && "cursor-pointer hover:bg-olive/5")}>
              {columns.map((c) => <td key={c.key} className={cn("px-3 py-2 align-top", c.className)}>{c.render ? c.render(r) : String((r as Record<string, unknown>)[c.key] ?? "")}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pager({ page, pages, onChange }: { page: number; pages: number; onChange: (p: number) => void }) {
  if (pages <= 1) return null;
  return (
    <div className="mt-3 flex items-center justify-end gap-2 text-xs">
      <button disabled={page <= 1} onClick={() => onChange(page - 1)} className="rounded-sm border border-line px-3 py-1 disabled:opacity-40">Prev</button>
      <span className="text-muted">{page} / {pages}</span>
      <button disabled={page >= pages} onClick={() => onChange(page + 1)} className="rounded-sm border border-line px-3 py-1 disabled:opacity-40">Next</button>
    </div>
  );
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-3xl">{title}</h1>{subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}</div>
      <div className="flex gap-2">{children}</div>
    </div>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: string; tone?: "olive" | "maroon" | "gold" }) {
  return (
    <div className="rounded-sm border border-line bg-ivory/60 p-4">
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted">{label}</p>
      <p className={cn("mt-1 font-heading text-3xl", tone === "maroon" ? "text-maroon" : tone === "gold" ? "text-gold" : "text-olive")}>{value}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  );
}
