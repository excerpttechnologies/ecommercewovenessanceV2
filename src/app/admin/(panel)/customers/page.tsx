"use client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { Customer } from "@/domain/types";
import { api } from "@/hooks/api";
import { PageHeader, Pager, Table } from "@/components/admin/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type CustomerWithOrderCount = Customer & { orders: number };

export default function CustomersPage() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const qs = new URLSearchParams({ q, page: String(page) }).toString();
  const list = useQuery({ queryKey: ["admin", "customers", qs], queryFn: () => api<CustomerWithOrderCount[]>(`/api/v1/admin/customers?${qs}`) });
  const meta = list.data?.meta as { pages?: number; total?: number } | undefined;
  return (
    <div>
      <PageHeader title="Customers" />
      <Input placeholder="Name / mobile / email…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="mb-3 max-w-xs" />
      <Table<CustomerWithOrderCount & { _id: string }>
        rows={(list.data?.data ?? []).map((c) => ({ ...c, _id: c.id }))}
        loading={list.isLoading}
        columns={[
          { key: "name", label: "Name", render: (c) => <span className="font-medium">{c.name || "—"}</span> },
          { key: "contact", label: "Contact", className: "text-xs", render: (c) => <>{c.email && <span className="block">{c.email}</span>}{c.mobile && <span className="block text-muted">{c.mobile}</span>}</> },
          { key: "addresses", label: "City", render: (c) => c.addresses.find((a) => a.isDefault)?.city ?? c.addresses[0]?.city ?? "" },
          { key: "orders", label: "Orders" },
          { key: "loyaltyPoints", label: "Points" },
          { key: "isActive", label: "Status", render: (c) => <Badge tone={c.isActive ? "green" : "muted"}>{c.isActive ? "active" : "inactive"}</Badge> },
          { key: "createdAt", label: "Since", render: (c) => (c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-IN") : "") },
        ]}
      />
      <Pager page={page} pages={meta?.pages ?? 1} onChange={setPage} />
    </div>
  );
}
