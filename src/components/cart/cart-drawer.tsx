"use client";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/hooks/useCart";
import { buttonClass } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Price } from "@/components/ui/price";
import { useUi } from "@/store/ui";
import { QtyStepper } from "./qty-stepper";
import { formatMoney } from "@/lib/currency";
import { ComingSoonImage } from "@/components/ui/coming-soon-image";
import { isRemoteImageSource } from "@/lib/utils";

export function CartDrawer() {
  const open = useUi((s) => s.cartOpen);
  const setOpen = useUi((s) => s.setCartOpen);
  const currency = useUi((s) => s.currency);
  const { cart, update, isLoading } = useCart();
  const lines = cart?.lines ?? [];
  const t = cart?.totals;

  return (
    <Drawer open={open} onClose={() => setOpen(false)} title={`Your bag${t?.itemCount ? ` (${t.itemCount})` : ""}`}>
      {isLoading && <p className="p-5 text-sm text-muted">Loading…</p>}
      {!isLoading && lines.length === 0 && (
        <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="font-heading text-2xl text-olive">Your bag is empty</p>
          <p className="text-sm text-muted">Handloom worth keeping, waiting to be found.</p>
          <Link href="/collections/sarees" onClick={() => setOpen(false)} className={buttonClass("outline")}>Shop sarees</Link>
        </div>
      )}
      {lines.length > 0 && (
        <ul className="divide-y divide-line px-5">
          {lines.map((l) => (
            <li key={l.sku} className="flex gap-4 py-4">
              <Link href={`/products/${l.product.slug}`} onClick={() => setOpen(false)} className="relative h-28 w-20 shrink-0 overflow-hidden rounded-sm bg-line">
                {l.product.images[0] ? <Image src={l.product.images[0]} alt={l.product.name} fill unoptimized={isRemoteImageSource(l.product.images[0])} sizes="80px" className="object-cover" /> : <ComingSoonImage className="absolute inset-0" />}
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <Link href={`/products/${l.product.slug}`} onClick={() => setOpen(false)} className="line-clamp-2 text-sm hover:text-maroon">{l.product.name}</Link>
                <p className="mt-0.5 text-xs text-muted">{l.sku}</p>
                <div className="mt-auto flex items-center justify-between">
                  <QtyStepper value={l.qty} max={l.product.stock.qty} onChange={(qty) => update.mutate({ sku: l.sku, qty })} />
                  <Price amount={l.product.pricing.sellingPrice * l.qty} size="sm" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {t && lines.length > 0 && (
        <div className="sticky bottom-0 border-t border-line bg-ivory p-5" style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))" }}>
          {t.freeShippingGap > 0 ? (
            <p className="mb-3 text-xs text-muted">Add <b className="text-olive">{formatMoney(t.freeShippingGap, currency)}</b> more for free shipping.</p>
          ) : (
            <p className="mb-3 text-xs text-olive">You’ve unlocked free shipping.</p>
          )}
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span className="font-medium">{formatMoney(t.subTotal, currency)}</span>
          </div>
          {t.couponDiscount > 0 && (
            <div className="flex justify-between text-sm text-olive">
              <span>Coupon {cart?.couponCode}</span>
              <span>− {formatMoney(t.couponDiscount, currency)}</span>
            </div>
          )}
          <p className="mt-1 text-[11px] text-muted">Shipping & taxes calculated at checkout.</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link href="/cart" onClick={() => setOpen(false)} className={buttonClass("outline")}>View bag</Link>
            <Link href="/checkout" onClick={() => setOpen(false)} className={buttonClass("primary")}>Checkout</Link>
          </div>
        </div>
      )}
    </Drawer>
  );
}
