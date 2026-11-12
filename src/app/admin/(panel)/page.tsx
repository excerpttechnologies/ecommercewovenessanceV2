// "use client";
// import { useQuery } from "@tanstack/react-query";
// import Link from "next/link";
// import { api } from "@/hooks/api";
// import { formatINR } from "@/lib/utils";
// import { PageHeader, Stat, Table } from "@/components/admin/table";
// import { Badge } from "@/components/ui/badge";
// import { orderTone } from "@/components/account/order-status";
// import type { Order } from "@/domain/types";

// interface Stats {
//   today: { orders: number; revenue: number };
//   last30: { orders: number; revenue: number; aov: number };
//   statusCounts: Record<string, number>;
//   series: { date: string; orders: number; revenue: number }[];
//   pendingReviews: number; newEnquiries: number; abandonedCarts: number;
//   customers: number | null;
//   stock: { total: number; inStock: number; lowStock: number; outOfStock: number } | null;
//   /** Per-source health so an unreachable RetailERP shows a reason instead of silent zeros. */
//   sources: {
//     web: { ok: boolean; error: string | null };
//     erp: { configured: boolean; ok: boolean; stock: boolean; empty: boolean; error: string | null };
//   };
//   topSkus: { sku: string; name: string; qty: number; revenue: number }[];
//   latestOrders: Order[];
//   outForDelivery: Order[];
// }

// export default function Dashboard() {
//   const { data, isLoading, error } = useQuery({ queryKey: ["admin", "dashboard"], queryFn: async () => (await api<Stats>("/api/v1/admin/dashboard")).data });
//   if (error) return <p className="text-sm text-red-700">{(error as Error).message}</p>;
//   if (isLoading || !data) return <p className="text-sm text-muted">Loading…</p>;
//   return (
//     <div>
//       <PageHeader title="Dashboard" />
//       <SourceNotice sources={data.sources} />
//       <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
//         <Stat label="Today" value={formatINR(data.today.revenue)} sub={`${data.today.orders} orders`} tone="maroon" />
//         <Stat label="Last 30 days" value={formatINR(data.last30.revenue)} sub={`${data.last30.orders} orders · AOV ${formatINR(data.last30.aov)}`} />
//         <Stat label="ERP customers" value={data.customers ?? "—"} sub={data.customers === null ? "RetailERP unavailable" : `${data.abandonedCarts} website abandoned carts`} />
//         <Stat label="Stock" value={data.stock ? `${data.stock.inStock}/${data.stock.total}` : "—"} sub={data.stock ? `${data.stock.lowStock} low · ${data.stock.outOfStock} out` : "RetailERP unavailable"} tone="gold" />
//       </div>
//       <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
//         <div className="rounded-sm border border-line p-4">
//           <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-muted">Revenue · last 30 days</p>
//           <Sparkline data={data.series} />
//         </div>
//         <div className="space-y-3">
//           <div className="rounded-sm border border-line p-4">
//             <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-muted">Needs attention</p>
//             <ul className="space-y-1.5 text-sm">
//               <li className="flex justify-between"><Link href="/admin/orders?status=Placed" className="hover:text-maroon">Orders to confirm</Link><Badge tone="amber">{data.statusCounts.Placed ?? 0}</Badge></li>
//               <li className="flex justify-between"><Link href="/admin/orders?status=Confirmed" className="hover:text-maroon">To pack</Link><Badge tone="olive">{data.statusCounts.Confirmed ?? 0}</Badge></li>
//               <li className="flex justify-between"><Link href="/admin/orders?status=Packed" className="hover:text-maroon">To ship</Link><Badge tone="blue">{data.statusCounts.Packed ?? 0}</Badge></li>
//               <li className="flex justify-between"><Link href="/admin/reviews" className="hover:text-maroon">Website reviews pending</Link><Badge tone="gold">{data.pendingReviews}</Badge></li>
//               <li className="flex justify-between"><Link href="/admin/enquiries" className="hover:text-maroon">Website new enquiries</Link><Badge tone="gold">{data.newEnquiries}</Badge></li>
//               <li className="flex justify-between"><Link href="/admin/inventory" className="hover:text-maroon">ERP low stock</Link><Badge tone="red">{data.stock?.lowStock ?? "—"}</Badge></li>
//             </ul>
//           </div>
//         </div>
//       </div>
//       <div className="mt-6">
//         <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-muted">Best sellers · 30 days</p>
//         <Table rows={data.topSkus.map((t) => ({ ...t, _id: t.sku }))} columns={[{ key: "sku", label: "Item Code", className: "font-mono text-xs" }, { key: "name", label: "Product" }, { key: "qty", label: "Qty" }, { key: "revenue", label: "Revenue", render: (r) => formatINR(r.revenue) }]} empty="No orders in the last 30 days." />
//       </div>
//       <div className="mt-6 grid gap-6 xl:grid-cols-2">
//         <OrderList title="Latest orders" orders={data.latestOrders} empty="No orders yet." />
//         <OrderList title="Out for delivery" orders={data.outForDelivery} empty="No orders are currently out for delivery." isDeliveryList />
//       </div>
//     </div>
//   );
// }

