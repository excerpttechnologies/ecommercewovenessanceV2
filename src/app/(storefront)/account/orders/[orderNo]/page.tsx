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


// import Image from "next/image";
// import Link from "next/link";
// import { notFound } from "next/navigation";
// import { ArrowLeft, CalendarDays, CreditCard, MapPin, Receipt, ShoppingBag, Truck } from "lucide-react";
// import { getCustomerSession } from "@/lib/auth";
// import { formatINR } from "@/lib/utils";
// import { getOrders } from "@/repositories";
// import { Badge } from "@/components/ui/badge";
// import { OrderTimeline, orderTone } from "@/components/account/order-status";
// import { AccountCard, AccountCardTitle } from "@/components/account/account-card";

// export const metadata = { title: "Order details", robots: { index: false } };

// export default async function OrderPage({ params }: { params: Promise<{ orderNo: string }> }) {
//   const s = (await getCustomerSession())!;
//   const order = await getOrders().getByOrderNo((await params).orderNo);
//   if (!order || order.customerId !== s.sub) notFound();
//   const a = order.shippingAddress;
//   return (
//     <div className="space-y-5 sm:space-y-6">
//       <Link href="/account/orders" className="inline-flex items-center gap-1.5 text-xs font-semibold text-maroon hover:underline"><ArrowLeft className="h-3.5 w-3.5" /> All orders</Link>

//       <AccountCard>
//         <div className="flex flex-wrap items-start justify-between gap-3">
//           <div className="min-w-0">
//             <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-maroon">Order</p>
//             <h2 className="truncate font-display text-2xl font-semibold text-ink sm:text-3xl">{order.orderNo}</h2>
//             <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
//               {order.createdAt && <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{new Date(order.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })}</span>}
//               <span className="inline-flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5" />{order.paymentMode} · Payment {order.paymentStatus}</span>
//             </p>
//           </div>
//           <Badge tone={orderTone(order.orderStatus)} className="px-3 py-1 text-[11px]">{order.orderStatus}</Badge>
//         </div>
//         <div className="mt-6 border-t border-line/70 pt-6">
//           <OrderTimeline status={order.orderStatus} />
//           {order.awbNo && (
//             <p className="mt-5 flex items-center gap-2 rounded-xl bg-maroon/[0.05] px-4 py-2.5 text-xs text-ink/80">
//               <Truck className="h-4 w-4 shrink-0 text-maroon" /> Tracking / AWB: <b className="text-ink">{order.awbNo}</b>
//             </p>
//           )}
//         </div>
//       </AccountCard>

//       <div className="grid gap-5 sm:gap-6 lg:grid-cols-[1fr_320px]">
//         <AccountCard>
//           <AccountCardTitle icon={ShoppingBag} title="Items" subtitle={`${order.items.length} item${order.items.length === 1 ? "" : "s"}`} />
//           <ul className="space-y-3">
//             {order.items.map((it) => (
//               <li key={it.sku} className="flex items-center gap-4 rounded-xl border border-line/70 p-3 text-sm">
//                 <span className="relative h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-line">{it.image && <Image src={it.image} alt="" fill sizes="64px" className="object-cover" />}</span>
//                 <span className="min-w-0 flex-1">
//                   <span className="line-clamp-2 font-medium text-ink">{it.name}</span>
//                   <span className="mt-1 block text-xs text-muted">{it.sku} · Qty {it.qty}</span>
//                 </span>
//                 <span className="shrink-0 font-bold text-ink">{formatINR(it.amount)}</span>
//               </li>
//             ))}
//           </ul>
//         </AccountCard>

