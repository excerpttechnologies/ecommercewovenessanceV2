import type { Metadata } from "next";
import { TrackOrderForm } from "@/components/account/track-order-form";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export const metadata: Metadata = { title: "Track your order", robots: { index: false } };

export default async function TrackOrderPage({ searchParams }: { searchParams: Promise<{ orderNo?: string; phone?: string }> }) {
  const { orderNo, phone } = await searchParams;
  return (
    <div className="mx-auto max-w-site px-4 py-6 sm:px-6">
      <Breadcrumbs items={[{ label: "Track order" }]} />
      <div className="mx-auto mt-8 max-w-2xl">
        <p className="text-[11px] uppercase tracking-[0.2em] text-gold">Order updates</p>
        <h1 className="mt-2 text-4xl">Track your order</h1>
        <p className="mt-3 max-w-lg text-sm text-muted">Enter your order number and the phone number used at checkout to view the latest status.</p>
        <div className="mt-7"><TrackOrderForm initialOrderNo={orderNo ?? ""} initialPhone={phone ?? ""} /></div>
      </div>
    </div>
  );
}