// function OrderList({ title, orders, empty, isDeliveryList = false }: { title: string; orders: Order[]; empty: string; isDeliveryList?: boolean }) {
//   return (
//     <section className="rounded-sm border border-line p-4">
//       <div className="mb-3 flex items-center justify-between">
//         <h2 className="text-[10px] uppercase tracking-[0.2em] text-muted">{title}</h2>
//         <Link href={isDeliveryList ? "/admin/orders?status=Out%20for%20delivery" : "/admin/orders"} className="text-xs text-maroon hover:underline">View all</Link>
//       </div>
//       {orders.length === 0 ? <p className="py-4 text-center text-sm text-muted">{empty}</p> : (
//         <ul className="divide-y divide-line">
//           {orders.map((order) => (
//             <li key={order.id} className="py-3 first:pt-0 last:pb-0">
//               <div className="flex flex-wrap items-center justify-between gap-2">
//                 <Link href={`/admin/orders/${encodeURIComponent(order.orderNo)}`} className="text-sm font-medium hover:text-maroon">{order.orderNo}</Link>
//                 <Badge tone={orderTone(order.orderStatus)}>{order.orderStatus}</Badge>
//               </div>
//               <div className="mt-1 flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs text-muted">
//                 <span>{order.shippingAddress.name || "Customer"} · {order.shippingAddress.city}</span>
//                 <span>{formatINR(order.netAmount)}</span>
//               </div>
//               {isDeliveryList && <p className="mt-1 text-xs text-muted">AWB: {order.awbNo || "Not available"}</p>}
//               {!isDeliveryList && order.createdAt && <p className="mt-1 text-xs text-muted">{new Date(order.createdAt).toLocaleString("en-IN")}</p>}
//             </li>
//           ))}
//         </ul>
//       )}
//     </section>
//   );
// }

// function Sparkline({ data }: { data: { date: string; revenue: number; orders: number }[] }) {
//   const w = 600, h = 140, pad = 8;
//   const max = Math.max(1, ...data.map((d) => d.revenue));
//   const pts = data.map((d, i) => [pad + (i / (data.length - 1)) * (w - pad * 2), h - pad - (d.revenue / max) * (h - pad * 2)] as const);
//   const path = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
//   return (
//     <svg viewBox={`0 0 ${w} ${h}`} className="h-36 w-full">
//       <path d={`${path} L${pts[pts.length - 1][0]},${h - pad} L${pts[0][0]},${h - pad} Z`} fill="var(--we-gold)" opacity="0.15" />
//       <path d={path} fill="none" stroke="var(--we-olive)" strokeWidth="2" />
//       {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.5" fill="var(--we-maroon)"><title>{data[i].date}: {formatINR(data[i].revenue)} ({data[i].orders} orders)</title></circle>)}
//     </svg>
//   );
// }

// /** Says why a source is missing instead of leaving the admin guessing at a wall of zeros. */
// function SourceNotice({ sources }: { sources: Stats["sources"] }) {
//   const message = sources.web.error
//     ? `Website order figures could not be loaded: ${sources.web.error}`
//     : !sources.erp.configured
//       ? "RetailERP is not configured (set ERP_MONGODB_URI). RetailERP orders, customers and stock are unavailable; the website figures on this page are live."
//       : sources.erp.error
//         ? `RetailERP is unavailable: ${sources.erp.error}`
//         : sources.erp.empty
//           ? "RetailERP is connected but reports no products and no customers. Check that ERP_DB_NAME / ERP_MONGODB_URI point at the live RetailERP database — the website figures on this page are live."
//           : null;
//   if (!message) return null;
//   return <p className="mb-4 rounded-sm border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{message}</p>;
// }





