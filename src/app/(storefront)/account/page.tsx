import Link from "next/link";
import { getCustomerSession } from "@/lib/auth";
import { formatINR } from "@/lib/utils";
import { getCustomers, getOrders } from "@/repositories";
import { ProfileForm } from "@/components/account/profile-form";

export const metadata = { title: "My account", robots: { index: false } };

export default async function AccountHome() {
  const s = (await getCustomerSession())!;
  const [customer, orders] = await Promise.all([getCustomers().getById(s.sub), getOrders().listByCustomer(s.sub, { limit: 3 })]);
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section className="rounded-sm border border-line bg-white/60 p-5">
        <h2 className="text-2xl">Profile</h2>
        <ProfileForm initial={{ name: customer?.name ?? "", email: customer?.email ?? "", gstNumber: customer?.gstNumber ?? "" }} />
        {customer && customer.loyaltyPoints > 0 && <p className="mt-4 text-xs text-muted">Loyalty points: <b className="text-olive">{customer.loyaltyPoints}</b></p>}
      </section>
      <section className="rounded-sm border border-line bg-white/60 p-5">
        <div className="flex items-center justify-between"><h2 className="text-2xl">Recent orders</h2><Link href="/account/orders" className="text-xs uppercase tracking-widest text-maroon">All orders</Link></div>
        <ul className="mt-4 divide-y divide-line text-sm">
          {orders.items.length === 0 && <li className="py-3 text-muted">No orders yet.</li>}
          {orders.items.map((o) => (
            <li key={o.id} className="flex items-center justify-between py-3">
              <Link href={`/account/orders/${o.orderNo}`} className="hover:text-maroon">{o.orderNo}<span className="block text-xs text-muted">{o.createdAt ? new Date(o.createdAt).toLocaleDateString("en-IN") : ""} · {o.items.length} item(s)</span></Link>
              <span className="text-right"><span className="block">{formatINR(o.netAmount)}</span><span className="text-xs text-olive">{o.orderStatus}</span></span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
