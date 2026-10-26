// // FILE TO EDIT: src/app/(storefront)/checkout/success/[orderNo]/page.tsx   (existing file - paste only the function below into it)
// // FUNCTION: Success -> replace the whole old Success function with the one in STEP 3 (same name).
// // STEP 1: replace the old import lines at the top with the imports below (the new page needs a few more).
// // STEP 2: add the small constants below, above the function.
// // STEP 3: replace the function Success.

// // ---------- STEP 1: IMPORTS (replace the old import lines) ----------
// import type { Metadata } from "next";
// import Image from "next/image";
// import Link from "next/link";
// import { notFound } from "next/navigation";
// import { BadgeCheck, Clock, CreditCard, MapPin, Package, PackageCheck, ShieldCheck, Truck, XCircle, Home } from "lucide-react";
// import { getCustomerSession } from "@/lib/auth";
// import { getOrders } from "@/repositories";
// import { formatINR, isRemoteImageSource } from "@/lib/utils";
// import { buttonClass } from "@/components/ui/button";
// import { AutoRefresh } from "@/components/ui/auto-refresh";
// import { ComingSoonImage } from "@/components/ui/coming-soon-image";
// import type { OrderStatus } from "@/domain/types";

// // ---------- STEP 2: CONSTANTS (add above the function) ----------
// export const dynamic = "force-dynamic";
// const STEPS: { status: OrderStatus; label: string; icon: typeof Package }[] = [
//   { status: "Placed", label: "Order placed", icon: BadgeCheck },
//   { status: "Confirmed", label: "Confirmed", icon: ShieldCheck },
//   { status: "Packed", label: "Packed", icon: Package },
//   { status: "Shipped", label: "Shipped", icon: Truck },
//   { status: "Out for delivery", label: "Out for delivery", icon: PackageCheck },
//   { status: "Delivered", label: "Delivered", icon: Home },
// ];
// const fmtDate = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
// const fmtTime = (iso?: string) => (iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "");

// // ---------- STEP 3: FUNCTION: Success ----------
// // [CHG-11] REPLACED FUNCTION: Success (server page). WHY: Amazon-style order page - confirmation banner, estimated delivery,
// // address (full only for the logged-in owner), payment status, LIVE status tracker (AutoRefresh), items, price details and
// // cancel/return/refund policy. States: awaitingPayment (online + Pending), paymentFailed, ended (Cancelled/Returned).
// export default async function Success({ params }: { params: Promise<{ orderNo: string }> }) {
//   const order = await getOrders().getByOrderNo((await params).orderNo);
//   if (!order) notFound();

//   const session = await getCustomerSession();
//   const isOwner = session?.sub === order.customerId; // full address only for the logged-in owner
//   const a = order.shippingAddress;
//   const online = order.paymentMode !== "COD";
//   const awaitingPayment = online && order.paymentStatus === "Pending";
//   const paymentFailed = online && order.paymentStatus === "Failed";
//   const ended = order.orderStatus === "Cancelled" || order.orderStatus === "Returned";
//   const done = order.orderStatus === "Delivered" || ended || paymentFailed;

//   const placed = order.createdAt ? new Date(order.createdAt) : new Date();
//   const local = (a.state ?? "").toLowerCase() === "karnataka";
//   const from = new Date(placed); from.setDate(from.getDate() + (local ? 4 : 6));
//   const to = new Date(placed); to.setDate(to.getDate() + (local ? 6 : 10));

//   const current = STEPS.findIndex((s) => s.status === order.orderStatus);
//   const when = (s: OrderStatus) => fmtTime([...(order.statusHistory ?? [])].reverse().find((h) => h.status === s)?.at ?? (s === "Placed" ? order.createdAt : undefined));
//   const trackHref = `/track-order?orderNo=${encodeURIComponent(order.orderNo)}&phone=${encodeURIComponent(a.phone ?? "")}`;

//   return (
//     <div className="bg-ivory">
//       {!done && <AutoRefresh seconds={awaitingPayment ? 5 : 20} />}
//       <div className="mx-auto max-w-4xl space-y-4 px-4 py-8 sm:px-6">
//         {/* Confirmation banner */}
//         <section className={`flex items-center gap-4 rounded-sm border p-5 ${paymentFailed || ended ? "border-red-200 bg-red-50" : awaitingPayment ? "border-gold/50 bg-gold/10" : "border-olive/30 bg-olive/10"}`}>
//           <Image src="/logo1.png" alt="Woven Essence" width={56} height={56} className="hidden h-14 w-auto sm:block" />
//           <div className="flex-1">
//             <h1 className="flex items-center gap-2 text-2xl text-ink sm:text-3xl">
//               {paymentFailed || ended ? <XCircle className="h-7 w-7 text-red-700" /> : awaitingPayment ? <Clock className="h-7 w-7 text-gold" /> : <BadgeCheck className="h-7 w-7 text-olive" />}
//               {paymentFailed ? "Payment not completed" : ended ? `Order ${order.orderStatus.toLowerCase()}` : awaitingPayment ? "Confirming your payment…" : "Order placed, thank you!"}
//             </h1>
//             <p className="mt-1 text-sm text-ink/80">
//               {paymentFailed
//                 ? "No money was taken. If it was deducted, it is refunded automatically in 5–7 working days."
//                 : awaitingPayment
//                   ? "This page updates by itself. Please don’t close it."
//                   : `Confirmation will be sent by SMS and WhatsApp to ${a.phone}.`}
//             </p>
//           </div>
//         </section>