"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/hooks/api";
import { formatINR } from "@/lib/utils";
import { Table } from "@/components/admin/table";
import { Badge } from "@/components/ui/badge";
import { orderTone } from "@/components/account/order-status";
import type { Order } from "@/domain/types";

interface Stats {
  today: { orders: number; revenue: number };
  last30: { orders: number; revenue: number; aov: number };
  statusCounts: Record<string, number>;
  series: { date: string; orders: number; revenue: number }[];
  pendingReviews: number; newEnquiries: number; abandonedCarts: number;
  customers: number | null;
  stock: { total: number; inStock: number; lowStock: number; outOfStock: number } | null;
  /** Per-source health so an unreachable RetailERP shows a reason instead of silent zeros. */
  sources: {
    web: { ok: boolean; error: string | null };
    erp: { configured: boolean; ok: boolean; stock: boolean; empty: boolean; error: string | null };
  };
  topSkus: { sku: string; name: string; qty: number; revenue: number }[];
  latestOrders: Order[];
  outForDelivery: Order[];
}

export default function Dashboard() {
  const { data, isLoading, error } = useQuery({ queryKey: ["admin", "dashboard"], queryFn: async () => (await api<Stats>("/api/v1/admin/dashboard")).data });
  if (error) return <p className="text-sm text-red-700">{(error as Error).message}</p>;
  if (isLoading || !data) return <p className="text-sm text-muted">Loading…</p>;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl">Dashboard</h1>
      </div>
      <SourceNotice sources={data.sources} />
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardStat label="Today" value={formatINR(data.today.revenue)} sub={`${data.today.orders} orders`} tone="maroon" />
        <DashboardStat label="Last 30 days" value={formatINR(data.last30.revenue)} sub={`${data.last30.orders} orders · AOV ${formatINR(data.last30.aov)}`} />
        <DashboardStat label="ERP customers" value={data.customers ?? "—"} sub={data.customers === null ? "RetailERP unavailable" : `${data.abandonedCarts} website abandoned carts`} />
        <DashboardStat label="Stock" value={data.stock ? `${data.stock.inStock}/${data.stock.total}` : "—"} sub={data.stock ? `${data.stock.lowStock} low · ${data.stock.outOfStock} out` : "RetailERP unavailable"} tone="gold" />
      </div>
      <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-sm border border-line p-3">
          <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-muted">Revenue · last 30 days</p>
          <Sparkline data={data.series} />
        </div>
        <div className="space-y-3">
          <div className="rounded-sm border border-line p-3">
            <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-muted">Needs attention</p>
            <ul className="space-y-1 text-xs">
              <li className="flex justify-between"><Link href="/admin/orders?status=Placed" className="hover:text-maroon">Orders to confirm</Link><Badge tone="amber">{data.statusCounts.Placed ?? 0}</Badge></li>
              <li className="flex justify-between"><Link href="/admin/orders?status=Confirmed" className="hover:text-maroon">To pack</Link><Badge tone="olive">{data.statusCounts.Confirmed ?? 0}</Badge></li>
              <li className="flex justify-between"><Link href="/admin/orders?status=Packed" className="hover:text-maroon">To ship</Link><Badge tone="blue">{data.statusCounts.Packed ?? 0}</Badge></li>
              <li className="flex justify-between"><Link href="/admin/reviews" className="hover:text-maroon">Website reviews pending</Link><Badge tone="gold">{data.pendingReviews}</Badge></li>
              <li className="flex justify-between"><Link href="/admin/enquiries" className="hover:text-maroon">Website new enquiries</Link><Badge tone="gold">{data.newEnquiries}</Badge></li>
              <li className="flex justify-between"><Link href="/admin/inventory" className="hover:text-maroon">ERP low stock</Link><Badge tone="red">{data.stock?.lowStock ?? "—"}</Badge></li>
            </ul>
          </div>
        </div>
      </div>
      <div className="grid gap-3 xl:grid-cols-[1.35fr_1fr_1fr]">
        <div className="min-w-0">
        <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-muted">Best sellers · 30 days</p>
        <Table rows={data.topSkus.map((t) => ({ ...t, _id: t.sku }))} columns={[{ key: "sku", label: "Item Code", className: "font-mono text-xs" }, { key: "name", label: "Product" }, { key: "qty", label: "Qty" }, { key: "revenue", label: "Revenue", render: (r) => formatINR(r.revenue) }]} empty="No orders in the last 30 days." />
        </div>
        <OrderList title="Latest orders" orders={data.latestOrders} empty="No orders yet." />
        <OrderList title="Out for delivery" orders={data.outForDelivery} empty="No orders are currently out for delivery." isDeliveryList />
      </div>
    </div>
  );
}