//         <div className="space-y-5 sm:space-y-6">
//           <AccountCard>
//             <AccountCardTitle icon={MapPin} title="Deliver to" />
//             <div className="text-sm">
//               <p className="font-semibold text-ink">{a.name}</p>
//               <p className="mt-1 leading-relaxed text-muted">{a.line1}{a.line2 ? `, ${a.line2}` : ""}<br />{a.city}, {a.state} {a.pincode}<br />{a.phone}</p>
//             </div>
//           </AccountCard>
//           <AccountCard>
//             <AccountCardTitle icon={Receipt} title="Payment summary" />
//             <dl className="space-y-2 text-sm">
//               <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{formatINR(order.subTotal)}</dd></div>
//               {order.discountTotal > 0 && <div className="flex justify-between text-emerald-700"><dt>Discount{order.couponCode ? ` (${order.couponCode})` : ""}</dt><dd>− {formatINR(order.discountTotal)}</dd></div>}
//               <div className="flex justify-between"><dt className="text-muted">Shipping</dt><dd>{order.shippingCharge ? formatINR(order.shippingCharge) : <span className="font-medium text-emerald-700">Free</span>}</dd></div>
//               <div className="flex justify-between text-xs text-muted"><dt>GST included</dt><dd>{formatINR(order.gstTotal)}</dd></div>
//               <div className="!mt-4 flex items-center justify-between rounded-xl bg-maroon/[0.06] px-3.5 py-3 font-bold"><dt className="text-ink">Total</dt><dd className="text-lg text-maroon">{formatINR(order.netAmount)}</dd></div>
//             </dl>
//           </AccountCard>
//         </div>
//       </div>
//     </div>
//   );
// }


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft, Check, CreditCard, MapPin, Receipt, RefreshCw, Truck, LifeBuoy, Undo2,
  Star, CalendarClock, Tag, Phone, XCircle, ShieldCheck,
} from "lucide-react";
import { getCustomerSession } from "@/lib/auth";
import { formatINR } from "@/lib/utils";
import { getOrders } from "@/repositories";
import { Badge } from "@/components/ui/badge";
import { orderTone } from "@/components/account/order-status";
import { AccountCard, AccountCardTitle } from "@/components/account/account-card";
import { InvoiceButton, GiftReceiptButton } from "@/components/account/order-actions";

export const metadata = { title: "Order details", robots: { index: false } };

const STEPS = [
  { key: "placed", label: "Placed", title: "Order placed", desc: "We received your order and payment." },
  { key: "confirmed", label: "Confirmed", title: "Order confirmed", desc: "Your order is confirmed and is being prepared." },
  { key: "packed", label: "Packed", title: "Packed", desc: "Your items are packed and waiting for the courier." },
  { key: "shipped", label: "Shipped", title: "Shipped", desc: "The courier has picked up your package." },
  { key: "out for delivery", label: "Out for delivery", title: "Out for delivery", desc: "Your package is with the delivery partner and will reach you today." },
  { key: "delivered", label: "Delivered", title: "Delivered", desc: "Your package was delivered." },
];

const normalize = (s: string) => s.toLowerCase().replace(/[_-]+/g, " ").trim();
const fmtDate = (d?: string | Date | null, withTime = false) =>
  d
    ? new Date(d).toLocaleString("en-IN", {
        day: "numeric", month: "short", year: "numeric",
        ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
      })
    : "";

const btnPrimary = "flex w-full items-center justify-center gap-2 rounded-full bg-maroon px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90";
const btnOutline = "flex w-full items-center justify-center gap-2 rounded-full border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-maroon hover:text-maroon";
const chip = "inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 text-xs font-semibold text-ink transition hover:border-maroon hover:text-maroon";

