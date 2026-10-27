// "use client";
// import { useQuery } from "@tanstack/react-query";
// import Link from "next/link";
// import { useParams } from "next/navigation";
// import type { Customer, Order } from "@/domain/types";
// import { api } from "@/hooks/api";
// import { formatINR } from "@/lib/utils";
// import { PageHeader } from "@/components/admin/table";
// import { OrderTimeline, orderTone } from "@/components/account/order-status";
// import { Badge } from "@/components/ui/badge";

// type Detail = Order & { customer: Customer | null; allowedTransitions: string[]; staffLinks?: Record<string, string> };

// export default function OrderDetail() {
//   const { orderNo } = useParams<{ orderNo: string }>();
//   const { data: o, error } = useQuery({ queryKey: ["admin", "order", orderNo], queryFn: async () => (await api<Detail>(`/api/v1/admin/orders/${orderNo}`)).data });
//   if (error) return <p className="text-sm text-red-700">{(error as Error).message}</p>;
//   if (!o) return <p className="text-sm text-muted">Loading…</p>;
//   const a = o.shippingAddress;
//   return (
//     <div>
//       <PageHeader title={o.orderNo} subtitle={`${o.createdAt ? new Date(o.createdAt).toLocaleString("en-IN") : ""} · ${o.paymentMode} · payment ${o.paymentStatus}${o.couponCode ? ` · coupon ${o.couponCode}` : ""}`}>
//         <Badge tone={orderTone(o.orderStatus)}>{o.orderStatus}</Badge>
//         <Link href="/admin/orders" className="text-xs uppercase tracking-widest text-muted hover:text-olive">← All orders</Link>
//       </PageHeader>
//       <div className="rounded-sm border border-line p-4"><OrderTimeline status={o.orderStatus} /></div>
//       <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
//         <div className="space-y-6">
//           <table className="w-full text-sm">
//             <thead className="text-left text-[10px] uppercase tracking-widest text-muted"><tr><th className="py-1">Item</th><th>Qty</th><th>Rate</th><th className="text-right">Amount</th></tr></thead>
//             <tbody className="divide-y divide-line">
//               {o.items.map((it) => <tr key={it.sku}><td className="py-2">{it.name}<span className="block font-mono text-xs text-muted">Item Code: {it.sku}</span></td><td>{it.qty}</td><td>{formatINR(it.rate)}</td><td className="text-right">{formatINR(it.amount)}</td></tr>)}
//             </tbody>
//             <tfoot className="text-sm">
//               <tr><td colSpan={3} className="pt-3 text-right text-muted">Subtotal</td><td className="pt-3 text-right">{formatINR(o.subTotal)}</td></tr>
//               {o.discountTotal > 0 && <tr><td colSpan={3} className="text-right text-muted">Discount</td><td className="text-right">− {formatINR(o.discountTotal)}</td></tr>}
//               <tr><td colSpan={3} className="text-right text-muted">Shipping</td><td className="text-right">{formatINR(o.shippingCharge)}</td></tr>
//               <tr><td colSpan={3} className="text-right text-muted">GST (included)</td><td className="text-right">{formatINR(o.gstTotal)}</td></tr>
//               <tr className="font-medium"><td colSpan={3} className="text-right">Total</td><td className="text-right">{formatINR(o.netAmount)}</td></tr>
//             </tfoot>
//           </table>
//           {(o.statusHistory?.length ?? 0) > 0 && (
//             <div>
//               <p className="mb-2 text-[10px] uppercase tracking-widest text-muted">History</p>
//               <ul className="space-y-1 text-xs">{[...(o.statusHistory ?? [])].reverse().map((historyEntry, index) => {
//                 const staffId = historyEntry.by ? o.staffLinks?.[historyEntry.by.toLowerCase()] : undefined;
//                 return <li key={index}><b>{historyEntry.status}</b> · {historyEntry.at ? new Date(historyEntry.at).toLocaleString("en-IN") : ""}{historyEntry.by ? <> · {staffId ? <Link href={`/admin/staff/${staffId}`} className="text-olive underline underline-offset-2">{historyEntry.by}</Link> : historyEntry.by}</> : null}{historyEntry.note ? ` — ${historyEntry.note}` : ""}</li>;
//               })}</ul>
//             </div>
//           )}
//         </div>
//         <div className="space-y-4">
//           <div className="rounded-sm border border-line p-4 text-sm">
//             <p className="mb-1 text-[10px] uppercase tracking-widest text-muted">Customer</p>
//             <p className="font-medium">{o.customer?.name ?? a.name}</p>
//             <p className="text-muted">{o.customer?.mobile ?? a.phone}{o.customer?.email ? ` · ${o.customer.email}` : ""}</p>
//             <p className="mt-3 mb-1 text-[10px] uppercase tracking-widest text-muted">Ship to</p>
//             <p>{a.line1}{a.line2 ? `, ${a.line2}` : ""}<br />{a.city}, {a.state} {a.pincode}<br />{a.phone}</p>
//             {o.awbNo && <p className="mt-3 text-xs">AWB: <b>{o.awbNo}</b></p>}
//           </div>
//           <p className="rounded-sm border border-line bg-ivory p-4 text-sm text-muted">
//             RetailERP order records are read-only here. Update status and tracking in RetailERP.
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// }


