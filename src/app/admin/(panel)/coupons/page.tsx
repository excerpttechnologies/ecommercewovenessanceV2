"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/hooks/api";
import { Badge } from "@/components/ui/badge";
import { ResourcePage } from "@/components/admin/resource-page";

interface C { _id: string; code: string; type: string; value: number; minCart: number; usedCount: number; usageLimit?: number | null; validFrom?: string | null; validTo?: string | null; isActive: boolean; isAdvertised: boolean }
interface CouponSummary { all: number; active: number; expired: number; inactive: number; scheduled: number; advertised: number; redeemed: number; timesRedeemed: number }

function formatCouponDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" }) : "—";
}

export default function CouponsPage() {
  const summary = useQuery({
    queryKey: ["admin", "coupons", "summary"],
    queryFn: async () => (await api<CouponSummary>("/api/v1/admin/coupons/summary")).data,
  });
  const statusTabs = [
    { key: "status", value: "", label: "All", count: summary.data?.all },
    { key: "status", value: "active", label: "Active", count: summary.data?.active },
    { key: "status", value: "expired", label: "Expired", count: summary.data?.expired },
    { key: "status", value: "inactive", label: "Inactive", count: summary.data?.inactive },
    { key: "status", value: "scheduled", label: "Scheduled", count: summary.data?.scheduled },
    { key: "status", value: "advertised", label: "Advertised", count: summary.data?.advertised },
    { key: "status", value: "redeemed", label: "Redeemed", count: summary.data?.redeemed },
  ];

  return (
    <ResourcePage<C>
      resource="coupons"
      title="Coupons & offers"
      createButtonLabel="New coupon"
      newItemLabel="New coupon"
      searchPlaceholder="Search code, name or festival..."
      aboveFilters={summary.isError && <p role="alert" className="mb-3 text-xs text-red-700">{(summary.error as Error).message}</p>}
      filterTabs={statusTabs}
      sortOptions={[
        { value: "createdAt:-1", label: "Newest" },
        { value: "createdAt:1", label: "Oldest" },
        { value: "usedCount:-1", label: "Most redeemed" },
      ]}
      columns={[
        { key: "code", label: "Code", render: (r) => <span className="font-mono font-medium">{r.code}</span> },
        { key: "type", label: "Type", render: (r) => <Badge tone="gold">{r.type}</Badge> },
        { key: "value", label: "Value", render: (r) => (r.type === "percent" ? `${r.value}%` : r.type === "flat" ? `₹${r.value}` : `buy ${r.value}`) },
        { key: "minCart", label: "Min cart", render: (r) => `₹${r.minCart ?? 0}` },
        { key: "usedCount", label: "Used", render: (r) => `${r.usedCount ?? 0}${r.usageLimit ? ` / ${r.usageLimit}` : ""}` },
        { key: "window", label: "Window", render: (r) => <span className="whitespace-nowrap">{formatCouponDate(r.validFrom)} → {formatCouponDate(r.validTo)}</span> },
        { key: "isAdvertised", label: "Offer", render: (r) => r.isAdvertised ? <Badge tone="gold">Advertised</Badge> : <span className="text-muted">—</span> },
        { key: "isActive", label: "Active", render: (r) => <Badge tone={r.isActive ? "green" : "muted"}>{r.isActive ? "yes" : "no"}</Badge> },
      ]}
      fields={[
        { name: "code", label: "Code", type: "text", required: true },
        { name: "type", label: "Type", type: "select", required: true, options: [{ value: "percent", label: "Percent off" }, { value: "flat", label: "Flat ₹ off" }, { value: "bogo", label: "Buy N get 1 (cheapest free)" }] },
        { name: "value", label: "Value", type: "number", required: true },
        { name: "minCart", label: "Minimum cart ₹", type: "number" },
        { name: "maxDiscount", label: "Max discount ₹ (percent)", type: "number" },
        { name: "usageLimit", label: "Total usage limit", type: "number" },
        { name: "perCustomerLimit", label: "Per-customer limit", type: "number" },
        { name: "description", label: "Description", type: "text" },
        { name: "applicableCategories", label: "Applicable categories", type: "tags", hint: "Blank = all. Category names as in RetailERP." },
        { name: "validFrom", label: "Valid from", type: "date" },
        { name: "validTo", label: "Valid to", type: "date" },
        { name: "isAdvertised", label: "Show as an advertised offer", type: "boolean", hint: "Mark this coupon as part of a promoted offer." },
        { name: "isActive", label: "Active", type: "boolean" },
      ]}
      defaults={{ type: "percent", isActive: true, isAdvertised: false, minCart: 0 }}
    />
  );
}
