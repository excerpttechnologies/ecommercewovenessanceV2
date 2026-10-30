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
import { SHIPPING_STATUS_LABELS } from "@/lib/order-shipping";
import { PageHeader } from "@/components/admin/table";
import { OrderTimeline, orderTone } from "@/components/account/order-status";
import { Badge, type BadgeTone } from "@/components/ui/badge";

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
const btnDanger = "w-full rounded-sm border border-red-200 px-3 py-2 text-xs uppercase tracking-widest text-red-700 hover:bg-red-50 disabled:opacity-50";

const SHIPPING_TONE: Record<string, BadgeTone> = {
  delivered: "green",
  returned: "green",
  rto_delivered: "green",
  in_transit: "blue",
  out_for_delivery: "blue",
  rto_in_transit: "blue",
  pickup_scheduled: "blue",
  awb_assigned: "blue",
  created: "muted",
  not_created: "muted",
  creating: "muted",
  failed: "red",
  cancelled: "red",
  undelivered: "red",
};

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
  const shipping = o.shipping;
  const shipmentId = shipping?.shiprocketShipmentId ?? o.shiprocketShipmentId;
  const awbNo = shipping?.awbNo ?? o.awbNo;
  const courierName = shipping?.courierName ?? o.courierName;
  const canShip = o.isWebsite && !shipmentId && ["Placed", "Confirmed", "Packed"].includes(o.orderStatus) && !["Cancelled", "Returned"].includes(o.orderStatus);
  const statusButtons = (o.allowedTransitions ?? []).filter((s) => s !== "Cancelled");
  const canCancel = (o.allowedTransitions ?? []).includes("Cancelled");
  const act = (action: string, okText: string, extra: Record<string, unknown> = {}) =>
    run(`/api/v1/admin/orders/${orderNo}/ship`, "POST", { action, ...extra }, okText);
  const trackingEvents = [...(shipping?.trackingEvents ?? [])].reverse();

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
            <>
            <div className="space-y-3 rounded-sm border border-line p-4 text-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] uppercase tracking-widest text-muted">Shipping</p>
                <Badge tone={SHIPPING_TONE[shipping?.status ?? "not_created"] ?? "muted"}>
                  {SHIPPING_STATUS_LABELS[shipping?.status ?? "not_created"] ?? "Not shipped"}
                </Badge>
              </div>
              <dl className="space-y-1 text-xs text-ink/80">
                {courierName && <div className="flex justify-between gap-3"><dt className="text-muted">Courier</dt><dd className="text-right font-medium">{courierName}</dd></div>}
                {awbNo && <div className="flex justify-between gap-3"><dt className="text-muted">AWB</dt><dd className="text-right font-mono">{awbNo}</dd></div>}
                {shipmentId && <div className="flex justify-between gap-3"><dt className="text-muted">Shipment ID</dt><dd className="text-right font-mono">{shipmentId}</dd></div>}
                {shipping?.etaDays ? <div className="flex justify-between gap-3"><dt className="text-muted">ETA</dt><dd className="text-right">{shipping.etaDays} days</dd></div> : null}
                {shipping?.package && <div className="flex justify-between gap-3"><dt className="text-muted">Package</dt><dd className="text-right">{shipping.package.weight} kg · {shipping.package.length}×{shipping.package.breadth}×{shipping.package.height} cm</dd></div>}
                {shipping?.quotedCharge != null && <div className="flex justify-between gap-3"><dt className="text-muted">Charged</dt><dd className="text-right">{formatINR(shipping.quotedCharge)}</dd></div>}
                {shipping?.pickupRequested ? <div className="flex justify-between gap-3"><dt className="text-muted">Pickup</dt><dd className="text-right">{shipping.pickupScheduledDate ?? "requested"}</dd></div> : null}
                {shipping?.returnStatus && <div className="flex justify-between gap-3"><dt className="text-muted">Return</dt><dd className="text-right">{shipping.returnStatus}{shipping.returnAwb ? ` · ${shipping.returnAwb}` : ""}</dd></div>}
              </dl>
              <div className="flex flex-wrap gap-2 text-xs">
                {shipping?.labelUrl && <a href={shipping.labelUrl} target="_blank" rel="noreferrer" className="font-semibold text-maroon hover:underline">Open label</a>}
                {shipping?.manifestUrl && <a href={shipping.manifestUrl} target="_blank" rel="noreferrer" className="font-semibold text-maroon hover:underline">Open manifest</a>}
                {shipping?.trackingUrl && <a href={shipping.trackingUrl} target="_blank" rel="noreferrer" className="font-semibold text-maroon hover:underline">Courier tracking</a>}
              </div>
              {shipping?.lastError && (
                <p role="alert" className="rounded-sm bg-red-50 p-2 text-xs text-red-800">{shipping.lastError.code}: {shipping.lastError.message}</p>
              )}
              {trackingEvents.length > 0 && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-[10px] uppercase tracking-widest text-muted">Tracking history ({trackingEvents.length})</summary>
                  <ol className="mt-2 space-y-2 border-l-2 border-line pl-3">
                    {trackingEvents.slice(0, 15).map((event, index) => (
                      <li key={`${event.date ?? ""}-${index}`}>
                        <p className="font-semibold">{event.status}</p>
                        {event.activity && <p className="text-muted">{event.activity}</p>}
                        <p className="text-[11px] text-muted">{[event.location, event.date].filter(Boolean).join(" · ")}</p>
                      </li>
                    ))}
                  </ol>
                </details>
              )}
            </div>
            <div className="space-y-2 rounded-sm border border-line p-4">
              <p className="text-[10px] uppercase tracking-widest text-muted">Actions</p>
              {canShip && (
                <button className={btnMain} disabled={busy} onClick={() => act("create", "Shipment created in Shiprocket")}>
                  {busy ? "Please wait…" : "Create shipment"}
                </button>
              )}
              {!!shipmentId && !awbNo && (
                <button className={btnMain} disabled={busy} onClick={() => act("awb", "AWB assigned")}>Assign courier & AWB</button>
              )}
              {!!shipmentId && (
                <>
                  <button className={btn} disabled={busy} onClick={() => act("couriers", "Couriers loaded")}>Fetch couriers</button>
                  {awbNo && <button className={btn} disabled={busy} onClick={() => act("pickup", "Pickup scheduled")}>Schedule pickup</button>}
                  <button className={btn} disabled={busy} onClick={() => act("label", "Label generated")}>Generate shipping label</button>
                  <button className={btn} disabled={busy} onClick={() => act("manifest", "Manifest generated")}>Generate manifest</button>
                  <button className={btn} disabled={busy} onClick={() => act("tracking", "Tracking refreshed", { refresh: true })}>Refresh tracking</button>
                  {!shipping?.returnOrderId && o.orderStatus !== "Cancelled" && (
                    <button className={btn} disabled={busy} onClick={() => { if (confirm("Create a return shipment back to the warehouse?")) act("return", "Return shipment created"); }}>Create return</button>
                  )}
                  {o.orderStatus !== "Delivered" && o.orderStatus !== "Cancelled" && (
                    <button className={btnDanger} disabled={busy} onClick={() => { if (confirm("Cancel this shipment in Shiprocket? This also cancels the order.")) act("cancel", "Shipment cancelled"); }}>Cancel shipment</button>
                  )}
                </>
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
              {!canShip && !shipmentId && statusButtons.length === 0 && !canCancel && <p className="text-xs text-muted">No more actions for this order.</p>}
              {msg && <p className={`text-xs ${msg.ok ? "text-green-700" : "text-red-700"}`}>{msg.text}</p>}
            </div>
            </>
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