//         {/* Delivery + order summary */}
//         <section className="grid gap-4 rounded-sm border border-line bg-white p-5 sm:grid-cols-3">
//           <div>
//             <p className="text-[11px] uppercase tracking-widest text-muted">Estimated delivery</p>
//             <p className="mt-1 text-lg font-medium text-olive">{ended || paymentFailed ? "—" : `${fmtDate(from)} – ${fmtDate(to)}`}</p>
//             <p className="mt-3 text-[11px] uppercase tracking-widest text-muted">Order</p>
//             <p className="mt-1 text-sm font-medium">{order.orderNo}</p>
//             <p className="text-xs text-muted">Placed on {fmtDate(placed)}</p>
//           </div>
//           <div>
//             <p className="flex items-center gap-1 text-[11px] uppercase tracking-widest text-muted"><MapPin className="h-3.5 w-3.5" /> Delivering to</p>
//             {isOwner ? (
//               <address className="mt-1 text-sm not-italic leading-relaxed text-ink/80">
//                 <b className="text-ink">{a.name}</b><br />{a.line1}{a.line2 ? `, ${a.line2}` : ""}<br />{a.city}, {a.state} {a.pincode}<br />{a.phone}
//               </address>
//             ) : (
//               <p className="mt-1 text-sm text-ink/80"><b className="text-ink">{a.city}</b>, {a.state}<br /><span className="text-xs text-muted">Log in to see the full address.</span></p>
//             )}
//           </div>
//           <div>
//             <p className="flex items-center gap-1 text-[11px] uppercase tracking-widest text-muted"><CreditCard className="h-3.5 w-3.5" /> Payment</p>
//             <p className="mt-1 text-sm font-medium">{online ? "Paid online (Razorpay)" : "Cash on delivery"}</p>
//             <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs ${order.paymentStatus === "Paid" ? "bg-olive/15 text-olive" : order.paymentStatus === "Failed" ? "bg-red-100 text-red-700" : "bg-gold/20 text-ink"}`}>
//               {online ? order.paymentStatus : "Pay on delivery"}
//             </span>
//             <p className="mt-3 text-[11px] uppercase tracking-widest text-muted">Order total</p>
//             <p className="mt-1 text-xl font-medium text-maroon">{formatINR(order.netAmount)}</p>
//           </div>
//         </section>

//         {/* Live status */}
//         {!ended && !paymentFailed && (
//           <section className="rounded-sm border border-line bg-white p-5">
//             <div className="flex items-center justify-between">
//               <h2 className="text-xl">Order status</h2>
//               {!done && <span className="flex items-center gap-1.5 text-xs text-olive"><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-olive opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-olive" /></span>Live</span>}
//             </div>
//             <ol className="mt-5 grid gap-4 sm:grid-cols-6 sm:gap-2">
//               {STEPS.map((s, i) => {
//                 const reached = i <= current;
//                 const Icon = s.icon;
//                 return (
//                   <li key={s.status} className="flex items-center gap-3 sm:flex-col sm:text-center">
//                     <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${reached ? "border-olive bg-olive text-white" : "border-line bg-ivory text-muted"} ${i === current && !done ? "ring-4 ring-olive/20" : ""}`}><Icon className="h-5 w-5" /></span>
//                     <span>
//                       <span className={`block text-xs font-medium ${reached ? "text-ink" : "text-muted"}`}>{s.label}</span>
//                       <span className="block text-[11px] text-muted">{reached ? when(s.status) : ""}</span>
//                     </span>
//                   </li>
//                 );
//               })}
//             </ol>
//             {order.awbNo && <p className="mt-4 text-xs text-muted">Tracking no. <b className="text-ink">{order.awbNo}</b></p>}
//           </section>
//         )}

//         {/* Items + price details */}
//         <section className="grid gap-4 md:grid-cols-[1fr_320px]">
//           <div className="rounded-sm border border-line bg-white p-5">
//             <h2 className="text-xl">Items in this order</h2>
//             <ul className="mt-3 divide-y divide-line">
//               {order.items.map((it) => (
//                 <li key={it.sku} className="flex gap-4 py-3">
//                   <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-sm bg-ivory">
//                     {it.image ? <Image src={it.image} alt={it.name ?? it.sku} fill unoptimized={isRemoteImageSource(it.image)} sizes="80px" className="object-cover" /> : <ComingSoonImage className="absolute inset-0" />}
//                   </div>
//                   <div className="flex-1 text-sm">
//                     <p className="font-medium text-ink">{it.name ?? it.sku}</p>
//                     <p className="mt-0.5 text-xs text-muted">SKU {it.sku} · Qty {it.qty}</p>
//                     <p className="mt-2 font-medium text-maroon">{formatINR(it.amount)}</p>
//                   </div>
//                 </li>
//               ))}
//             </ul>
//           </div>
//           <div className="h-fit rounded-sm border border-line bg-white p-5 text-sm">
//             <h2 className="text-xl">Price details</h2>
//             <dl className="mt-3 space-y-2">
//               <div className="flex justify-between"><dt className="text-muted">Items</dt><dd>{formatINR(order.subTotal)}</dd></div>
//               {order.discountTotal > 0 && <div className="flex justify-between"><dt className="text-muted">Discount{order.couponCode ? ` (${order.couponCode})` : ""}</dt><dd className="text-olive">− {formatINR(order.discountTotal)}</dd></div>}
//               <div className="flex justify-between"><dt className="text-muted">Shipping</dt><dd>{order.shippingCharge ? formatINR(order.shippingCharge) : "Free"}</dd></div>
//               <div className="flex justify-between border-t border-line pt-2 text-base font-medium"><dt>Total</dt><dd className="text-maroon">{formatINR(order.netAmount)}</dd></div>
//               <p className="text-[11px] text-muted">Inclusive of GST {formatINR(order.gstTotal)}</p>
//             </dl>
//           </div>
//         </section>