function OrderList({ title, orders, empty, isDeliveryList = false }: { title: string; orders: Order[]; empty: string; isDeliveryList?: boolean }) {
  return (
    <section className="min-w-0 rounded-sm border border-line p-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-[10px] uppercase tracking-[0.2em] text-muted">{title}</h2>
        <Link href={isDeliveryList ? "/admin/orders?status=Out%20for%20delivery" : "/admin/orders"} className="text-xs text-maroon hover:underline">View all</Link>
      </div>
      {orders.length === 0 ? <p className="py-3 text-center text-xs text-muted">{empty}</p> : (
        <ul className="divide-y divide-line text-xs">
          {orders.map((order) => (
            <li key={order.id} className="py-1.5 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
                <Link href={`/admin/orders/${encodeURIComponent(order.orderNo)}`} className="font-medium hover:text-maroon">{order.orderNo}</Link>
                <Badge tone={orderTone(order.orderStatus)}>{order.orderStatus}</Badge>
              </div>
              <div className="mt-0.5 flex flex-wrap justify-between gap-x-2 gap-y-0.5 text-[10px] text-muted">
                <span>{order.shippingAddress.name || "Customer"} · {order.shippingAddress.city}</span>
                <span>{formatINR(order.netAmount)}</span>
              </div>
              {isDeliveryList && <p className="mt-0.5 text-[10px] text-muted">AWB: {order.awbNo || "Not available"}</p>}
              {!isDeliveryList && order.createdAt && <p className="mt-0.5 text-[10px] text-muted">{new Date(order.createdAt).toLocaleString("en-IN")}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Sparkline({ data }: { data: { date: string; revenue: number; orders: number }[] }) {
  const w = 600, h = 100, pad = 8;
  const max = Math.max(1, ...data.map((d) => d.revenue));
  const pts = data.map((d, i) => [pad + (i / (data.length - 1)) * (w - pad * 2), h - pad - (d.revenue / max) * (h - pad * 2)] as const);
  const path = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-24 w-full">
      <path d={`${path} L${pts[pts.length - 1][0]},${h - pad} L${pts[0][0]},${h - pad} Z`} fill="var(--we-gold)" opacity="0.15" />
      <path d={path} fill="none" stroke="var(--we-olive)" strokeWidth="2" />
      {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.5" fill="var(--we-maroon)"><title>{data[i].date}: {formatINR(data[i].revenue)} ({data[i].orders} orders)</title></circle>)}
    </svg>
  );
}

function DashboardStat({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: string; tone?: "maroon" | "gold" }) {
  return (
    <div className="rounded-sm border border-line bg-ivory/60 px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className={`mt-0.5 break-words font-heading text-2xl ${tone === "maroon" ? "text-maroon" : tone === "gold" ? "text-gold" : "text-olive"}`}>{value}</p>
      {sub && <p className="text-[10px] leading-tight text-muted">{sub}</p>}
    </div>
  );
}

/** Says why a source is missing instead of leaving the admin guessing at a wall of zeros. */
function SourceNotice({ sources }: { sources: Stats["sources"] }) {
  const message = sources.web.error
    ? `Website order figures could not be loaded: ${sources.web.error}`
    : !sources.erp.configured
      ? "RetailERP is not configured (set ERP_MONGODB_URI). RetailERP orders, customers and stock are unavailable; the website figures on this page are live."
      : sources.erp.error
        ? `RetailERP is unavailable: ${sources.erp.error}`
        : sources.erp.empty
          ? "RetailERP is connected but reports no products and no customers. Check that ERP_DB_NAME / ERP_MONGODB_URI point at the live RetailERP database — the website figures on this page are live."
          : null;
  if (!message) return null;
  return <p className="rounded-sm border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-900">{message}</p>;
}
