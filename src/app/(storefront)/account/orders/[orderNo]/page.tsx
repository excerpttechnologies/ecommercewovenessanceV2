// import Image from "next/image";
// import { notFound } from "next/navigation";
// import { getCustomerSession } from "@/lib/auth";
// import { formatINR } from "@/lib/utils";
// import { getOrders } from "@/repositories";
// import { Badge } from "@/components/ui/badge";
// import { OrderTimeline, orderTone } from "@/components/account/order-status";

// export const metadata = { title: "Order details", robots: { index: false } };

// export default async function OrderPage({ params }: { params: Promise<{ orderNo: string }> }) {
//   const s = (await getCustomerSession())!;
//   const order = await getOrders().getByOrderNo((await params).orderNo);
//   if (!order || order.customerId !== s.sub) notFound();
//   const a = order.shippingAddress;
//   return (
//     <div className="space-y-6">
//       <div className="flex flex-wrap items-center justify-between gap-3">
//         <div><h2 className="text-3xl">{order.orderNo}</h2><p className="text-xs text-muted">{order.createdAt ? new Date(order.createdAt).toLocaleString("en-IN") : ""} · {order.paymentMode} · Payment {order.paymentStatus}</p></div>
//         <Badge tone={orderTone(order.orderStatus)}>{order.orderStatus}</Badge>
//       </div>
//       <div className="rounded-lg border border-line bg-white/60 p-5"><OrderTimeline status={order.orderStatus} />{order.awbNo && <p className="mt-3 text-xs text-muted">Tracking / AWB: <b className="text-olive">{order.awbNo}</b></p>}</div>
//       <div className="grid gap-6 md:grid-cols-[1fr_300px]">
//         <ul className="divide-y divide-line rounded-lg border border-line bg-white/60">
//           {order.items.map((it) => (
//             <li key={it.sku} className="flex items-center gap-4 p-4 text-sm">
//               <span className="relative h-20 w-14 shrink-0 overflow-hidden rounded-lg bg-line">{it.image && <Image src={it.image} alt="" fill sizes="56px" className="object-cover" />}</span>
//               <span className="min-w-0 flex-1"><span className="block">{it.name}</span><span className="text-xs text-muted">{it.sku} · × {it.qty}</span></span>
//               <span>{formatINR(it.amount)}</span>
//             </li>
//           ))}
//         </ul>
//         <div className="space-y-4 text-sm">
//           <div className="rounded-lg border border-line bg-white/60 p-4">
//             <p className="mb-2 text-[11px] uppercase tracking-wider text-olive">Deliver to</p>
//             <p className="font-medium">{a.name}</p><p className="text-muted">{a.line1}{a.line2 ? `, ${a.line2}` : ""}<br />{a.city}, {a.state} {a.pincode}<br />{a.phone}</p>
//           </div>
//           <dl className="space-y-1 rounded-lg border border-line bg-white/60 p-4">
//             <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatINR(order.subTotal)}</dd></div>
//             {order.discountTotal > 0 && <div className="flex justify-between text-olive"><dt>Discount{order.couponCode ? ` (${order.couponCode})` : ""}</dt><dd>− {formatINR(order.discountTotal)}</dd></div>}
//             <div className="flex justify-between"><dt>Shipping</dt><dd>{order.shippingCharge ? formatINR(order.shippingCharge) : "Free"}</dd></div>
//             <div className="flex justify-between text-xs text-muted"><dt>GST included</dt><dd>{formatINR(order.gstTotal)}</dd></div>
//             <div className="flex justify-between border-t border-line pt-2 font-medium"><dt>Total</dt><dd>{formatINR(order.netAmount)}</dd></div>
//           </dl>
//         </div>
//       </div>
//     </div>
//   );
// }


////////////////////////////////////////////////////////////////////////////////////////////////////


import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, CreditCard, MapPin, Receipt, ShoppingBag, Truck } from "lucide-react";
import { getCustomerSession } from "@/lib/auth";
import { formatINR } from "@/lib/utils";
import { getOrders } from "@/repositories";
import { Badge } from "@/components/ui/badge";
import { OrderTimeline, orderTone } from "@/components/account/order-status";
import { AccountCard, AccountCardTitle } from "@/components/account/account-card";

