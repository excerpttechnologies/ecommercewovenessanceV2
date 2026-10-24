import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { getOrders } from "@/repositories";
import { formatINR } from "@/lib/utils";
import { buttonClass } from "@/components/ui/button";

export const metadata: Metadata = { title: "Order placed", robots: { index: false } };

export default async function Success({ params }: { params: Promise<{ orderNo: string }> }) {
  const order = await getOrders().getByOrderNo((await params).orderNo);
  if (!order) notFound();
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
      <CheckCircle2 className="mx-auto h-14 w-14 text-olive" />
      <h1 className="mt-4 text-4xl">Thank you for your order</h1>
      <p className="mt-2 text-sm text-muted">Order <b className="text-olive">{order.orderNo}</b> · {order.paymentMode === "COD" ? "Cash on delivery" : "Paid online"} · {formatINR(order.netAmount)}</p>
      <p className="mt-4 text-sm text-ink/80">We’ll WhatsApp and SMS you at {order.shippingAddress.phone} when it ships to {order.shippingAddress.city}.</p>
      <ul className="mx-auto mt-8 max-w-md divide-y divide-line rounded-sm border border-line text-left text-sm">
        {order.items.map((it) => (
          <li key={it.sku} className="flex justify-between px-4 py-3"><span>{it.name} × {it.qty}</span><span>{formatINR(it.amount)}</span></li>
        ))}
      </ul>
      <div className="mt-8 flex justify-center gap-3">
        <Link href={`/track-order?orderNo=${encodeURIComponent(order.orderNo)}&phone=${encodeURIComponent(order.shippingAddress.phone ?? "")}`} className={buttonClass("outline")}>Track order</Link>
        <Link href="/" className={buttonClass("primary")}>Continue shopping</Link>
      </div>
    </div>
  );
}
