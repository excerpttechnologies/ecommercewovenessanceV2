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
//       <ul className="divide-y divide-line rounded-lg border border-line bg-white/60">
//         {r.items.map((o) => (
//           <li key={o.id}>
//             <Link href={`/account/orders/${o.orderNo}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-maroon/5">
//               <span><span className="block text-sm font-medium">{o.orderNo}</span><span className="text-xs text-muted">{o.createdAt ? new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : ""} · {o.items.length} item(s) · {o.paymentMode}</span></span>
//               <span className="flex items-center gap-3"><Badge tone={orderTone(o.orderStatus)}>{o.orderStatus}</Badge><span className="text-sm">{formatINR(o.netAmount)}</span></span>
//             </Link>
//           </li>
//         ))}
//       </ul>
//       {r.pages > 1 && <div className="mt-4 flex gap-2 text-xs">{page > 1 && <Link href={`?page=${page - 1}`} className="rounded-lg border border-line px-3 py-1.5">Previous</Link>}{page < r.pages && <Link href={`?page=${page + 1}`} className="rounded-lg border border-line px-3 py-1.5">Next</Link>}</div>}
//     </div>
//   );
// }


//////////////////////////////////////////////////////

import Link from "next/link";
import { ChevronLeft, ChevronRight, CreditCard, Package } from "lucide-react";
import { getCustomerSession } from "@/lib/auth";
import { formatINR } from "@/lib/utils";
import { getOrders } from "@/repositories";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { orderTone } from "@/components/account/order-status";
import { AccountCard, AccountCardTitle } from "@/components/account/account-card";

export const metadata = { title: "My orders", robots: { index: false } };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const s = (await getCustomerSession())!;
  const page = Number((await searchParams).page ?? 1);
  const r = await getOrders().listByCustomer(s.sub, { page, limit: 10 });
  if (!r.items.length) {
    return (
      <AccountCard className="px-6 py-14 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-maroon/10 text-maroon"><Package className="h-6 w-6" /></span>
        <h2 className="mt-4 font-display text-xl font-semibold">No orders yet</h2>
        <p className="mt-1 text-sm text-muted">When you place an order, it will show up here.</p>
        <Link href="/collections/sarees" className={buttonClass("primary", "md", "mt-6 rounded-full")}>Start shopping</Link>
      </AccountCard>
    );
  }
  return (
    <AccountCard>
      <AccountCardTitle icon={Package} title="My orders" subtitle={`${r.total} order${r.total === 1 ? "" : "s"}`} />
      <ul className="space-y-2.5">
        {r.items.map((o) => (
          <li key={o.id}>
            <Link href={`/account/orders/${o.orderNo}`} className="group flex flex-wrap items-center gap-3 rounded-xl border border-line/70 px-3.5 py-3.5 transition-colors hover:border-maroon/30 hover:bg-maroon/[0.03] sm:flex-nowrap sm:px-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-maroon/[0.07] text-maroon"><Package className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink">{o.orderNo}</span>
                <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                  <span>{o.createdAt ? new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : ""}</span>
                  <span aria-hidden>·</span>
                  <span>{o.items.length} item{o.items.length === 1 ? "" : "s"}</span>
                  <span aria-hidden>·</span>
                  <span className="inline-flex items-center gap-1"><CreditCard className="h-3 w-3" />{o.paymentMode}</span>
                </span>
              </span>
              <span className="ml-14 flex items-center gap-3 sm:ml-0">
                <Badge tone={orderTone(o.orderStatus)}>{o.orderStatus}</Badge>
                <span className="text-sm font-bold text-ink">{formatINR(o.netAmount)}</span>
              </span>
              <ChevronRight className="hidden h-4 w-4 shrink-0 text-maroon/50 transition-transform group-hover:translate-x-0.5 sm:block" />
            </Link>
          </li>
        ))}
      </ul>
      {r.pages > 1 && (
        <div className="mt-5 flex items-center justify-between gap-2 text-xs">
          {page > 1 ? <Link href={`?page=${page - 1}`} className={buttonClass("outline", "sm", "rounded-full")}><ChevronLeft className="h-3.5 w-3.5" /> Previous</Link> : <span />}
          <span className="text-muted">Page {page} of {r.pages}</span>
          {page < r.pages ? <Link href={`?page=${page + 1}`} className={buttonClass("outline", "sm", "rounded-full")}>Next <ChevronRight className="h-3.5 w-3.5" /></Link> : <span />}
        </div>
      )}
    </AccountCard>
  );
}