//         {/* Cancel / refund policy */}
//         <section className="rounded-sm border border-line bg-white p-5 text-sm">
//           <h2 className="text-xl">Cancellation, returns &amp; refunds</h2>
//           <ul className="mt-3 grid gap-3 text-ink/80 sm:grid-cols-3">
//             <li><b className="block text-ink">Cancel</b>Free before dispatch. Call 099163 11500 or write to hello@wovenessence.in.</li>
//             <li><b className="block text-ink">Exchange / return</b>Within 7 days of delivery, unused with tags. Blouse-stitched sarees are not returnable.</li>
//             <li><b className="block text-ink">Refund</b>{online ? "To your original payment method" : "By bank transfer or UPI"} within 5–7 working days after approval.</li>
//           </ul>
//           <p className="mt-3 text-xs"><Link href="/pages/returns" className="text-maroon underline">Full returns &amp; refund policy</Link> · <Link href="/pages/shipping-policy" className="text-maroon underline">Shipping policy</Link></p>
//         </section>

//         <div className="flex flex-wrap justify-center gap-3 pt-2">
//           <Link href={trackHref} className={buttonClass("outline")}>Track order</Link>
//           <Link href="/contact" className={buttonClass("outline")}>Need help?</Link>
//           <Link href="/" className={buttonClass("primary")}>Continue shopping</Link>
//         </div>
//       </div>
//     </div>
//   );
// }






// import type { Metadata } from "next";
// import Image from "next/image";
// import Link from "next/link";
// import { notFound } from "next/navigation";
// import { BadgeCheck, Clock, CreditCard, MapPin, Package, PackageCheck, ShieldCheck, Truck, XCircle, Home } from "lucide-react";
// import { getCustomerSession } from "@/lib/auth";
// import { getOrders } from "@/repositories";
// import { formatINR, isRemoteImageSource } from "@/lib/utils";
// import { buttonClass } from "@/components/ui/button";
// import { AutoRefresh } from "@/components/ui/auto-refresh";
// import { ComingSoonImage } from "@/components/ui/coming-soon-image";
// import type { OrderStatus } from "@/domain/types";

// export const metadata: Metadata = { title: "Order placed", robots: { index: false } };
// export const dynamic = "force-dynamic";

// const STEPS: { status: OrderStatus; label: string; icon: typeof Package }[] = [
//   { status: "Placed", label: "Order placed", icon: BadgeCheck },
//   { status: "Confirmed", label: "Confirmed", icon: ShieldCheck },
//   { status: "Packed", label: "Packed", icon: Package },
//   { status: "Shipped", label: "Shipped", icon: Truck },
//   { status: "Out for delivery", label: "Out for delivery", icon: PackageCheck },
//   { status: "Delivered", label: "Delivered", icon: Home },
// ];

// const fmtDate = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
// const fmtTime = (iso?: string) => (iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "");

// // [CHG-11] REPLACED FUNCTION: Success (server page). WHY: Amazon-style order page - confirmation banner, estimated delivery,
// // address (full only for the logged-in owner), payment status, LIVE status tracker (AutoRefresh), items, price details and
// // cancel/return/refund policy. States: awaitingPayment (online + Pending), paymentFailed, ended (Cancelled/Returned).
// export default async function Success({ params }: { params: Promise<{ orderNo: string }> }) {
//   const order = await getOrders().getByOrderNo((await params).orderNo);
//   if (!order) notFound();

//   const session = await getCustomerSession();
//   const isOwner = session?.sub === order.customerId; // full address only for the logged-in owner
//   const a = order.shippingAddress;
//   const online = order.paymentMode !== "COD";
//   const awaitingPayment = online && order.paymentStatus === "Pending";
//   const paymentFailed = online && order.paymentStatus === "Failed";
//   const ended = order.orderStatus === "Cancelled" || order.orderStatus === "Returned";
//   const done = order.orderStatus === "Delivered" || ended || paymentFailed;

//   const placed = order.createdAt ? new Date(order.createdAt) : new Date();
//   const local = (a.state ?? "").toLowerCase() === "karnataka";
//   const from = new Date(placed); from.setDate(from.getDate() + (local ? 4 : 6));
//   const to = new Date(placed); to.setDate(to.getDate() + (local ? 6 : 10));

