"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import type { Customer, Order } from "@/domain/types";
import { api } from "@/hooks/api";
import { formatINR } from "@/lib/utils";
import { PageHeader, Pager, Table } from "@/components/admin/table";
import { orderTone } from "@/components/account/order-status";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type OrderDetail = Order & { customer: Customer | null; staffLinks?: Record<string, string> };
type OrderFilter = { label: string; status?: string; paymentStatus?: string; countKey?: string };

const ORDER_FILTERS: OrderFilter[] = [
  { label: "All", countKey: "all" },
  { label: "Awaiting payment", paymentStatus: "Pending", countKey: "awaitingPayment" },
  { label: "Placed", status: "Placed", countKey: "Placed" },
  { label: "To pack", status: "Confirmed", countKey: "Confirmed" },
  { label: "Packed", status: "Packed", countKey: "Packed" },
  { label: "Shipped", status: "Shipped", countKey: "Shipped" },
  { label: "Out for delivery", status: "Out for delivery", countKey: "Out for delivery" },
  { label: "Delivered", status: "Delivered", countKey: "Delivered" },
  { label: "Cancelled", status: "Cancelled", countKey: "Cancelled" },
  { label: "Returned", status: "Returned", countKey: "Returned" },
];

export default function OrdersPage() {
  return <Suspense><OrdersInner /></Suspense>;
}

function OrdersInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [manageOrderNo, setManageOrderNo] = useState<string | null>(null);
  const status = sp.get("status") ?? "";
  const paymentStatus = sp.get("paymentStatus") ?? "";
  const qs = new URLSearchParams({ q, page: String(page), ...(status ? { status } : {}), ...(paymentStatus ? { paymentStatus } : {}) }).toString();
  const list = useQuery({ queryKey: ["admin", "orders", qs], queryFn: () => api<Order[]>(`/api/v1/admin/orders?${qs}`) });
  const meta = list.data?.meta as { pages?: number; total?: number; counts?: Record<string, number> } | undefined;
  const activeFilter = ORDER_FILTERS.find((filter) => filter.status === status && filter.paymentStatus === paymentStatus) ?? ORDER_FILTERS[0];

  function selectFilter(filter: OrderFilter) {
    const params = new URLSearchParams();
    if (filter.status) params.set("status", filter.status);
    if (filter.paymentStatus) params.set("paymentStatus", filter.paymentStatus);
    router.push(`/admin/orders${params.size ? `?${params.toString()}` : ""}`);
    setPage(1);
  }

  return (
    <div>
      <PageHeader title="Orders" subtitle={meta ? `${meta.total} orders` : undefined} />
      <nav aria-label="Filter orders by status" className="mb-4 overflow-x-auto rounded-lg border border-[#e8ddc9] bg-[#f4eee2] p-1">
        <div className="flex min-w-max items-center gap-1" role="tablist">
          {ORDER_FILTERS.map((filter) => {
            const selected = activeFilter === filter;
            const count = filter.countKey ? meta?.counts?.[filter.countKey] : undefined;
            return (
              <button
                key={filter.label}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => selectFilter(filter)}
                className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs transition-colors ${selected ? "bg-white text-maroon shadow-sm ring-1 ring-[#e4d3bf]" : "text-muted hover:bg-white/60 hover:text-ink"}`}
              >
                {filter.label}
                {count !== undefined && count > 0 && <span className="rounded-full bg-maroon px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">{count}</span>}
              </button>
            );
          })}
        </div>
      </nav>
      <div className="mb-3 flex gap-2">
        <Input placeholder="Order no / phone / name…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="max-w-xs" />
      </div>
      <Table<Order & { _id: string }>
        rows={(list.data?.data ?? []).map((o) => ({ ...o, _id: o.id }))}
        loading={list.isLoading}
        onRowClick={(o) => router.push(`/admin/orders/${o.orderNo}`)}
        columns={[
          { key: "orderNo", label: "Order", render: (o) => <><span className="font-medium">{o.orderNo}</span><span className="block text-xs text-muted">{o.createdAt ? new Date(o.createdAt).toLocaleString("en-IN") : ""}</span></> },
          { key: "customer", label: "Customer", render: (o) => <>{o.shippingAddress.name}<span className="block text-xs text-muted">{o.shippingAddress.phone} · {o.shippingAddress.city}</span></> },
          { key: "items", label: "Items", render: (o) => o.items.reduce((n, i) => n + i.qty, 0) },
          { key: "netAmount", label: "Total", render: (o) => formatINR(o.netAmount) },
          { key: "paymentMode", label: "Payment", render: (o) => <>{o.paymentMode}<span className="block text-xs text-muted">{o.paymentStatus}</span></> },
          { key: "orderStatus", label: "Status", render: (o) => <Badge tone={orderTone(o.orderStatus)}>{o.orderStatus}</Badge> },
          { key: "manage", label: "", render: (o) => <Button type="button" size="sm" variant="outline" onClick={(event) => { event.stopPropagation(); setManageOrderNo(o.orderNo); }}>Manage</Button> },
        ]}
      />
      <Pager page={page} pages={meta?.pages ?? 1} onChange={setPage} />
      {manageOrderNo && <OrderManageModal orderNo={manageOrderNo} onClose={() => setManageOrderNo(null)} onManage={() => router.push(`/admin/orders/${encodeURIComponent(manageOrderNo)}`)} />}
    </div>
  );
}

function OrderManageModal({ orderNo, onClose, onManage }: { orderNo: string; onClose: () => void; onManage: () => void }) {
  const detail = useQuery({
    queryKey: ["admin", "order", orderNo],
    queryFn: async () => (await api<OrderDetail>(`/api/v1/admin/orders/${encodeURIComponent(orderNo)}`)).data,
  });
  const order = detail.data;
  const address = order?.shippingAddress;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-6"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <section role="dialog" aria-modal="true" aria-labelledby="manage-order-title" className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
          <div>
            <h2 id="manage-order-title" className="font-heading text-xl">{order ? `Order ${order.orderNo}` : `Order ${orderNo}`}</h2>
            {order && <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
              <Badge tone={orderTone(order.orderStatus)}>{order.orderStatus}</Badge>
              <span>{order.paymentMode} · {order.paymentStatus}</span>
              {order.createdAt && <span>· {new Date(order.createdAt).toLocaleString("en-IN")}</span>}
            </div>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close order details" className="rounded-sm px-2 py-1 text-sm text-muted hover:bg-ivory hover:text-ink">Close</button>
        </header>

        <div className="overflow-y-auto px-5 py-4 sm:px-6">
          {detail.isLoading && <p className="py-8 text-center text-sm text-muted">Loading order details…</p>}
          {detail.error && <p role="alert" className="py-8 text-center text-sm text-red-700">{(detail.error as Error).message}</p>}
          {order && address && (
            <div className="space-y-6">
              <div>
                <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-muted">Items</p>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] text-sm">
                    <thead className="border-b border-line text-left text-[10px] uppercase tracking-widest text-muted">
                      <tr><th className="py-2">Product</th><th>Qty</th><th>Unit</th><th className="text-right">Line total</th></tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {order.items.map((item, index) => <tr key={`${item.sku}-${index}`}>
                        <td className="py-2">{item.name || item.sku}<span className="block font-mono text-xs text-muted">{item.sku}</span></td>
                        <td>{item.qty}</td><td>{formatINR(item.rate)}</td><td className="text-right">{formatINR(item.amount)}</td>
                      </tr>)}
                    </tbody>
                    <tfoot className="text-sm">
                      <tr><td colSpan={3} className="pt-3 text-right text-muted">Subtotal</td><td className="pt-3 text-right">{formatINR(order.subTotal)}</td></tr>
                      {order.discountTotal > 0 && <tr><td colSpan={3} className="text-right text-muted">Discount</td><td className="text-right">− {formatINR(order.discountTotal)}</td></tr>}
                      <tr><td colSpan={3} className="text-right text-muted">GST included</td><td className="text-right">{formatINR(order.gstTotal)}</td></tr>
                      <tr className="border-t border-line font-medium"><td colSpan={3} className="pt-2 text-right">Total</td><td className="pt-2 text-right text-maroon">{formatINR(order.netAmount)}</td></tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-muted">Deliver to</p>
                  <p className="text-sm font-medium">{order.customer?.name ?? address.name ?? "Customer"}</p>
                  <p className="mt-1 text-sm text-muted">{address.line1}{address.line2 ? `, ${address.line2}` : ""}<br />{address.city}, {address.state}, {address.pincode}<br />{address.phone}</p>
                  {order.awbNo && <p className="mt-2 text-xs text-muted">AWB: {order.awbNo}</p>}
                </div>
                <div>
                  <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-muted">Order history</p>
                  {(order.statusHistory?.length ?? 0) > 0 ? (
                    <ol className="space-y-3 border-l border-line pl-4">
                      {[...(order.statusHistory ?? [])].map((entry, index) => {
                        const staffId = entry.by ? order.staffLinks?.[entry.by.toLowerCase()] : undefined;
                        return <li key={`${entry.at ?? entry.status}-${index}`} className="relative text-sm">
                          <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-gold ring-1 ring-gold/40" />
                          <p className="font-medium">{entry.status}</p>
                          <p className="text-xs text-muted">{entry.at ? new Date(entry.at).toLocaleString("en-IN") : "Time unavailable"}{entry.by ? <> · by {staffId ? <Link href={`/admin/staff/${staffId}`} className="text-olive underline underline-offset-2">{entry.by}</Link> : entry.by}</> : null}</p>
                          {entry.note && <p className="mt-1 text-xs italic text-muted">{entry.note}</p>}
                        </li>;
                      })}
                    </ol>
                  ) : <p className="text-sm text-muted">No order history recorded.</p>}
                </div>
              </div>
            </div>
          )}
        </div>
        <footer className="flex justify-end gap-2 border-t border-line px-5 py-3 sm:px-6">
          <Button type="button" variant="outline" onClick={onClose}>Close</Button>
          <Button type="button" onClick={() => { onClose(); onManage(); }}>Manage order</Button>
        </footer>
      </section>
    </div>
  );
}
