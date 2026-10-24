"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/hooks/useCart";
import { formatMoney } from "@/lib/currency";
import { Button, buttonClass } from "@/components/ui/button";
import { Empty } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Price } from "@/components/ui/price";
import { useUi } from "@/store/ui";
import { QtyStepper } from "./qty-stepper";
import { ComingSoonImage } from "@/components/ui/coming-soon-image";
import { isRemoteImageSource } from "@/lib/utils";

export function CartPage() {
  const { cart, update, coupon, isLoading } = useCart();
  const currency = useUi((s) => s.currency);
  const [code, setCode] = useState("");
  if (isLoading || !cart) return <div className="mx-auto max-w-site px-4 py-16 text-sm text-muted sm:px-6">Loading your bag…</div>;
  const t = cart.totals;
  return (
    <div className="mx-auto max-w-site px-4 py-8 sm:px-6">
      <h1 className="we-rule text-4xl">Your bag</h1>
      {cart.lines.length === 0 ? (
        <div className="mt-8"><Empty title="Your bag is empty" text="Handloom worth keeping, waiting to be found." href="/collections/sarees" cta="Shop sarees" /></div>
      ) : (
        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
          <ul className="divide-y divide-line">
            {cart.unavailable.length > 0 && (
              <li className="mb-4 rounded-sm border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                {cart.unavailable.length} item(s) are no longer available and were left out: {cart.unavailable.map((u) => u.sku).join(", ")}.
              </li>
            )}
            {cart.lines.map((l) => (
              <li key={l.sku} className="flex gap-5 py-5">
                <Link href={l.product.isBarcodeLabel ? `/collections/${/fabric|fabs/i.test(l.product.category) ? "fabrics" : "sarees"}?q=${encodeURIComponent(l.sku)}` : `/products/${l.product.slug}`} className="relative h-36 w-28 shrink-0 overflow-hidden rounded-sm bg-line">
                  {l.product.images[0] ? <Image src={l.product.images[0]} alt={l.product.name} fill unoptimized={isRemoteImageSource(l.product.images[0])} sizes="112px" className="object-cover" /> : <ComingSoonImage className="absolute inset-0" />}
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <Link href={l.product.isBarcodeLabel ? `/collections/${/fabric|fabs/i.test(l.product.category) ? "fabrics" : "sarees"}?q=${encodeURIComponent(l.sku)}` : `/products/${l.product.slug}`} className="text-base hover:text-maroon">{l.product.name}</Link>
                  <p className="text-xs text-muted">SKU {l.sku}</p>
                  <Price amount={l.product.pricing.sellingPrice} mrp={l.product.pricing.mrp} size="sm" className="mt-1" />
                  {l.product.stock.qty <= 3 && <p className="mt-1 text-xs text-gold">Only {l.product.stock.qty} left</p>}
                  <div className="mt-auto flex items-center justify-between pt-3">
                    <QtyStepper value={l.qty} max={l.product.stock.qty} onChange={(qty) => update.mutate({ sku: l.sku, qty })} />
                    <span className="font-medium">{formatMoney(l.product.pricing.sellingPrice * l.qty, currency)}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <aside className="h-fit rounded-sm border border-line bg-white/60 p-6">
            <h2 className="text-2xl">Order summary</h2>
            <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (code.trim()) coupon.mutate(code.trim().toUpperCase()); }}>
              <Input placeholder="Coupon code" value={code} onChange={(e) => setCode(e.target.value)} disabled={!!cart.couponCode} />
              {cart.couponCode ? <Button type="button" variant="outline" onClick={() => coupon.mutate(null)}>Remove</Button> : <Button type="submit" variant="secondary" loading={coupon.isPending}>Apply</Button>}
            </form>
            {coupon.isError && <p className="mt-2 text-xs text-red-700">{(coupon.error as Error).message}</p>}
            {cart.couponCode && !t.couponError && <p className="mt-2 text-xs text-olive">Coupon {cart.couponCode} applied.</p>}
            <dl className="mt-5 space-y-2 text-sm">
              <Row k={`Subtotal (${t.itemCount} items)`} v={formatMoney(t.subTotal, currency)} />
              {t.productDiscount > 0 && <Row k="You save" v={`− ${formatMoney(t.productDiscount, currency)}`} tone="olive" />}
              {t.couponDiscount > 0 && <Row k={`Coupon ${cart.couponCode}`} v={`− ${formatMoney(t.couponDiscount, currency)}`} tone="olive" />}
              <Row k="Shipping" v={t.shippingCharge === 0 ? "Free" : formatMoney(t.shippingCharge, currency)} />
              <Row k="Includes GST" v={formatMoney(t.gstTotal, currency)} muted />
              <div className="flex justify-between border-t border-line pt-3 text-base font-medium"><dt>Total</dt><dd>{formatMoney(t.netAmount, currency)}</dd></div>
            </dl>
            {t.freeShippingGap > 0 && <p className="mt-3 text-xs text-muted">Add {formatMoney(t.freeShippingGap, currency)} more for free shipping.</p>}
            <Link href="/checkout" className={buttonClass("primary", "lg", "mt-6 w-full")}>Proceed to checkout</Link>
            <Link href="/collections/sarees" className="mt-3 block text-center text-xs uppercase tracking-widest text-muted hover:text-olive">Continue shopping</Link>
          </aside>
        </div>
      )}
    </div>
  );
}

function Row({ k, v, tone, muted }: { k: string; v: string; tone?: "olive"; muted?: boolean }) {
  return (
    <div className={`flex justify-between ${tone === "olive" ? "text-olive" : ""} ${muted ? "text-xs text-muted" : ""}`}>
      <dt>{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