export const metadata = { title: "Order details", robots: { index: false } };

export default async function OrderPage({ params }: { params: Promise<{ orderNo: string }> }) {
  const s = (await getCustomerSession())!;
  const order = await getOrders().getByOrderNo((await params).orderNo);
  if (!order || order.customerId !== s.sub) notFound();
  const a = order.shippingAddress;
  return (
    <div className="space-y-5 sm:space-y-6">
      <Link href="/account/orders" className="inline-flex items-center gap-1.5 text-xs font-semibold text-maroon hover:underline"><ArrowLeft className="h-3.5 w-3.5" /> All orders</Link>

      <AccountCard>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-maroon">Order</p>
            <h2 className="truncate font-display text-2xl font-semibold text-ink sm:text-3xl">{order.orderNo}</h2>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
              {order.createdAt && <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{new Date(order.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })}</span>}
              <span className="inline-flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5" />{order.paymentMode} · Payment {order.paymentStatus}</span>
            </p>
          </div>
          <Badge tone={orderTone(order.orderStatus)} className="px-3 py-1 text-[11px]">{order.orderStatus}</Badge>
        </div>
        <div className="mt-6 border-t border-line/70 pt-6">
          <OrderTimeline status={order.orderStatus} />
          {order.awbNo && (
            <p className="mt-5 flex items-center gap-2 rounded-xl bg-maroon/[0.05] px-4 py-2.5 text-xs text-ink/80">
              <Truck className="h-4 w-4 shrink-0 text-maroon" /> Tracking / AWB: <b className="text-ink">{order.awbNo}</b>
            </p>
          )}
        </div>
      </AccountCard>

      <div className="grid gap-5 sm:gap-6 lg:grid-cols-[1fr_320px]">
        <AccountCard>
          <AccountCardTitle icon={ShoppingBag} title="Items" subtitle={`${order.items.length} item${order.items.length === 1 ? "" : "s"}`} />
          <ul className="space-y-3">
            {order.items.map((it) => (
              <li key={it.sku} className="flex items-center gap-4 rounded-xl border border-line/70 p-3 text-sm">
                <span className="relative h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-line">{it.image && <Image src={it.image} alt="" fill sizes="64px" className="object-cover" />}</span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 font-medium text-ink">{it.name}</span>
                  <span className="mt-1 block text-xs text-muted">{it.sku} · Qty {it.qty}</span>
                </span>
                <span className="shrink-0 font-bold text-ink">{formatINR(it.amount)}</span>
              </li>
            ))}
          </ul>
        </AccountCard>

        <div className="space-y-5 sm:space-y-6">
          <AccountCard>
            <AccountCardTitle icon={MapPin} title="Deliver to" />
            <div className="text-sm">
              <p className="font-semibold text-ink">{a.name}</p>
              <p className="mt-1 leading-relaxed text-muted">{a.line1}{a.line2 ? `, ${a.line2}` : ""}<br />{a.city}, {a.state} {a.pincode}<br />{a.phone}</p>
            </div>
          </AccountCard>
          <AccountCard>
            <AccountCardTitle icon={Receipt} title="Payment summary" />
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{formatINR(order.subTotal)}</dd></div>
              {order.discountTotal > 0 && <div className="flex justify-between text-emerald-700"><dt>Discount{order.couponCode ? ` (${order.couponCode})` : ""}</dt><dd>− {formatINR(order.discountTotal)}</dd></div>}
              <div className="flex justify-between"><dt className="text-muted">Shipping</dt><dd>{order.shippingCharge ? formatINR(order.shippingCharge) : <span className="font-medium text-emerald-700">Free</span>}</dd></div>
              <div className="flex justify-between text-xs text-muted"><dt>GST included</dt><dd>{formatINR(order.gstTotal)}</dd></div>
              <div className="!mt-4 flex items-center justify-between rounded-xl bg-maroon/[0.06] px-3.5 py-3 font-bold"><dt className="text-ink">Total</dt><dd className="text-lg text-maroon">{formatINR(order.netAmount)}</dd></div>
            </dl>
          </AccountCard>
        </div>
      </div>
    </div>
  );
}
