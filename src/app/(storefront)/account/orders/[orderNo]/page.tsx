import Image from "next/image";
import { notFound } from "next/navigation";
import { getCustomerSession } from "@/lib/auth";
import { formatINR } from "@/lib/utils";
import { getOrders } from "@/repositories";
import { Badge } from "@/components/ui/badge";
import { OrderTimeline, orderTone } from "@/components/account/order-status";

export const metadata = { title: "Order details", robots: { index: false } };

export default async function OrderPage({ params }: { params: Promise<{ orderNo: string }> }) {
  const s = (await getCustomerSession())!;
  const order = await getOrders().getByOrderNo((await params).orderNo);
  if (!order || order.customerId !== s.sub) notFound();
  const a = order.shippingAddress;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-3xl">{order.orderNo}</h2><p className="text-xs text-muted">{order.createdAt ? new Date(order.createdAt).toLocaleString("en-IN") : ""} · {order.paymentMode} · Payment {order.paymentStatus}</p></div>
        <Badge tone={orderTone(order.orderStatus)}>{order.orderStatus}</Badge>
      </div>
      <div className="rounded-sm border border-line bg-white/60 p-5"><OrderTimeline status={order.orderStatus} />{order.awbNo && <p className="mt-3 text-xs text-muted">Tracking / AWB: <b className="text-olive">{order.awbNo}</b></p>}</div>
      <div className="grid gap-6 md:grid-cols-[1fr_300px]">
        <ul className="divide-y divide-line rounded-sm border border-line bg-white/60">
          {order.items.map((it) => (
            <li key={it.sku} className="flex items-center gap-4 p-4 text-sm">
              <span className="relative h-20 w-14 shrink-0 overflow-hidden rounded-sm bg-line">{it.image && <Image src={it.image} alt="" fill sizes="56px" className="object-cover" />}</span>
              <span className="min-w-0 flex-1"><span className="block">{it.name}</span><span className="text-xs text-muted">{it.sku} · × {it.qty}</span></span>
              <span>{formatINR(it.amount)}</span>
            </li>
          ))}
        </ul>
        <div className="space-y-4 text-sm">
          <div className="rounded-sm border border-line bg-white/60 p-4">
            <p className="mb-2 text-[11px] uppercase tracking-widest text-olive">Deliver to</p>
            <p className="font-medium">{a.name}</p><p className="text-muted">{a.line1}{a.line2 ? `, ${a.line2}` : ""}<br />{a.city}, {a.state} {a.pincode}<br />{a.phone}</p>
          </div>
          <dl className="space-y-1 rounded-sm border border-line bg-white/60 p-4">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatINR(order.subTotal)}</dd></div>
            {order.discountTotal > 0 && <div className="flex justify-between text-olive"><dt>Discount{order.couponCode ? ` (${order.couponCode})` : ""}</dt><dd>− {formatINR(order.discountTotal)}</dd></div>}
            <div className="flex justify-between"><dt>Shipping</dt><dd>{order.shippingCharge ? formatINR(order.shippingCharge) : "Free"}</dd></div>
            <div className="flex justify-between text-xs text-muted"><dt>GST included</dt><dd>{formatINR(order.gstTotal)}</dd></div>
            <div className="flex justify-between border-t border-line pt-2 font-medium"><dt>Total</dt><dd>{formatINR(order.netAmount)}</dd></div>
          </dl>
        </div>
      </div>
    </div>
  );
}
