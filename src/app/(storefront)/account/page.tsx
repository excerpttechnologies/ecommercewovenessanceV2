// import Link from "next/link";
// import { getCustomerSession } from "@/lib/auth";
// import { formatINR } from "@/lib/utils";
// import { getCustomers, getOrders } from "@/repositories";
// import { ProfileForm } from "@/components/account/profile-form";

// export const metadata = { title: "My account", robots: { index: false } };

// export default async function AccountHome() {
//   const s = (await getCustomerSession())!;
//   const [customer, orders] = await Promise.all([getCustomers().getById(s.sub), getOrders().listByCustomer(s.sub, { limit: 3 })]);
//   return (
//     <div className="grid gap-8 lg:grid-cols-2">
//       <section className="rounded-lg border border-line bg-white/60 p-5">
//         <h2 className="text-2xl">Profile</h2>
//         <ProfileForm initial={{ name: customer?.name ?? "", email: customer?.email ?? "", gstNumber: customer?.gstNumber ?? "" }} />
//         {customer && customer.loyaltyPoints > 0 && <p className="mt-4 text-xs text-muted">Loyalty points: <b className="text-olive">{customer.loyaltyPoints}</b></p>}
//       </section>
//       <section className="rounded-lg border border-line bg-white/60 p-5">
//         <div className="flex items-center justify-between"><h2 className="text-2xl">Recent orders</h2><Link href="/account/orders" className="text-xs uppercase tracking-wider text-maroon">All orders</Link></div>
//         <ul className="mt-4 divide-y divide-line text-sm">
//           {orders.items.length === 0 && <li className="py-3 text-muted">No orders yet.</li>}
//           {orders.items.map((o) => (
//             <li key={o.id} className="flex items-center justify-between py-3">
//               <Link href={`/account/orders/${o.orderNo}`} className="hover:text-maroon">{o.orderNo}<span className="block text-xs text-muted">{o.createdAt ? new Date(o.createdAt).toLocaleDateString("en-IN") : ""} · {o.items.length} item(s)</span></Link>
//               <span className="text-right"><span className="block">{formatINR(o.netAmount)}</span><span className="text-xs text-olive">{o.orderStatus}</span></span>
//             </li>
//           ))}
//         </ul>
//       </section>
//     </div>
//   );
// }

////////////////////////////////////////////////////////////////////////

import Link from "next/link";
import { ArrowRight, ChevronRight, Gift, MapPin, Package, ShoppingBag, UserRound } from "lucide-react";
import { getCustomerSession } from "@/lib/auth";
import { formatINR } from "@/lib/utils";
import { getCustomers, getOrders } from "@/repositories";
import { ProfileForm } from "@/components/account/profile-form";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { orderTone } from "@/components/account/order-status";
import { AccountCard, AccountCardTitle, accountCard } from "@/components/account/account-card";

export const metadata = { title: "My account", robots: { index: false } };

export default async function AccountHome() {
  const s = (await getCustomerSession())!;
  const [customer, orders] = await Promise.all([getCustomers().getById(s.sub), getOrders().listByCustomer(s.sub, { limit: 3 })]);
  const stats = [
    { label: "Orders", value: orders.total, icon: Package, href: "/account/orders" },
    { label: "Saved addresses", value: customer?.addresses?.length ?? 0, icon: MapPin, href: "/account/addresses" },
    { label: "Loyalty points", value: customer?.loyaltyPoints ?? 0, icon: Gift },
  ];
  return (
    <div className="space-y-5 sm:space-y-6">
      <ul className="grid grid-cols-3 gap-3 sm:gap-4">
        {stats.map(({ label, value, icon: Icon, href }) => {
          const body = (
            <>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-maroon/10 text-maroon sm:h-10 sm:w-10"><Icon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" /></span>
              <span className="mt-3 block text-xl font-bold text-ink sm:text-2xl">{value}</span>
              <span className="block text-[11px] text-muted sm:text-xs">{label}</span>
            </>
          );
          return (
            <li key={label}>
              {href
                ? <Link href={href} className={`${accountCard} block p-3.5 transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-18px_rgba(122,18,56,0.45)] sm:p-5`}>{body}</Link>
                : <div className={`${accountCard} p-3.5 sm:p-5`}>{body}</div>}
            </li>
          );
        })}
      </ul>

      <div className="grid gap-5 sm:gap-6 lg:grid-cols-2">
        <AccountCard>
          <AccountCardTitle icon={UserRound} title="Profile" subtitle="Your details for orders and invoices" />
          <ProfileForm initial={{ name: customer?.name ?? "", email: customer?.email ?? "", gstNumber: customer?.gstNumber ?? "" }} />
        </AccountCard>

        <AccountCard>
          <AccountCardTitle
            icon={ShoppingBag}
            title="Recent orders"
            subtitle={orders.total ? `${orders.total} order${orders.total === 1 ? "" : "s"} in total` : undefined}
            action={orders.items.length > 0 ? <Link href="/account/orders" className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-maroon hover:underline">View all <ArrowRight className="h-3.5 w-3.5" /></Link> : undefined}
          />
          {orders.items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-maroon/20 bg-maroon/[0.03] px-4 py-10 text-center">
              <p className="text-sm text-muted">No orders yet.</p>
              <Link href="/collections/sarees" className={buttonClass("primary", "sm", "mt-4 rounded-full")}>Start shopping</Link>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {orders.items.map((o) => (
                <li key={o.id}>
                  <Link href={`/account/orders/${o.orderNo}`} className="group flex items-center gap-3 rounded-xl border border-line/70 px-3.5 py-3 transition-colors hover:border-maroon/30 hover:bg-maroon/[0.03]">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-maroon/[0.07] text-maroon"><Package className="h-[18px] w-[18px]" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">{o.orderNo}</span>
                      <span className="block text-xs text-muted">{o.createdAt ? new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : ""} · {o.items.length} item{o.items.length === 1 ? "" : "s"}</span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-sm font-bold text-ink">{formatINR(o.netAmount)}</span>
                      <Badge tone={orderTone(o.orderStatus)}>{o.orderStatus}</Badge>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-maroon/50 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </AccountCard>
      </div>
    </div>
  );
}