//   const current = STEPS.findIndex((s) => s.status === order.orderStatus);
//   const when = (s: OrderStatus) => fmtTime([...(order.statusHistory ?? [])].reverse().find((h) => h.status === s)?.at ?? (s === "Placed" ? order.createdAt : undefined));
//   const trackHref = `/track-order?orderNo=${encodeURIComponent(order.orderNo)}&phone=${encodeURIComponent(a.phone ?? "")}`;

//   return (
//     <div className="bg-ivory">
//       {!done && <AutoRefresh seconds={awaitingPayment ? 5 : 20} />}
//       <div className="mx-auto max-w-4xl space-y-4 px-4 py-8 sm:px-6">
//         {/* Confirmation banner */}
//         <section className={`flex items-center gap-4 rounded-sm border p-5 ${paymentFailed || ended ? "border-red-200 bg-red-50" : awaitingPayment ? "border-gold/50 bg-gold/10" : "border-olive/30 bg-olive/10"}`}>
//           <Image src="/logo1.png" alt="Woven Essence" width={56} height={56} className="hidden h-14 w-auto sm:block" />
//           <div className="flex-1">
//             <h1 className="flex items-center gap-2 text-2xl text-ink sm:text-3xl">
//               {paymentFailed || ended ? <XCircle className="h-7 w-7 text-red-700" /> : awaitingPayment ? <Clock className="h-7 w-7 text-gold" /> : <BadgeCheck className="h-7 w-7 text-olive" />}
//               {paymentFailed ? "Payment not completed" : ended ? `Order ${order.orderStatus.toLowerCase()}` : awaitingPayment ? "Confirming your payment…" : "Order placed, thank you!"}
//             </h1>
//             <p className="mt-1 text-sm text-ink/80">
//               {paymentFailed
//                 ? "No money was taken. If it was deducted, it is refunded automatically in 5–7 working days."
//                 : awaitingPayment
//                   ? "This page updates by itself. Please don’t close it."
//                   : `Confirmation will be sent by SMS and WhatsApp to ${a.phone}.`}
//             </p>
//           </div>
//         </section>

//         {/* Delivery + order summary */}
//         <section className="grid gap-4 rounded-sm border border-line bg-white p-5 sm:grid-cols-3">
//           <div>
//             <p className="text-[11px] uppercase tracking-widest text-muted">Estimated delivery</p>
//             <p className="mt-1 text-lg font-medium text-olive">{ended || paymentFailed ? "—" : `${fmtDate(from)} – ${fmtDate(to)}`}</p>
//             <p className="mt-3 text-[11px] uppercase tracking-widest text-muted">Order</p>
//             <p className="mt-1 text-sm font-medium">{order.orderNo}</p>
//             <p className="text-xs text-muted">Placed on {fmtDate(placed)}</p>
//           </div>
//           <div>
//             <p className="flex items-center gap-1 text-[11px] uppercase tracking-widest text-muted"><MapPin className="h-3.5 w-3.5" /> Delivering to</p>
//             {isOwner ? (
//               <address className="mt-1 text-sm not-italic leading-relaxed text-ink/80">
//                 <b className="text-ink">{a.name}</b><br />{a.line1}{a.line2 ? `, ${a.line2}` : ""}<br />{a.city}, {a.state} {a.pincode}<br />{a.phone}
//               </address>
//             ) : (
//               <p className="mt-1 text-sm text-ink/80"><b className="text-ink">{a.city}</b>, {a.state}<br /><span className="text-xs text-muted">Log in to see the full address.</span></p>
//             )}
//           </div>
//           <div>
//             <p className="flex items-center gap-1 text-[11px] uppercase tracking-widest text-muted"><CreditCard className="h-3.5 w-3.5" /> Payment</p>
//             <p className="mt-1 text-sm font-medium">{online ? "Paid online (Razorpay)" : "Cash on delivery"}</p>
//             <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs ${order.paymentStatus === "Paid" ? "bg-olive/15 text-olive" : order.paymentStatus === "Failed" ? "bg-red-100 text-red-700" : "bg-gold/20 text-ink"}`}>
//               {online ? order.paymentStatus : "Pay on delivery"}
//             </span>
//             <p className="mt-3 text-[11px] uppercase tracking-widest text-muted">Order total</p>
//             <p className="mt-1 text-xl font-medium text-maroon">{formatINR(order.netAmount)}</p>
//           </div>
//         </section>

//         {/* Live status */}
//         {!ended && !paymentFailed && (
//           <section className="rounded-sm border border-line bg-white p-5">
//             <div className="flex items-center justify-between">
//               <h2 className="text-xl">Order status</h2>
//               {!done && <span className="flex items-center gap-1.5 text-xs text-olive"><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-olive opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-olive" /></span>Live</span>}
//             </div>
//             <ol className="mt-5 grid gap-4 sm:grid-cols-6 sm:gap-2">
//               {STEPS.map((s, i) => {
//                 const reached = i <= current;
//                 const Icon = s.icon;
//                 return (
//                   <li key={s.status} className="flex items-center gap-3 sm:flex-col sm:text-center">
//                     <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${reached ? "border-olive bg-olive text-white" : "border-line bg-ivory text-muted"} ${i === current && !done ? "ring-4 ring-olive/20" : ""}`}><Icon className="h-5 w-5" /></span>
//                     <span>
//                       <span className={`block text-xs font-medium ${reached ? "text-ink" : "text-muted"}`}>{s.label}</span>
//                       <span className="block text-[11px] text-muted">{reached ? when(s.status) : ""}</span>
//                     </span>
//                   </li>
//                 );
//               })}
//             </ol>
//             {order.awbNo && <p className="mt-4 text-xs text-muted">Tracking no. <b className="text-ink">{order.awbNo}</b></p>}
//           </section>
//         )}

