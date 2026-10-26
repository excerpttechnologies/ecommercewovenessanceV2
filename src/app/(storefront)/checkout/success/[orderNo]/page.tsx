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






import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, Clock, CreditCard, MapPin, Package, PackageCheck, ShieldCheck, Truck, XCircle, Home } from "lucide-react";
import { getCustomerSession } from "@/lib/auth";
import { getOrders } from "@/repositories";
import { formatINR, isRemoteImageSource } from "@/lib/utils";
import { buttonClass } from "@/components/ui/button";
import { AutoRefresh } from "@/components/ui/auto-refresh";
import { ComingSoonImage } from "@/components/ui/coming-soon-image";
import type { OrderStatus } from "@/domain/types";

export const metadata: Metadata = { title: "Order placed", robots: { index: false } };
export const dynamic = "force-dynamic";

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

// [CHG-11] REPLACED FUNCTION: Success (server page). WHY: Amazon-style order page - confirmation banner, estimated delivery,
// address (full only for the logged-in owner), payment status, LIVE status tracker (AutoRefresh), items, price details and
// cancel/return/refund policy. States: awaitingPayment (online + Pending), paymentFailed, ended (Cancelled/Returned).
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
  const done = order.orderStatus === "Delivered" || ended || paymentFailed;

  const placed = order.createdAt ? new Date(order.createdAt) : new Date();
  const local = (a.state ?? "").toLowerCase() === "karnataka";
  const from = new Date(placed); from.setDate(from.getDate() + (local ? 4 : 6));
  const to = new Date(placed); to.setDate(to.getDate() + (local ? 6 : 10));

  const current = STEPS.findIndex((s) => s.status === order.orderStatus);
  const when = (s: OrderStatus) => fmtTime([...(order.statusHistory ?? [])].reverse().find((h) => h.status === s)?.at ?? (s === "Placed" ? order.createdAt : undefined));
  const trackHref = `/track-order?orderNo=${encodeURIComponent(order.orderNo)}&phone=${encodeURIComponent(a.phone ?? "")}`;

  return (
    <div className="bg-ivory">
      {!done && <AutoRefresh seconds={awaitingPayment ? 5 : 20} />}
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-8 sm:px-6">
        {/* Confirmation banner */}
        <section className={`flex items-center gap-4 rounded-sm border p-5 ${paymentFailed || ended ? "border-red-200 bg-red-50" : awaitingPayment ? "border-gold/50 bg-gold/10" : "border-olive/30 bg-olive/10"}`}>
          <Image src="/logo1.png" alt="Woven Essence" width={56} height={56} className="hidden h-14 w-auto sm:block" />
          <div className="flex-1">
            <h1 className="flex items-center gap-2 text-2xl text-ink sm:text-3xl">
              {paymentFailed || ended ? <XCircle className="h-7 w-7 text-red-700" /> : awaitingPayment ? <Clock className="h-7 w-7 text-gold" /> : <BadgeCheck className="h-7 w-7 text-olive" />}
              {paymentFailed ? "Payment not completed" : ended ? `Order ${order.orderStatus.toLowerCase()}` : awaitingPayment ? "Confirming your payment…" : "Order placed, thank you!"}
            </h1>
            <p className="mt-1 text-sm text-ink/80">
              {paymentFailed
                ? "No money was taken. If it was deducted, it is refunded automatically in 5–7 working days."
                : awaitingPayment
                  ? "This page updates by itself. Please don’t close it."
                  : `Confirmation will be sent by SMS and WhatsApp to ${a.phone}.`}
            </p>
          </div>
        </section>

        {/* Delivery + order summary */}
        <section className="grid gap-4 rounded-sm border border-line bg-white p-5 sm:grid-cols-3">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-muted">Estimated delivery</p>
            <p className="mt-1 text-lg font-medium text-olive">{ended || paymentFailed ? "—" : `${fmtDate(from)} – ${fmtDate(to)}`}</p>
            <p className="mt-3 text-[11px] uppercase tracking-widest text-muted">Order</p>
            <p className="mt-1 text-sm font-medium">{order.orderNo}</p>
            <p className="text-xs text-muted">Placed on {fmtDate(placed)}</p>
          </div>
          <div>
            <p className="flex items-center gap-1 text-[11px] uppercase tracking-widest text-muted"><MapPin className="h-3.5 w-3.5" /> Delivering to</p>
            {isOwner ? (
              <address className="mt-1 text-sm not-italic leading-relaxed text-ink/80">
                <b className="text-ink">{a.name}</b><br />{a.line1}{a.line2 ? `, ${a.line2}` : ""}<br />{a.city}, {a.state} {a.pincode}<br />{a.phone}
              </address>
            ) : (
              <p className="mt-1 text-sm text-ink/80"><b className="text-ink">{a.city}</b>, {a.state}<br /><span className="text-xs text-muted">Log in to see the full address.</span></p>
            )}
          </div>
          <div>
            <p className="flex items-center gap-1 text-[11px] uppercase tracking-widest text-muted"><CreditCard className="h-3.5 w-3.5" /> Payment</p>
            <p className="mt-1 text-sm font-medium">{online ? "Paid online (Razorpay)" : "Cash on delivery"}</p>
            <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs ${order.paymentStatus === "Paid" ? "bg-olive/15 text-olive" : order.paymentStatus === "Failed" ? "bg-red-100 text-red-700" : "bg-gold/20 text-ink"}`}>
              {online ? order.paymentStatus : "Pay on delivery"}
            </span>
            <p className="mt-3 text-[11px] uppercase tracking-widest text-muted">Order total</p>
            <p className="mt-1 text-xl font-medium text-maroon">{formatINR(order.netAmount)}</p>
          </div>
        </section>

        {/* Live status */}
        {!ended && !paymentFailed && (
          <section className="rounded-sm border border-line bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl">Order status</h2>
              {!done && <span className="flex items-center gap-1.5 text-xs text-olive"><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-olive opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-olive" /></span>Live</span>}
            </div>
            <ol className="mt-5 grid gap-4 sm:grid-cols-6 sm:gap-2">
              {STEPS.map((s, i) => {
                const reached = i <= current;
                const Icon = s.icon;
                return (
                  <li key={s.status} className="flex items-center gap-3 sm:flex-col sm:text-center">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${reached ? "border-olive bg-olive text-white" : "border-line bg-ivory text-muted"} ${i === current && !done ? "ring-4 ring-olive/20" : ""}`}><Icon className="h-5 w-5" /></span>
                    <span>
                      <span className={`block text-xs font-medium ${reached ? "text-ink" : "text-muted"}`}>{s.label}</span>
                      <span className="block text-[11px] text-muted">{reached ? when(s.status) : ""}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
            {order.awbNo && <p className="mt-4 text-xs text-muted">Tracking no. <b className="text-ink">{order.awbNo}</b></p>}
          </section>
        )}

        {/* Items + price details */}
        <section className="grid gap-4 md:grid-cols-[1fr_320px]">
          <div className="rounded-sm border border-line bg-white p-5">
            <h2 className="text-xl">Items in this order</h2>
            <ul className="mt-3 divide-y divide-line">
              {order.items.map((it) => (
                <li key={it.sku} className="flex gap-4 py-3">
                  <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-sm bg-ivory">
                    {it.image ? <Image src={it.image} alt={it.name ?? it.sku} fill unoptimized={isRemoteImageSource(it.image)} sizes="80px" className="object-cover" /> : <ComingSoonImage className="absolute inset-0" />}
                  </div>
                  <div className="flex-1 text-sm">
                    <p className="font-medium text-ink">{it.name ?? it.sku}</p>
                    <p className="mt-0.5 text-xs text-muted">SKU {it.sku} · Qty {it.qty}</p>
                    <p className="mt-2 font-medium text-maroon">{formatINR(it.amount)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="h-fit rounded-sm border border-line bg-white p-5 text-sm">
            <h2 className="text-xl">Price details</h2>
            <dl className="mt-3 space-y-2">
              <div className="flex justify-between"><dt className="text-muted">Items</dt><dd>{formatINR(order.subTotal)}</dd></div>
              {order.discountTotal > 0 && <div className="flex justify-between"><dt className="text-muted">Discount{order.couponCode ? ` (${order.couponCode})` : ""}</dt><dd className="text-olive">− {formatINR(order.discountTotal)}</dd></div>}
              <div className="flex justify-between"><dt className="text-muted">Shipping</dt><dd>{order.shippingCharge ? formatINR(order.shippingCharge) : "Free"}</dd></div>
              <div className="flex justify-between border-t border-line pt-2 text-base font-medium"><dt>Total</dt><dd className="text-maroon">{formatINR(order.netAmount)}</dd></div>
              <p className="text-[11px] text-muted">Inclusive of GST {formatINR(order.gstTotal)}</p>
            </dl>
          </div>
        </section>

        {/* Cancel / refund policy */}
        <section className="rounded-sm border border-line bg-white p-5 text-sm">
          <h2 className="text-xl">Cancellation, returns &amp; refunds</h2>
          <ul className="mt-3 grid gap-3 text-ink/80 sm:grid-cols-3">
            <li><b className="block text-ink">Cancel</b>Free before dispatch. Call 099163 11500 or write to hello@wovenessence.in.</li>
            <li><b className="block text-ink">Exchange / return</b>Within 7 days of delivery, unused with tags. Blouse-stitched sarees are not returnable.</li>
            <li><b className="block text-ink">Refund</b>{online ? "To your original payment method" : "By bank transfer or UPI"} within 5–7 working days after approval.</li>
          </ul>
          <p className="mt-3 text-xs"><Link href="/pages/returns" className="text-maroon underline">Full returns &amp; refund policy</Link> · <Link href="/pages/shipping-policy" className="text-maroon underline">Shipping policy</Link></p>
        </section>

        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Link href={trackHref} className={buttonClass("outline")}>Track order</Link>
          <Link href="/contact" className={buttonClass("outline")}>Need help?</Link>
          <Link href="/" className={buttonClass("primary")}>Continue shopping</Link>
        </div>
      </div>
    </div>
  );
}
