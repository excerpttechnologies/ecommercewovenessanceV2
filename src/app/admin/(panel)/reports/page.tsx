"use client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/hooks/api";
import { formatINR } from "@/lib/utils";
import { PageHeader, Table } from "@/components/admin/table";
import { Input } from "@/components/ui/input";

interface R { byDay: { _id: string; orders: number; revenue: number }[]; byPayment: { _id: string; orders: number; revenue: number }[]; byStatus: { _id: string; orders: number }[]; topProducts: { _id: string; name: string; qty: number; revenue: number }[]; byCoupon: { _id: string; orders: number; discount: number }[]; byCity: { _id: string; orders: number; revenue: number }[] }
const iso = (d: Date) => d.toISOString().slice(0, 10);

export default function ReportsPage() {
  const [from, setFrom] = useState(iso(new Date(Date.now() - 30 * 864e5)));
  const [to, setTo] = useState(iso(new Date()));
  const { data } = useQuery({ queryKey: ["admin", "reports", from, to], queryFn: async () => (await api<R>(`/api/v1/admin/reports?from=${from}&to=${to}T23:59:59`)).data });
  const total = data?.byDay.reduce((s, d) => s + d.revenue, 0) ?? 0;
  const orders = data?.byDay.reduce((s, d) => s + d.orders, 0) ?? 0;
  const csv = () => {
    if (!data) return;
    const lines = ["date,orders,revenue", ...data.byDay.map((d) => `${d._id},${d.orders},${d.revenue}`)];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    a.download = `sales-${from}-${to}.csv`;
    a.click();
  };
  return (
    <div>
      <PageHeader title="Reports" subtitle={`${orders} orders · ${formatINR(total)} (excl. cancelled)`}>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-auto" />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-auto" />
        <button onClick={csv} className="rounded-sm border border-line px-3 text-xs uppercase tracking-widest">Export CSV</button>
      </PageHeader>
      {data && (
        <div className="grid gap-8 lg:grid-cols-2">
          <Section title="Sales by day"><Table rows={data.byDay.map((d) => ({ ...d }))} columns={[{ key: "_id", label: "Date" }, { key: "orders", label: "Orders" }, { key: "revenue", label: "Revenue", render: (r) => formatINR(r.revenue) }]} /></Section>
          <Section title="Top products"><Table rows={data.topProducts} columns={[{ key: "_id", label: "Item Code", className: "font-mono text-xs" }, { key: "name", label: "Product" }, { key: "qty", label: "Qty" }, { key: "revenue", label: "Revenue", render: (r) => formatINR(r.revenue) }]} /></Section>
          <Section title="By payment mode"><Table rows={data.byPayment} columns={[{ key: "_id", label: "Mode" }, { key: "orders", label: "Orders" }, { key: "revenue", label: "Revenue", render: (r) => formatINR(r.revenue) }]} /></Section>
          <Section title="By status"><Table rows={data.byStatus} columns={[{ key: "_id", label: "Status" }, { key: "orders", label: "Orders" }]} /></Section>
          <Section title="Coupons"><Table rows={data.byCoupon} columns={[{ key: "_id", label: "Code" }, { key: "orders", label: "Orders" }, { key: "discount", label: "Discount given", render: (r) => formatINR(r.discount) }]} /></Section>
          <Section title="Top cities"><Table rows={data.byCity} columns={[{ key: "_id", label: "City" }, { key: "orders", label: "Orders" }, { key: "revenue", label: "Revenue", render: (r) => formatINR(r.revenue) }]} /></Section>
        </div>
      )}
    </div>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><h2 className="mb-2 text-2xl">{title}</h2>{children}</div>;
}
