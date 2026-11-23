"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { useRef, type MouseEvent } from "react";
import { useCart } from "@/hooks/useCart";
import { useCartLineRemoval } from "@/hooks/useCartLineRemoval";
import { buttonClass } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Price } from "@/components/ui/price";
import { useUi } from "@/store/ui";
import { cn } from "@/lib/utils";
import { QtyStepper } from "./qty-stepper";
import { RemoveLineButton } from "./remove-line-button";
import { formatMoney } from "@/lib/currency";
import { OrderItemImage } from "@/components/ui/order-item-image";

export function CartDrawer() {
  const open = useUi((s) => s.cartOpen);
  const setOpen = useUi((s) => s.setCartOpen);
  const currency = useUi((s) => s.currency);
  const { cart, update, isLoading } = useCart();
  const { removeLine, isRemoving, removeError } = useCartLineRemoval();
  const router = useRouter();
  const pendingUpdates = useRef(new Set<Promise<unknown>>());
  const lines = cart?.lines ?? [];
  const lineCount = lines.length;
  const t = cart?.totals;
  const updateQuantity = (sku: string, qty: number) => {
    const request = update.mutateAsync({ sku, qty });
    pendingUpdates.current.add(request);
    void request.then(
      () => pendingUpdates.current.delete(request),
      () => pendingUpdates.current.delete(request),
    );
    return request;
  };
  const navigateAfterUpdates = async (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      setOpen(false);
      return;
    }
    event.preventDefault();
    try {
      await Promise.all([...pendingUpdates.current]);
      setOpen(false);
      router.push(href);
    } catch {
      // The cart update error is shown below; stay in the drawer.
    }
  };

  return (
    <Drawer
      open={open}
      onClose={() => setOpen(false)}
      title={`Your bag${lineCount ? ` (${lineCount} ${lineCount === 1 ? "item" : "items"})` : ""}`}
    >
      {isLoading && <p className="p-5 text-sm text-muted">Loading…</p>}
      {update.isError && <p role="alert" className="mx-5 mt-3 text-xs text-red-700">{(update.error as Error).message}</p>}
      {removeError && <p role="alert" className="mx-5 mt-3 text-xs text-red-700">{(removeError as Error).message}</p>}
      {!isLoading && lineCount === 0 && (
        <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-maroon/5 text-maroon" aria-hidden="true">
            <ShoppingBag className="h-8 w-8" strokeWidth={1.5} />
          </span>
          <p className="font-heading text-2xl text-olive">Your bag is empty</p>
          <p className="text-sm text-muted">Handloom worth keeping, waiting to be found.</p>
          <Link href="/collections/sarees" onClick={() => setOpen(false)} className={buttonClass("outline")}>
            Continue shopping
          </Link>
        </div>
      )}
      {lineCount > 0 && (
        // Re-keyed on open so the items slide in each time the drawer opens.
        <ul key={open ? "open" : "closed"} className="we-stagger divide-y divide-line px-5">
          {lines.map((l, index) => {
            const removing = isRemoving(l.sku);
            return (
              <li key={l.sku} className={cn("flex gap-4 py-4", removing && "we-cart-line-out")}>
                <Link href={`/products/${l.product.slug}`} onClick={() => setOpen(false)} className="relative h-28 w-20 shrink-0 overflow-hidden rounded-lg bg-line">
                  <OrderItemImage
                    src={l.product.images[0]}
                    sku={l.sku}
                    fallbackSources={l.product.images.slice(1)}
                    alt={`Code ${l.sku}`}
                    fill
                    sizes="80px"
                  />
                </Link>
                <div className="relative flex min-w-0 flex-1 flex-col pr-10">
                  <Link href={`/products/${l.product.slug}`} onClick={() => setOpen(false)} className="line-clamp-2 text-sm uppercase tracking-wide hover:text-maroon">Code {l.sku}</Link>
                  <RemoveLineButton
                    sku={l.sku}
                    disabled={removing}
                    onRemove={() => void removeLine(l, index)}
                    className="absolute -right-2 -top-2"
                  />
                  <div className="mt-auto flex items-center justify-between">
                    <QtyStepper
                      value={l.qty}
                      max={l.product.stock.qty}
                      unit={l.product.uom}
                      unitType={l.product.uomType}
                      ariaLabel={`Quantity for CODE ${l.sku}`}
                      onChange={(qty) => updateQuantity(l.sku, qty)}
                      showUnit
                    />
                    <Price amount={Math.round(l.product.pricing.sellingPrice * l.qty * 100) / 100} size="sm" />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {t && lineCount > 0 && (
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
            <Link href="/cart" onClick={(event) => void navigateAfterUpdates(event, "/cart")} className={buttonClass("outline")}>View bag</Link>
            <Link href="/checkout" onClick={(event) => void navigateAfterUpdates(event, "/checkout")} className={buttonClass("primary")}>Checkout</Link>
          </div>
        </div>
      )}
    </Drawer>
  );
}
