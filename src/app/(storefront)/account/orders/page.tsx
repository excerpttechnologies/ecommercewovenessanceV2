// import Link from "next/link";
// import { getCustomerSession } from "@/lib/auth";
// import { formatINR } from "@/lib/utils";
// import { getOrders } from "@/repositories";
// import { Badge } from "@/components/ui/badge";
// import { Empty } from "@/components/ui/empty";
// import { orderTone } from "@/components/account/order-status";

// export const metadata = { title: "My orders", robots: { index: false } };

// export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
//   const s = (await getCustomerSession())!;
//   const page = Number((await searchParams).page ?? 1);
//   const r = await getOrders().listByCustomer(s.sub, { page, limit: 10 });
//   if (!r.items.length) return <Empty title="No orders yet" href="/collections/sarees" cta="Start shopping" />;
//   return (
//     <div>
//       <ul className="divide-y divide-line rounded-sm border border-line bg-white/60">
//         {r.items.map((o) => (
//           <li key={o.id}>
//             <Link href={`/account/orders/${o.orderNo}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-olive/5">
//               <span><span className="block text-sm font-medium">{o.orderNo}</span><span className="text-xs text-muted">{o.createdAt ? new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : ""} · {o.items.length} item(s) · {o.paymentMode}</span></span>
//               <span className="flex items-center gap-3"><Badge tone={orderTone(o.orderStatus)}>{o.orderStatus}</Badge><span className="text-sm">{formatINR(o.netAmount)}</span></span>
//             </Link>
//           </li>
//         ))}
//       </ul>
//       {r.pages > 1 && <div className="mt-4 flex gap-2 text-xs">{page > 1 && <Link href={`?page=${page - 1}`} className="rounded-sm border border-line px-3 py-1.5">Previous</Link>}{page < r.pages && <Link href={`?page=${page + 1}`} className="rounded-sm border border-line px-3 py-1.5">Next</Link>}</div>}
//     </div>
//   );
// }


///////////////////////////////////////////////////////////////////////////////////////////////////////



// ============================================================================
// PAGE      : My Orders (customer order list)
// FILE PATH : src/app/(storefront)/account/orders/page.tsx
// ROUTE     : /account/orders
// HOW TO USE: Replace the full contents of the existing file with this code.
// CHANGES   : UI only (Amazon-style order cards, tabs, search + filter bar,
//             status / payment pills, "View Details" button).
//             Data fetching, session check, pagination and Empty state unchanged.
// NOTE      : Tabs, search box and Filter button are visual only (no logic).
// ============================================================================
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, ChevronRight, Clock, ListFilter, Package, Search, Truck, XCircle } from "lucide-react";
import { getCustomerSession } from "@/lib/auth";
import { formatINR, isRemoteImageSource } from "@/lib/utils";
import { getOrders } from "@/repositories";
import { Empty } from "@/components/ui/empty";
import { ComingSoonImage } from "@/components/ui/coming-soon-image";
import type { Order, OrderStatus } from "@/domain/types";

export const metadata = { title: "My orders", robots: { index: false } };

/* ---------- UI helpers (display only) ---------- */
const TABS = ["All", "Not Yet Shipped", "Shipped", "Delivered", "Cancelled"];

const TONES = {
  green: "bg-[#e3f4e8] text-[#0b7a3b]",
  amber: "bg-[#fff3d6] text-[#8a5a00]",
  gray: "bg-[#eceef0] text-[#4b5563]",
  red: "bg-[#fde8e8] text-[#b42318]",
};

const fmtDate = (d?: string | Date) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";

const statusDate = (o: Order, s: OrderStatus) => [...(o.statusHistory ?? [])].reverse().find((h) => h.status === s)?.at;

const expectedBy = (o: Order) => {
  const d = new Date(o.createdAt ?? Date.now());
  const local = (o.shippingAddress?.state ?? "").toLowerCase() === "karnataka";
  d.setDate(d.getDate() + (local ? 6 : 10));
  return d;
};

