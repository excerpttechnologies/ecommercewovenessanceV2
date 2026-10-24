import Link from "next/link";
import { getCustomerSession } from "@/lib/auth";
import { formatINR } from "@/lib/utils";
import { getOrders } from "@/repositories";
import { Badge } from "@/components/ui/badge";
import { Empty } from "@/components/ui/empty";
import { orderTone } from "@/components/account/order-status";

export const metadata = { title: "My orders", robots: { index: false } };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const s = (await getCustomerSession())!;
  const page = Number((await searchParams).page ?? 1);
  const r = await getOrders().listByCustomer(s.sub, { page, limit: 10 });
  if (!r.items.length) return <Empty title="No orders yet" href="/collections/sarees" cta="Start shopping" />;
  return (
    <div>
      <ul className="divide-y divide-line rounded-sm border border-line bg-white/60">
        {r.items.map((o) => (
          <li key={o.id}>
            <Link href={`/account/orders/${o.orderNo}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-olive/5">
              <span><span className="block text-sm font-medium">{o.orderNo}</span><span className="text-xs text-muted">{o.createdAt ? new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : ""} · {o.items.length} item(s) · {o.paymentMode}</span></span>
              <span className="flex items-center gap-3"><Badge tone={orderTone(o.orderStatus)}>{o.orderStatus}</Badge><span className="text-sm">{formatINR(o.netAmount)}</span></span>
            </Link>
          </li>
        ))}
      </ul>
      {r.pages > 1 && <div className="mt-4 flex gap-2 text-xs">{page > 1 && <Link href={`?page=${page - 1}`} className="rounded-sm border border-line px-3 py-1.5">Previous</Link>}{page < r.pages && <Link href={`?page=${page + 1}`} className="rounded-sm border border-line px-3 py-1.5">Next</Link>}</div>}
    </div>
  );
}