/////////////////////////////////////////////////////////////////////////


///////////////////////////////////////////////////////////

"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { Customer, Order } from "@/domain/types";
import { api } from "@/hooks/api";
import { formatINR } from "@/lib/utils";
import { PageHeader } from "@/components/admin/table";
import { OrderTimeline, orderTone } from "@/components/account/order-status";
import { Badge } from "@/components/ui/badge";

type Detail = Order & {
  customer: Customer | null;
  allowedTransitions: string[];
  staffLinks?: Record<string, string>;
  isWebsite?: boolean;
  shiprocketShipmentId?: number | string | null;
  courierName?: string | null;
};

const btn = "w-full rounded-sm border border-line px-3 py-2 text-xs uppercase tracking-widest hover:bg-ivory disabled:opacity-50";
const btnMain = "w-full rounded-sm bg-olive px-3 py-2 text-xs uppercase tracking-widest text-white hover:opacity-90 disabled:opacity-50";

export default function OrderDetail() {
  const { orderNo } = useParams<{ orderNo: string }>();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const { data: o, error } = useQuery({
    queryKey: ["admin", "order", orderNo],
    queryFn: async () => (await api<Detail>(`/api/v1/admin/orders/${orderNo}`)).data,
  });

  async function run(url: string, method: "POST" | "PATCH", body?: object, okText?: string) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j.ok === false) {
        setMsg({ ok: false, text: j?.error?.message ?? j?.message ?? "Something went wrong" });
      } else {
        setMsg({ ok: true, text: okText ?? "Done" });
        await qc.invalidateQueries({ queryKey: ["admin", "order", orderNo] });
        await qc.invalidateQueries({ queryKey: ["admin", "orders"] });
      }
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  if (error) return <p className="text-sm text-red-700">{(error as Error).message}</p>;
  if (!o) return <p className="text-sm text-muted">Loading…</p>;
  const a = o.shippingAddress;
  const canShip = o.isWebsite && !o.shiprocketShipmentId && ["Placed", "Confirmed"].includes(o.orderStatus);
  const statusButtons = (o.allowedTransitions ?? []).filter((s) => s !== "Cancelled");
  const canCancel = (o.allowedTransitions ?? []).includes("Cancelled");

  return (
    <div>
      <PageHeader title={o.orderNo} subtitle={`${o.createdAt ? new Date(o.createdAt).toLocaleString("en-IN") : ""} · ${o.paymentMode} · payment ${o.paymentStatus}${o.couponCode ? ` · coupon ${o.couponCode}` : ""}`}>
        <Badge tone={orderTone(o.orderStatus)}>{o.orderStatus}</Badge>
        <Link href="/admin/orders" className="text-xs uppercase tracking-widest text-muted hover:text-olive">← All orders</Link>
      </PageHeader>
      <div className="rounded-sm border border-line p-4"><OrderTimeline status={o.orderStatus} /></div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <table className="w-full text-sm">
            <thead className="text-left text-[10px] uppercase tracking-widest text-muted"><tr><th className="py-1">Item</th><th>Qty</th><th>Rate</th><th className="text-right">Amount</th></tr></thead>
            <tbody className="divide-y divide-line">
              {o.items.map((it) => <tr key={it.sku}><td className="py-2">{it.name}<span className="block font-mono text-xs text-muted">Item Code: {it.sku}</span></td><td>{it.qty}</td><td>{formatINR(it.rate)}</td><td className="text-right">{formatINR(it.amount)}</td></tr>)}
            </tbody>
            <tfoot className="text-sm">
              <tr><td colSpan={3} className="pt-3 text-right text-muted">Subtotal</td><td className="pt-3 text-right">{formatINR(o.subTotal)}</td></tr>
              {o.discountTotal > 0 && <tr><td colSpan={3} className="text-right text-muted">Discount</td><td className="text-right">− {formatINR(o.discountTotal)}</td></tr>}
              <tr><td colSpan={3} className="text-right text-muted">Shipping</td><td className="text-right">{formatINR(o.shippingCharge)}</td></tr>
              <tr><td colSpan={3} className="text-right text-muted">GST (included)</td><td className="text-right">{formatINR(o.gstTotal)}</td></tr>
              <tr className="font-medium"><td colSpan={3} className="text-right">Total</td><td className="text-right">{formatINR(o.netAmount)}</td></tr>
            </tfoot>
          </table>
          {(o.statusHistory?.length ?? 0) > 0 && (
            <div>
              <p className="mb-2 text-[10px] uppercase tracking-widest text-muted">History</p>
              <ul className="space-y-1 text-xs">{[...(o.statusHistory ?? [])].reverse().map((historyEntry, index) => {
                const staffId = historyEntry.by ? o.staffLinks?.[historyEntry.by.toLowerCase()] : undefined;
                return <li key={index}><b>{historyEntry.status}</b> · {historyEntry.at ? new Date(historyEntry.at).toLocaleString("en-IN") : ""}{historyEntry.by ? <> · {staffId ? <Link href={`/admin/staff/${staffId}`} className="text-olive underline underline-offset-2">{historyEntry.by}</Link> : historyEntry.by}</> : null}{historyEntry.note ? ` — ${historyEntry.note}` : ""}</li>;
              })}</ul>
            </div>
          )}
        </div>
        <div className="space-y-4">
          <div className="rounded-sm border border-line p-4 text-sm">
            <p className="mb-1 text-[10px] uppercase tracking-widest text-muted">Customer</p>
            <p className="font-medium">{o.customer?.name ?? a.name}</p>
            <p className="text-muted">{o.customer?.mobile ?? a.phone}{o.customer?.email ? ` · ${o.customer.email}` : ""}</p>
            <p className="mt-3 mb-1 text-[10px] uppercase tracking-widest text-muted">Ship to</p>
            <p>{a.line1}{a.line2 ? `, ${a.line2}` : ""}<br />{a.city}, {a.state} {a.pincode}<br />{a.phone}</p>
            {o.awbNo && <p className="mt-3 text-xs">AWB: <b>{o.awbNo}</b>{o.courierName ? ` · ${o.courierName}` : ""}</p>}
          </div>

          {o.isWebsite ? (
            <div className="space-y-2 rounded-sm border border-line p-4">
              <p className="text-[10px] uppercase tracking-widest text-muted">Actions</p>
              {canShip && (
                <button className={btnMain} disabled={busy} onClick={() => run(`/api/v1/admin/orders/${orderNo}/ship`, "POST", undefined, "Sent to Shiprocket")}>
                  {busy ? "Please wait…" : "Ship to Shiprocket"}
                </button>
              )}
              {statusButtons.map((s) => (
                <button key={s} className={btn} disabled={busy} onClick={() => run(`/api/v1/admin/orders/${orderNo}`, "PATCH", { status: s }, `Marked ${s}`)}>
                  Mark {s}
                </button>
              ))}
              {canCancel && (
                <button
                  className={`${btn} text-red-700`}
                  disabled={busy}
                  onClick={() => { if (confirm("Cancel this order?")) run(`/api/v1/admin/orders/${orderNo}`, "PATCH", { status: "Cancelled" }, "Order cancelled"); }}
                >
                  Cancel order
                </button>
              )}
              {!canShip && statusButtons.length === 0 && !canCancel && <p className="text-xs text-muted">No more actions for this order.</p>}
              {msg && <p className={`text-xs ${msg.ok ? "text-green-700" : "text-red-700"}`}>{msg.text}</p>}
            </div>
          ) : (
            <p className="rounded-sm border border-line bg-ivory p-4 text-sm text-muted">
              RetailERP order records are read-only here. Update status and tracking in RetailERP.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}