function Pill({ tone, icon: Icon, children }: { tone: keyof typeof TONES; icon: typeof Clock; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-medium ${TONES[tone]}`}>
      <Icon className="h-4 w-4" />
      {children}
    </span>
  );
}

function orderState(o: Order) {
  switch (o.orderStatus) {
    case "Delivered":
      return { tone: "green" as const, icon: CheckCircle2, sub: "Delivered on", date: fmtDate(statusDate(o, "Delivered")) };
    case "Shipped":
    case "Out for delivery":
      return { tone: "green" as const, icon: Truck, sub: "Expected Delivery", date: fmtDate(expectedBy(o)) };
    case "Cancelled":
      return { tone: "gray" as const, icon: XCircle, sub: "Cancelled on", date: fmtDate(statusDate(o, "Cancelled")) };
    case "Returned":
      return { tone: "gray" as const, icon: XCircle, sub: "Returned on", date: fmtDate(statusDate(o, "Returned")) };
    default:
      return { tone: "amber" as const, icon: Package, sub: "Expected Delivery", date: fmtDate(expectedBy(o)) };
  }
}

function paymentState(o: Order) {
  if (o.paymentStatus === "Paid") return { tone: "green" as const, icon: CheckCircle2, text: "Paid" };
  if (o.paymentStatus === "Refunded") return { tone: "gray" as const, icon: XCircle, text: "Refunded" };
  if (o.paymentStatus === "Failed") return { tone: "red" as const, icon: XCircle, text: "Failed" };
  return { tone: "amber" as const, icon: Clock, text: o.paymentMode === "COD" ? "Pay on delivery" : "Pending" };
}

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const s = (await getCustomerSession())!;
  const page = Number((await searchParams).page ?? 1);
  const r = await getOrders().listByCustomer(s.sub, { page, limit: 10 });
  if (!r.items.length) return <Empty title="No orders yet" href="/collections/sarees" cta="Start shopping" />;
  return (
    <div className="mx-auto w-full max-w-2xl font-body text-[#111827]">
      <h2 className="font-body text-[28px] font-bold leading-tight text-[#111827]">Your Orders</h2>

      {/* Tabs */}
      <div role="tablist" className="mt-4 flex gap-6 overflow-x-auto border-b border-[#e5e7eb]">
        {TABS.map((t, i) => (
          <span
            key={t}
            role="tab"
            aria-selected={i === 0}
            className={`-mb-px whitespace-nowrap border-b-[3px] pb-3 text-[15px] ${i === 0 ? "border-[#f59e0b] font-semibold text-[#111827]" : "border-transparent text-[#4b5563]"}`}
          >
            {t}
          </span>
        ))}
      </div>

      {/* Search + filter */}
      <div className="mt-4 flex items-center gap-3">
        <label className="flex h-12 flex-1 items-center gap-3 rounded-lg border border-[#d5d9d9] bg-white px-4">
          <Search className="h-5 w-5 shrink-0 text-[#6b7280]" />
          <input type="text" placeholder="Search by product, order ID or date" className="w-full bg-transparent text-sm text-[#111827] outline-none placeholder:text-[#6b7280]" />
        </label>
        <button type="button" className="flex h-12 items-center gap-2 rounded-lg border border-[#d5d9d9] bg-white px-5 text-sm font-semibold text-[#111827]">
          <ListFilter className="h-5 w-5" /> Filter
        </button>
      </div>

      {/* Orders */}
      <ul className="mt-4 space-y-4">
        {r.items.map((o) => {
          const first = o.items[0];
          const more = o.items.length - 1;
          const qty = o.items.reduce((n, it) => n + it.qty, 0);
          const st = orderState(o);
          const pay = paymentState(o);
          return (
            <li key={o.id} className="rounded-xl border border-[#e3e6e6] bg-white p-4 shadow-[0_1px_3px_rgba(15,17,17,0.08)]">
              <div className="flex items-start justify-between gap-3 text-sm">
                <p className="font-semibold text-[#111827]">Order # {o.orderNo}</p>
                <p className="shrink-0 text-xs text-[#6b7280]">{o.createdAt ? `Placed on ${fmtDate(o.createdAt)}` : ""}</p>
              </div>

              <div className="mt-3 flex gap-3">
                <div className="relative h-[76px] w-[76px] shrink-0 overflow-hidden rounded-lg border border-[#e5e7eb] bg-[#f6f7f8]">
                  {first?.image ? (
                    <Image src={first.image} alt={first.name ?? first.sku} fill unoptimized={isRemoteImageSource(first.image)} sizes="76px" className="object-cover" />
                  ) : (
                    <ComingSoonImage compact className="absolute inset-0" />
                  )}
                </div>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="truncate font-medium text-[#111827]">{first ? (first.name ?? first.sku) : "Order"}</p>
                  <p className="mt-0.5 truncate text-xs text-[#6b7280]">
                    {first ? `SKU ${first.sku}` : ""}
                    {more > 0 ? ` | +${more} more item${more > 1 ? "s" : ""}` : ""}
                  </p>
                  <p className="mt-1 text-[15px] font-bold text-[#111827]">{formatINR(o.netAmount)}</p>
                  <p className="mt-0.5 text-xs text-[#6b7280]">Qty: {qty}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2 text-right">
                  <Pill tone={st.tone} icon={st.icon}>{o.orderStatus}</Pill>
                  {st.date && (
                    <p className="text-xs leading-snug text-[#6b7280]">
                      {st.sub}
                      <br />
                      <span className={o.orderStatus === "Delivered" ? "font-medium text-[#111827]" : ""}>{st.date}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#e5e7eb] pt-3">
                <div className="flex items-center gap-3 text-sm">
                  <span className="font-medium text-[#111827]">Payment Status</span>
                  <Pill tone={pay.tone} icon={pay.icon}>{pay.text}</Pill>
                </div>
                <Link
                  href={`/account/orders/${o.orderNo}`}
                  className="inline-flex h-9 items-center gap-1 rounded-md border border-[#d5d9d9] bg-white px-4 text-[13px] font-semibold text-[#111827] shadow-sm transition-colors hover:bg-[#f7f8f8]"
                >
                  View Details <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </li>
          );
        })}
      </ul>

      {r.pages > 1 && (
        <div className="mt-5 flex gap-3 text-sm font-semibold">
          {page > 1 && <Link href={`?page=${page - 1}`} className="rounded-md border border-[#d5d9d9] bg-white px-4 py-2 text-[#111827] hover:bg-[#f7f8f8]">Previous</Link>}
          {page < r.pages && <Link href={`?page=${page + 1}`} className="rounded-md border border-[#d5d9d9] bg-white px-4 py-2 text-[#111827] hover:bg-[#f7f8f8]">Next</Link>}
        </div>
      )}
    </div>
  );
}