export default async function OrderPage({ params }: { params: Promise<{ orderNo: string }> }) {
  const s = (await getCustomerSession())!;
  const base = await getOrders().getByOrderNo((await params).orderNo);
  if (!base || base.customerId !== s.sub) notFound();

  const order = base as typeof base & {
    courierName?: string;
    estimatedDelivery?: string | Date;
    statusHistory?: { status: string; at: string | Date; note?: string }[];
  };

  const rows = order.items.map((it) => {
    const x = it as typeof it & { size?: string; colour?: string; soldBy?: string; slug?: string };
    return { it, slug: x.slug, size: x.size, colour: x.colour, soldBy: x.soldBy, image: it.image };
  });

  const a = order.shippingAddress;
  const key = normalize(order.orderStatus);
  const idx = STEPS.findIndex((x) => x.key === key);
  const current = STEPS[idx];
  const isCancelled = key === "cancelled";
  const isDelivered = key === "delivered";
  const canTrack = idx >= 3;
  const totalQty = order.items.reduce((n, it) => n + it.qty, 0);
  const history = order.statusHistory ?? [];
  const stepDate = (k: string) => {
    const h = history.find((x) => normalize(x.status) === k);
    return h ? fmtDate(h.at, true) : k === "placed" ? fmtDate(order.createdAt, true) : "";
  };
  const deliveredOn = history.find((x) => normalize(x.status) === "delivered")?.at;
  const eta =
    order.estimatedDelivery ??
    (order.createdAt ? new Date(new Date(order.createdAt).getTime() + 7 * 864e5) : undefined);

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/account/orders" className="inline-flex items-center gap-1.5 text-sm font-semibold text-maroon hover:underline">
          <ArrowLeft className="h-4 w-4" /> All orders
        </Link>
        <p className="text-sm text-muted">{order.items.length} product{order.items.length === 1 ? "" : "s"} · {totalQty} item{totalQty === 1 ? "" : "s"}</p>
      </div>

      {/* ORDER CARD */}
      <section className="overflow-hidden rounded-3xl border border-line/80 bg-white shadow-sm">
        {/* Top strip */}
        <div className="flex flex-wrap items-start justify-between gap-x-10 gap-y-4 bg-maroon/[0.06] px-5 py-5 sm:px-8">
          <div className="flex flex-wrap gap-x-10 gap-y-4">
            {[
              ["Order placed", fmtDate(order.createdAt) || "-"],
              ["Total", formatINR(order.netAmount)],
              ["Ship to", a.name],
            ].map(([l, v]) => (
              <div key={l}>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">{l}</p>
                <p className={`mt-1 text-base font-bold ${l === "Ship to" ? "text-maroon" : "text-ink"}`}>{v}</p>
              </div>
            ))}
          </div>
          <div className="sm:text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Order # {order.orderNo}</p>
            <div className="mt-1.5 flex items-center gap-4 sm:justify-end">
              <a href="#order-details" className="text-sm font-semibold text-maroon hover:underline">View order details</a>
              <span className="h-4 w-px bg-line" />
              <InvoiceButton />
            </div>
          </div>
        </div>

        {/* One Amazon-style row per product */}
        <ul className="divide-y divide-line/70">
          {rows.map(({ it, slug, size, colour, soldBy, image }) => (
            <li key={it.sku} className="grid gap-6 p-5 sm:p-8 lg:grid-cols-[1.15fr_1.1fr_230px]">
              {/* Product */}
              <div className="flex gap-5">
                <span className="relative h-36 w-28 shrink-0 overflow-hidden rounded-2xl bg-line">
                  {image && <Image src={image} alt="" fill sizes="112px" className="object-cover" />}
                </span>
                <div className="min-w-0 text-sm">
                  {slug ? (
                    <Link href={`/products/${slug}`} className="line-clamp-2 text-base font-semibold text-maroon hover:underline">{it.name}</Link>
                  ) : (
                    <p className="line-clamp-2 text-base font-semibold text-maroon">{it.name}</p>
                  )}
                  <p className="mt-1.5 text-muted">
                    {[size && `Size: ${size}`, colour && `Colour: ${colour}`].filter(Boolean).join("  |  ") || `SKU: ${it.sku}`}
                  </p>
                  {soldBy && <p className="mt-1 text-muted">Sold by: {soldBy}</p>}
                  <p className="mt-1 text-xs text-muted">SKU: {it.sku} · Qty {it.qty}</p>
                  <p className="mt-2 text-lg font-bold text-ink">{formatINR(it.amount)}</p>
                  <div className="mt-3 flex flex-wrap gap-2.5">
                    <Link href={slug ? `/products/${slug}` : `/search?q=${encodeURIComponent(it.sku)}`} className={chip}>
                      <RefreshCw className="h-3.5 w-3.5" /> Buy it again
                    </Link>
                    {isDelivered && (
                      <Link href={slug ? `/products/${slug}#reviews` : `/search?q=${encodeURIComponent(it.sku)}`} className={chip}>
                        <Star className="h-3.5 w-3.5" /> Write a product review
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="lg:border-x lg:border-line/70 lg:px-6">
                {isCancelled ? (
                  <div className="flex items-start gap-3 text-red-700">
                    <XCircle className="h-6 w-6 shrink-0" />
                    <div>
                      <p className="text-lg font-bold">Order cancelled</p>
                      <p className="mt-1 text-sm">If you paid online, the refund goes to your original payment method.</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <p className="text-lg font-bold text-maroon">
                        {isDelivered ? `Delivered${deliveredOn ? ` on ${fmtDate(deliveredOn)}` : ""}` : current?.title ?? order.orderStatus}
                      </p>
                      <Badge tone={orderTone(order.orderStatus)} className="px-2.5 py-0.5 text-[10px]">{order.orderStatus}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted">{isDelivered ? "Your package was delivered." : current?.desc}</p>
                    {!isDelivered && eta && (
                      <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-ink">
                        <CalendarClock className="h-4 w-4 text-maroon" /> Estimated delivery: {fmtDate(eta)}
                      </p>
                    )}

                    {/* Compact tracker */}
                    <ol className="mt-6 grid grid-cols-6">
                      {STEPS.map((st, i) => {
                        const done = i < idx || isDelivered;
                        const now = i === idx && !isDelivered;
                        return (
                          <li key={st.key} className="relative text-center">
                            {i < STEPS.length - 1 && (
                              <span className={`absolute left-1/2 top-3.5 h-0.5 w-full ${i < idx ? "bg-maroon" : "bg-line"}`} />
                            )}
                            <span
                              className={`relative z-10 mx-auto flex h-7 w-7 items-center justify-center rounded-full border-2 text-[11px] font-bold ${
                                done ? "border-maroon bg-maroon text-white"
                                : now ? "border-maroon bg-maroon text-white ring-4 ring-maroon/15"
                                : "border-line bg-white text-muted"
                              }`}
                            >
                              {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                            </span>
                            <p className={`mt-2 text-[10px] leading-tight sm:text-[11px] ${done || now ? "font-semibold text-ink" : "text-muted"}`}>{st.label}</p>
                          </li>
                        );
                      })}
                    </ol>
                  </>
                )}
                {(order.awbNo || order.courierName) && (
                  <p className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-maroon/[0.05] px-3.5 py-2.5 text-xs text-ink/80">
                    <Truck className="h-4 w-4 text-maroon" />
                    {order.courierName && <span>Courier: <b className="text-ink">{order.courierName}</b></span>}
                    {order.awbNo && <span>AWB: <b className="text-ink">{order.awbNo}</b></span>}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="space-y-2.5">
                {canTrack && (
                  <Link href={`/track-order?order=${encodeURIComponent(order.orderNo)}`} className={btnPrimary}>
                    <Truck className="h-4 w-4" /> Track package
                  </Link>
                )}
                {isDelivered && (
                  <Link href="/contact" className={btnOutline}><Undo2 className="h-4 w-4" /> Return or replace items</Link>
                )}
                <Link href="/contact" className={btnOutline}><LifeBuoy className="h-4 w-4" /> Get help</Link>
                {/* <GiftReceiptButton orderNo={order.orderNo} items={order.items.map((i) => i.name)} /> */}
                <GiftReceiptButton orderNo={order.orderNo} items={order.items.map((i) => i.name ?? "")} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* DETAILS */}
      <div id="order-details" className="grid scroll-mt-28 gap-6 lg:grid-cols-3">
        <AccountCard>
          <AccountCardTitle icon={MapPin} title="Deliver to" />
          <div className="text-base">
            <p className="font-semibold text-ink">{a.name}</p>
            <p className="mt-2 leading-relaxed text-muted">
              {a.line1}{a.line2 ? `, ${a.line2}` : ""}<br />{a.city}, {a.state} {a.pincode}
            </p>
            <p className="mt-3 inline-flex items-center gap-2 text-sm text-ink"><Phone className="h-4 w-4 text-maroon" /> {a.phone}</p>
          </div>
        </AccountCard>

        <AccountCard>
          <AccountCardTitle icon={CreditCard} title="Payment info" />
          <dl className="space-y-3 text-base">
            <div className="flex justify-between"><dt className="text-muted">Method</dt><dd className="font-semibold text-ink">{order.paymentMode}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Status</dt><dd className="font-semibold text-emerald-700">{order.paymentStatus}</dd></div>
            {order.couponCode && (
              <div className="flex justify-between"><dt className="inline-flex items-center gap-1.5 text-muted"><Tag className="h-4 w-4" /> Coupon</dt><dd className="font-semibold text-ink">{order.couponCode}</dd></div>
            )}
            <div className="flex justify-between"><dt className="text-muted">Placed on</dt><dd className="font-semibold text-ink">{fmtDate(order.createdAt, true)}</dd></div>
          </dl>
          <p className="mt-5 flex items-center gap-2 rounded-xl bg-maroon/[0.05] px-3.5 py-2.5 text-xs text-ink/80">
            <ShieldCheck className="h-4 w-4 shrink-0 text-maroon" /> Secure payment
          </p>
        </AccountCard>

        <AccountCard>
          <AccountCardTitle icon={Receipt} title="Payment summary" />
          <dl className="space-y-3 text-base">
            <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{formatINR(order.subTotal)}</dd></div>
            {order.discountTotal > 0 && (
              <div className="flex justify-between text-emerald-700"><dt>Discount{order.couponCode ? ` (${order.couponCode})` : ""}</dt><dd>− {formatINR(order.discountTotal)}</dd></div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted">Shipping</dt>
              <dd>{order.shippingCharge ? formatINR(order.shippingCharge) : <span className="font-medium text-emerald-700">Free</span>}</dd>
            </div>
            <div className="flex justify-between text-sm text-muted"><dt>GST included</dt><dd>{formatINR(order.gstTotal)}</dd></div>
            <div className="!mt-5 flex items-center justify-between rounded-2xl bg-maroon/[0.06] px-4 py-4 font-bold">
              <dt className="text-ink">Total</dt><dd className="text-2xl text-maroon">{formatINR(order.netAmount)}</dd>
            </div>
          </dl>
        </AccountCard>
      </div>

      {/* ACTIVITY */}
      {!isCancelled && (
        <AccountCard>
          <AccountCardTitle icon={Truck} title="Order activity" subtitle="Updates appear here when the store changes the status" />
          <ol className="relative ml-4 space-y-8 border-l-2 border-line pl-8">
            {STEPS.map((st, i) => {
              const done = i < idx || isDelivered;
              const now = i === idx && !isDelivered;
              const note = history.find((x) => normalize(x.status) === st.key)?.note;
              return (
                <li key={st.key} className="relative">
                  <span
                    className={`absolute -left-[3.05rem] flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-bold ${
                      done || now ? "border-maroon bg-maroon text-white" : "border-line bg-white text-muted"
                    } ${now ? "ring-4 ring-maroon/15" : ""}`}
                  >
                    {done ? <Check className="h-4 w-4" /> : i + 1}
                  </span>
                  <p className={`text-base font-semibold ${done || now ? "text-ink" : "text-muted"}`}>{st.title}</p>
                  <p className="mt-0.5 text-sm text-muted">{st.desc}</p>
                  {note && <p className="mt-1 text-sm text-ink/80">{note}</p>}
                  {stepDate(st.key) && <p className="mt-1 text-xs font-medium text-maroon">{stepDate(st.key)}</p>}
                </li>
              );
            })}
          </ol>
        </AccountCard>
      )}

      {/* HELP */}
      <AccountCard>
        <AccountCardTitle icon={LifeBuoy} title="Need help with this order?" subtitle={`Quote order number ${order.orderNo}`} />
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { t: "Contact support", d: "Questions about delivery, payment or your address.", href: "/contact", icon: Phone },
            { t: "Return or replace", d: "Wrong, damaged or unwanted item? Tell us.", href: "/contact", icon: Undo2 },
            { t: "Track another order", d: "Check the live status of any order.", href: "/track-order", icon: Truck },
          ].map(({ t, d, href, icon: Icon }) => (
            <Link key={t} href={href} className="group rounded-2xl border border-line/80 p-5 transition hover:border-maroon hover:bg-maroon/[0.03]">
              <Icon className="h-6 w-6 text-maroon" />
              <p className="mt-3 text-base font-semibold text-ink group-hover:text-maroon">{t}</p>
              <p className="mt-1 text-sm text-muted">{d}</p>
            </Link>
          ))}
        </div>
      </AccountCard>
    </div>
  );
}
