"use client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/hooks/api";
import { PageHeader, Stat, Table } from "@/components/admin/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface InventoryRow { id: string; itemCode: string; barcode: string; name: string; category: string; qty: number }
interface Inv { summary: { total: number; inStock: number; lowStock: number; outOfStock: number }; threshold: number; lowStock: InventoryRow[]; outOfStock: InventoryRow[] }

export default function InventoryPage() {
  const inv = useQuery({ queryKey: ["admin", "inventory"], queryFn: async () => (await api<Inv>("/api/v1/admin/inventory")).data, refetchInterval: 60_000 });
  const [msg, setMsg] = useState<string | null>(null);
  const test = useMutation({ mutationFn: async () => (await api<{ ok: boolean; dataSource: string; dbName?: string; collections?: Record<string, number>; ms?: number; error?: string }>("/api/v1/admin/erp/test", { method: "POST" })).data, onSuccess: (r) => setMsg(r.ok ? `Connected to ${r.dataSource === "erp" ? "RetailERP" : "mock DB"} (${r.dbName}) in ${r.ms}ms · ${Object.keys(r.collections ?? {}).length} collections checked` : `Connection failed: ${r.error}`), onError: (e) => setMsg((e as Error).message) });
  const sync = useMutation({ mutationFn: async () => (await api<{ scanned: number; created: number; ms: number }>("/api/v1/admin/erp/sync-meta", { method: "POST" })).data, onSuccess: (r) => { setMsg(`Re-sync done: ${r.scanned} products scanned, ${r.created} new slugs in ${r.ms}ms`); inv.refetch(); }, onError: (e) => setMsg((e as Error).message) });
  const d = inv.data;
  const cols = [
    { key: "itemCode", label: "ERP item code", className: "font-mono text-xs" },
    { key: "barcode", label: "ERP barcode", className: "font-mono text-xs" },
    { key: "name", label: "Product" },
    { key: "category", label: "Category" },
    { key: "qty", label: "Qty", render: (r: InventoryRow) => <Badge tone={r.qty <= 0 ? "red" : "amber"}>{r.qty}</Badge> },
  ];
  return (
    <div>
      <PageHeader title="Inventory & RetailERP sync">
        <Button variant="outline" size="sm" loading={test.isPending} onClick={() => test.mutate()}>Test ERP connection</Button>
        <Button variant="secondary" size="sm" loading={sync.isPending} onClick={() => sync.mutate()}>Re-sync web meta</Button>
      </PageHeader>
      {msg && <p className="mb-4 rounded-sm border border-line bg-ivory p-3 text-xs">{msg}</p>}
      {inv.isLoading && <p className="text-sm text-muted">Loading live RetailERP inventory…</p>}
      {inv.isError && <p role="alert" className="rounded-sm border border-red-200 bg-red-50 p-4 text-sm text-red-800">Could not load live RetailERP inventory: {(inv.error as Error).message}</p>}
      {d && (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            <Stat label="Active ERP items" value={d.summary.total} sub="RetailERP" />
            <Stat label="In stock" value={d.summary.inStock} />
            <Stat label={`Low (≤ ${d.threshold})`} value={d.summary.lowStock} tone="gold" />
            <Stat label="Out of stock" value={d.summary.outOfStock} tone="maroon" />
          </div>
          <h2 className="mb-2 mt-8 text-2xl">Low stock</h2>
          <Table rows={d.lowStock.map((row) => ({ ...row, _id: row.id }))} columns={cols} empty="Nothing running low." />
          <h2 className="mb-2 mt-8 text-2xl">Out of stock</h2>
          <Table rows={d.outOfStock.map((row) => ({ ...row, _id: row.id }))} columns={cols} empty="Everything is in stock." />
        </>
      )}
    </div>
  );
}