//         {/* Items + price details */}
//         <section className="grid gap-4 md:grid-cols-[1fr_320px]">
//           <div className="rounded-sm border border-line bg-white p-5">
//             <h2 className="text-xl">Items in this order</h2>
//             <ul className="mt-3 divide-y divide-line">
//               {order.items.map((it) => (
//                 <li key={it.sku} className="flex gap-4 py-3">
//                   <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-sm bg-ivory">
//                     {it.image ? <Image src={it.image} alt={it.name ?? it.sku} fill unoptimized={isRemoteImageSource(it.image)} sizes="80px" className="object-cover" /> : <ComingSoonImage className="absolute inset-0" />}
//                   </div>
//                   <div className="flex-1 text-sm">
//                     <p className="font-medium text-ink">{it.name ?? it.sku}</p>
//                     <p className="mt-0.5 text-xs text-muted">SKU {it.sku} · Qty {it.qty}</p>
//                     <p className="mt-2 font-medium text-maroon">{formatINR(it.amount)}</p>
//                   </div>
//                 </li>
//               ))}
//             </ul>
//           </div>
//           <div className="h-fit rounded-sm border border-line bg-white p-5 text-sm">
//             <h2 className="text-xl">Price details</h2>
//             <dl className="mt-3 space-y-2">
//               <div className="flex justify-between"><dt className="text-muted">Items</dt><dd>{formatINR(order.subTotal)}</dd></div>
//               {order.discountTotal > 0 && <div className="flex justify-between"><dt className="text-muted">Discount{order.couponCode ? ` (${order.couponCode})` : ""}</dt><dd className="text-olive">− {formatINR(order.discountTotal)}</dd></div>}
//               <div className="flex justify-between"><dt className="text-muted">Shipping</dt><dd>{order.shippingCharge ? formatINR(order.shippingCharge) : "Free"}</dd></div>
//               <div className="flex justify-between border-t border-line pt-2 text-base font-medium"><dt>Total</dt><dd className="text-maroon">{formatINR(order.netAmount)}</dd></div>
//               <p className="text-[11px] text-muted">Inclusive of GST {formatINR(order.gstTotal)}</p>
//             </dl>
//           </div>
//         </section>

//         {/* Cancel / refund policy */}
//         <section className="rounded-sm border border-line bg-white p-5 text-sm">
//           <h2 className="text-xl">Cancellation, returns &amp; refunds</h2>
//           <ul className="mt-3 grid gap-3 text-ink/80 sm:grid-cols-3">
//             <li><b className="block text-ink">Cancel</b>Free before dispatch. Call 099163 11500 or write to hello@wovenessence.in.</li>
//             <li><b className="block text-ink">Exchange / return</b>Within 7 days of delivery, unused with tags. Blouse-stitched sarees are not returnable.</li>
//             <li><b className="block text-ink">Refund</b>{online ? "To your original payment method" : "By bank transfer or UPI"} within 5–7 working days after approval.</li>
//           </ul>
//           <p className="mt-3 text-xs"><Link href="/pages/returns" className="text-maroon underline">Full returns &amp; refund policy</Link> · <Link href="/pages/shipping-policy" className="text-maroon underline">Shipping policy</Link></p>
//         </section>

//         <div className="flex flex-wrap justify-center gap-3 pt-2">
//           <Link href={trackHref} className={buttonClass("outline")}>Track order</Link>
//           <Link href="/contact" className={buttonClass("outline")}>Need help?</Link>
//           <Link href="/" className={buttonClass("primary")}>Continue shopping</Link>
//         </div>
//       </div>
//     </div>
//   );
// }


///////////////////////////////////////////////////////////////////////////////////////


// ============================================================================
// PAGE      : Payment Successful / Order Placed (checkout success)
// FILE PATH : src/app/(storefront)/checkout/success/[orderNo]/page.tsx
// ROUTE     : /checkout/success/:orderNo
// HOW TO USE: Replace the full contents of the existing file with this code.
// CHANGES   : UI only (green check hero, confirmation banner, order summary
//             card, Eazore Pay payment details, View Your Orders / Continue
//             Shopping buttons). Order lookup, owner check, AutoRefresh and
//             the pending / failed / cancelled states are unchanged.
// NOTE      : Set the gateway display name via GATEWAY_NAME near the top.
//             Transaction ID row appears only if the order object carries
//             paymentTransactionId (see mapOrder in src/lib/erp-mapping.ts).
// ============================================================================
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, Check, ChevronDown, Clock, Lock, MapPin, Package, PackageCheck, ShieldCheck, Truck, X, Home } from "lucide-react";
import { getCustomerSession } from "@/lib/auth";
import { getOrders } from "@/repositories";
import { formatINR, isRemoteImageSource } from "@/lib/utils";
import { AutoRefresh } from "@/components/ui/auto-refresh";
import { ComingSoonImage } from "@/components/ui/coming-soon-image";
import type { OrderStatus } from "@/domain/types";

export const metadata: Metadata = { title: "Order placed", robots: { index: false } };
export const dynamic = "force-dynamic";

const GATEWAY_NAME = "Eazore Pay"; // display label only

const STEPS: { status: OrderStatus; label: string; icon: typeof Package }[] = [
  { status: "Placed", label: "Order placed", icon: BadgeCheck },
  { status: "Confirmed", label: "Confirmed", icon: ShieldCheck },
  { status: "Packed", label: "Packed", icon: Package },
  { status: "Shipped", label: "Shipped", icon: Truck },
  { status: "Out for delivery", label: "Out for delivery", icon: PackageCheck },
  { status: "Delivered", label: "Delivered", icon: Home },
];

const fmtDate = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const fmtTime = (iso?: string) => (iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "");
const fmtDateTime = (d: Date) =>
  d
    .toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" })
    .replace(/\b(am|pm)\b/, (m) => m.toUpperCase());

/* Row used inside the summary card */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 text-sm">
      <dt className="font-medium text-[#1f2937]">{label}</dt>
      <dd className="text-right text-[#1f2937]">{children}</dd>
    </div>
  );
}

/* Collapsible block (pure HTML <details>, no client JS) */
function Collapsible({ title, defaultOpen, children, lead }: { title: string; defaultOpen?: boolean; children: React.ReactNode; lead?: React.ReactNode }) {
  return (
    <details open={defaultOpen} className="group mt-4 rounded-xl border border-[#e3e6e6] bg-white">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        {lead}
        <span className="flex-1 text-sm font-semibold text-[#111827]">{title}</span>
        <ChevronDown className="h-4 w-4 text-[#6b7280] transition-transform group-open:rotate-180" />
      </summary>
      <div className="px-4 pb-4">{children}</div>
    </details>
  );
}

/* Confetti dots around the hero icon (decorative) */
const DOTS = [
  "left-[8%] top-[34%] h-1.5 w-1.5 bg-[#2563eb]",
  "left-[22%] top-[10%] h-1.5 w-1.5 bg-[#f59e0b]",
  "left-[26%] top-[72%] h-1.5 w-1.5 bg-[#16a34a]",
  "right-[24%] top-[18%] h-1.5 w-1.5 bg-[#84cc16]",
  "right-[8%] top-[34%] h-1.5 w-1.5 bg-[#fbbf24]",
  "right-[22%] top-[66%] h-1.5 w-1.5 bg-[#2563eb]",
  "right-[30%] top-[2%] h-1 w-1 bg-[#16a34a]",
];

export default async function Success({ params }: { params: Promise<{ orderNo: string }> }) {
  const order = await getOrders().getByOrderNo((await params).orderNo);
  if (!order) notFound();

  const session = await getCustomerSession();
  const isOwner = session?.sub === order.customerId; // full address only for the logged-in owner
  const a = order.shippingAddress;
  const online = order.paymentMode !== "COD";
  const awaitingPayment = online && order.paymentStatus === "Pending";
  const paymentFailed = online && order.paymentStatus === "Failed";
  const ended = order.orderStatus === "Cancelled" || order.orderStatus === "Returned";
  const paidOnline = online && order.paymentStatus === "Paid";
  const done = order.orderStatus === "Delivered" || ended || paymentFailed;

  const placed = order.createdAt ? new Date(order.createdAt) : new Date();
  const local = (a.state ?? "").toLowerCase() === "karnataka";
  const from = new Date(placed); from.setDate(from.getDate() + (local ? 4 : 6));
  const to = new Date(placed); to.setDate(to.getDate() + (local ? 6 : 10));

  const current = STEPS.findIndex((s) => s.status === order.orderStatus);
  const when = (s: OrderStatus) => fmtTime([...(order.statusHistory ?? [])].reverse().find((h) => h.status === s)?.at ?? (s === "Placed" ? order.createdAt : undefined));
  const trackHref = `/track-order?orderNo=${encodeURIComponent(order.orderNo)}&phone=${encodeURIComponent(a.phone ?? "")}`;

  // Display-only values
  const bad = paymentFailed || ended;
  const modeLabel = order.paymentMode === "RAZORPAY" ? "Online" : order.paymentMode;
  const methodText = online ? `${GATEWAY_NAME} (${modeLabel})` : "Cash on delivery";
  const txnId = (order as typeof order & { paymentTransactionId?: string }).paymentTransactionId; // shown only if the repository returns it
  const statusText = online ? order.paymentStatus : "Pay on delivery";
  const pillClass =
    order.paymentStatus === "Paid" ? "bg-[#e3f4e8] text-[#0b7a3b]" : order.paymentStatus === "Failed" ? "bg-[#fde8e8] text-[#b42318]" : "bg-[#fff3d6] text-[#8a5a00]";

  const title = paymentFailed ? "Payment not completed" : ended ? `Order ${order.orderStatus.toLowerCase()}` : awaitingPayment ? "Confirming your payment…" : paidOnline ? "Payment Successful!" : "Order placed, thank you!";
  const subtitle = paymentFailed
    ? "No money was taken. If it was deducted, it is refunded automatically in 5–7 working days."
    : ended
      ? "This order is no longer active."
      : awaitingPayment
        ? "This page updates by itself. Please don’t close it."
        : paidOnline
          ? `Your payment has been completed successfully via ${GATEWAY_NAME}.`
          : "You will pay in cash when your order is delivered.";

  return (
    <div className="bg-white font-body text-[#111827]">
      {!done && <AutoRefresh seconds={awaitingPayment ? 5 : 20} />}
      <div className="mx-auto max-w-[600px] px-4 pb-10 pt-8 sm:px-6">
        {/* Hero */}
        <div className="relative mx-auto h-32 w-full max-w-[280px]">
          {!bad && !awaitingPayment && DOTS.map((d, i) => <span key={i} className={`absolute rounded-full ${d}`} />)}
          <span
            className={`absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-white shadow-[0_6px_18px_rgba(22,163,74,0.25)] ${
              bad ? "bg-[#dc2626] shadow-[0_6px_18px_rgba(220,38,38,0.25)]" : awaitingPayment ? "bg-[#f59e0b] shadow-[0_6px_18px_rgba(245,158,11,0.3)]" : "bg-[#16a34a]"
            }`}
          >
            {bad ? <X className="h-12 w-12" strokeWidth={3.5} /> : awaitingPayment ? <Clock className="h-11 w-11" strokeWidth={2.5} /> : <Check className="h-12 w-12" strokeWidth={4} />}
          </span>
        </div>

        <h1 className="mt-2 text-center font-body text-[32px] font-extrabold leading-tight tracking-tight text-[#161d2b]">{title}</h1>
        <p className="mx-auto mt-3 max-w-sm text-center text-base leading-relaxed text-[#4b5563]">{subtitle}</p>

        {/* Confirmation banner */}
        {!bad && (
          <div className="mt-6 flex items-center gap-4 rounded-lg border border-[#cfe8d7] bg-[#e8f5ec] px-4 py-4">
            <Lock className="h-6 w-6 shrink-0 text-[#16a34a]" />
            <p className="text-sm leading-relaxed text-[#1f3a2a]">
              {awaitingPayment ? "Your order is placed. We are waiting for the payment confirmation." : `Your order has been confirmed. Confirmation will be sent by SMS and WhatsApp to ${a.phone}.`}
            </p>
          </div>
        )}

        {/* Order summary card */}
        <section className="mt-5 rounded-xl border border-[#e3e6e6] bg-white p-4 shadow-[0_1px_3px_rgba(15,17,17,0.06)]">
          <p className="text-[15px] font-bold text-[#111827]">Order # {order.orderNo}</p>
          <p className="text-sm text-[#6b7280]">Placed on {fmtDate(placed)}</p>

          <ul className="mt-4 divide-y divide-[#eef0f1]">
            {order.items.map((it) => (
              <li key={it.sku} className="flex items-start gap-4 py-3 first:pt-0">
                <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-lg border border-[#e5e7eb] bg-[#f6f7f8]">
                  {it.image ? <Image src={it.image} alt={it.name ?? it.sku} fill unoptimized={isRemoteImageSource(it.image)} sizes="72px" className="object-cover" /> : <ComingSoonImage compact className="absolute inset-0" />}
                </div>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-medium text-[#111827]">{it.name ?? it.sku}</p>
                  <p className="mt-1 text-xs text-[#6b7280]">SKU {it.sku}</p>
                  <p className="mt-1 text-xs text-[#6b7280]">Qty: {it.qty}</p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-[#111827]">{formatINR(it.amount)}</p>
              </li>
            ))}
          </ul>

          <dl className="mt-3 border-t border-[#e5e7eb] pt-3">
            <Row label="Order Total">{formatINR(order.netAmount)}</Row>
            <Row label="Payment Method">{methodText}</Row>
            {online && txnId && <Row label="Transaction ID">{txnId}</Row>}
            <Row label="Payment Status">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-medium ${pillClass}`}>
                {order.paymentStatus === "Paid" && online && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                {statusText}
              </span>
            </Row>
            {online && <Row label="Payment Date & Time">{fmtDateTime(placed)}</Row>}
          </dl>

          {/* Gateway details */}
          {online && (
            <details open className="group mt-3 rounded-lg border border-[#e3e6e6]">
              <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                <span className="text-xl font-extrabold tracking-tight text-[#2f3bd8]">
                  eazore<span className="font-medium text-[#6b7280]">pay</span>
                </span>
                <span className="h-5 w-px bg-[#e5e7eb]" />
                <span className="flex-1 text-sm font-semibold text-[#111827]">Payment Details</span>
                <ChevronDown className="h-4 w-4 text-[#6b7280] transition-transform group-open:rotate-180" />
              </summary>
              <dl className="grid grid-cols-2 gap-y-2.5 px-4 pb-4 text-xs">
                <dt className="text-[#6b7280]">Payment Gateway</dt><dd className="text-[#374151]">{GATEWAY_NAME}</dd>
                <dt className="text-[#6b7280]">Mode</dt><dd className="text-[#374151]">{modeLabel}</dd>
                <dt className="text-[#6b7280]">Reference No.</dt><dd className="break-all text-[#374151]">{txnId ?? order.orderNo}</dd>
                <dt className="text-[#6b7280]">Amount Paid</dt><dd className="text-[#374151]">{order.paymentStatus === "Paid" ? formatINR(order.netAmount) : "—"}</dd>
              </dl>
            </details>
          )}
        </section>

        {/* Delivery & live tracking */}
        <Collapsible title="Delivery & tracking" lead={<Truck className="h-4 w-4 text-[#6b7280]" />}>
          <div className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6b7280]">Estimated delivery</p>
              <p className="mt-1 font-medium text-[#0b7a3b]">{ended || paymentFailed ? "—" : `${fmtDate(from)} – ${fmtDate(to)}`}</p>
            </div>
            <div>
              <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-[#6b7280]"><MapPin className="h-3.5 w-3.5" /> Delivering to</p>
              {isOwner ? (
                <address className="mt-1 not-italic leading-relaxed text-[#374151]">
                  <b className="text-[#111827]">{a.name}</b><br />{a.line1}{a.line2 ? `, ${a.line2}` : ""}<br />{a.city}, {a.state} {a.pincode}<br />{a.phone}
                </address>
              ) : (
                <p className="mt-1 text-[#374151]"><b className="text-[#111827]">{a.city}</b>, {a.state}<br /><span className="text-xs text-[#6b7280]">Log in to see the full address.</span></p>
              )}
            </div>
          </div>

          {!ended && !paymentFailed && (
            <div className="mt-5 border-t border-[#eef0f1] pt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-[#111827]">Order status</p>
                {!done && <span className="flex items-center gap-1.5 text-xs text-[#0b7a3b]"><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#16a34a] opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-[#16a34a]" /></span>Live</span>}
              </div>
              <ol className="mt-4 grid gap-4 sm:grid-cols-6 sm:gap-2">
                {STEPS.map((s, i) => {
                  const reached = i <= current;
                  const Icon = s.icon;
                  return (
                    <li key={s.status} className="flex items-center gap-3 sm:flex-col sm:text-center">
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${reached ? "border-[#16a34a] bg-[#16a34a] text-white" : "border-[#e5e7eb] bg-[#f6f7f8] text-[#9ca3af]"} ${i === current && !done ? "ring-4 ring-[#16a34a]/20" : ""}`}><Icon className="h-4 w-4" /></span>
                      <span>
                        <span className={`block text-xs font-medium ${reached ? "text-[#111827]" : "text-[#9ca3af]"}`}>{s.label}</span>
                        <span className="block text-[11px] text-[#6b7280]">{reached ? when(s.status) : ""}</span>
                      </span>
                    </li>
                  );
                })}
              </ol>
              {order.awbNo && <p className="mt-4 text-xs text-[#6b7280]">Tracking no. <b className="text-[#111827]">{order.awbNo}</b></p>}
            </div>
          )}
        </Collapsible>

        {/* Price breakdown */}
        <Collapsible title="Price details">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-[#6b7280]">Items</dt><dd>{formatINR(order.subTotal)}</dd></div>
            {order.discountTotal > 0 && <div className="flex justify-between"><dt className="text-[#6b7280]">Discount{order.couponCode ? ` (${order.couponCode})` : ""}</dt><dd className="text-[#0b7a3b]">− {formatINR(order.discountTotal)}</dd></div>}
            <div className="flex justify-between"><dt className="text-[#6b7280]">Shipping</dt><dd>{order.shippingCharge ? formatINR(order.shippingCharge) : "Free"}</dd></div>
            <div className="flex justify-between border-t border-[#e5e7eb] pt-2 text-base font-semibold"><dt>Total</dt><dd>{formatINR(order.netAmount)}</dd></div>
            <p className="text-[11px] text-[#6b7280]">Inclusive of GST {formatINR(order.gstTotal)}</p>
          </dl>
        </Collapsible>

        {/* Cancel / refund policy */}
        <Collapsible title="Cancellation, returns & refunds">
          <ul className="grid gap-3 text-sm text-[#374151]">
            <li><b className="block text-[#111827]">Cancel</b>Free before dispatch. Call 099163 11500 or write to hello@wovenessence.in.</li>
            <li><b className="block text-[#111827]">Exchange / return</b>Within 7 days of delivery, unused with tags. Blouse-stitched sarees are not returnable.</li>
            <li><b className="block text-[#111827]">Refund</b>{online ? "To your original payment method" : "By bank transfer or UPI"} within 5–7 working days after approval.</li>
          </ul>
          <p className="mt-3 text-xs"><Link href="/pages/returns" className="text-[#1d4ed8] underline">Full returns & refund policy</Link> · <Link href="/pages/shipping-policy" className="text-[#1d4ed8] underline">Shipping policy</Link></p>
        </Collapsible>

        {/* Actions */}
        <div className="mt-5 space-y-3 rounded-xl border border-[#e3e6e6] bg-white p-3">
          <Link href="/account/orders" className="flex h-12 w-full items-center justify-center rounded-lg bg-[#232f3e] text-[15px] font-semibold text-white transition-colors hover:bg-[#1a2432]">
            View Your Orders
          </Link>
          <Link href="/" className="flex h-12 w-full items-center justify-center rounded-lg border border-[#232f3e]/60 bg-white text-[15px] font-semibold text-[#111827] transition-colors hover:bg-[#f7f8f8]">
            Continue Shopping
          </Link>
        </div>
        <p className="mt-4 text-center text-xs text-[#6b7280]">
          <Link href={trackHref} className="underline">Track order</Link> · <Link href="/contact" className="underline">Need help?</Link>
        </p>
      </div>
    </div>
  );
}
