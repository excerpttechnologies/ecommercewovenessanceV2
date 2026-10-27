"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  BadgeCheck, Banknote, Check, ChevronLeft, ChevronRight, Grid3x3, Heart, Image as ImageIcon, Layers, Minus, Palette,
  Brush, Plus, RotateCcw, Ruler, Share2, ShieldCheck, ShoppingBag, ShoppingCart, Tag, Truck, Wand2, X, ZoomIn,
} from "lucide-react";
import type { BarcodeProduct } from "@/domain/types";
import { useCart, useWishlist } from "@/hooks/useCart";
import { swatchColor } from "@/lib/colour";
import { cn, formatINR } from "@/lib/utils";

type Neighbour = { href: string; name: string } | null;

const ATTR_ICONS: Record<string, React.ComponentType<{ className?: string }>> = { weave: Grid3x3, fabric: Layers, craft: Brush, occasion: Tag, color: Palette };
const ATTR_LABELS: Record<string, string> = { weave: "Weave", fabric: "Fabric", craft: "Craft", occasion: "Occasion", color: "Colour" };

const sentence = (s: string) => (s === s.toUpperCase() ? s.charAt(0) + s.slice(1).toLowerCase() : s);

/** Photo with hover zoom (follows the pointer) and a full-screen view. */
function ZoomImage({ src, alt, discount }: { src?: string; alt: string; discount: number }) {
  const [failed, setFailed] = useState(!src);
  const [origin, setOrigin] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  return (
    <>
      <div
        className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-line sm:aspect-[5/4]"
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
        }}
        onMouseLeave={() => setOrigin(null)}
      >
        {failed || !src ? (
          <div role="img" aria-label={`Photo unavailable for ${alt}`} className="absolute inset-0 flex items-end justify-center bg-[#fbe3ea] bg-[url('/placeholders/photo-unavailable.webp')] bg-cover bg-center pb-[12%]">
            <span className="flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-maroon"><ImageIcon className="h-4 w-4" /> Photo unavailable</span>
          </div>
        ) : (
          <button type="button" onClick={() => setOpen(true)} aria-label="View photo full screen" className="absolute inset-0 cursor-zoom-in">
            <Image
              src={src}
              alt={alt}
              fill
              priority
              unoptimized
              sizes="(min-width: 1024px) 50vw, 100vw"
              onError={() => setFailed(true)}
              style={origin ? { transformOrigin: origin } : undefined}
              className={cn("object-cover transition-transform duration-300", origin && "scale-[1.8]")}
            />
          </button>
        )}
        {discount > 0 && <span className="pointer-events-none absolute left-4 top-4 rounded-full bg-maroon px-3 py-1 text-xs font-semibold text-white">{discount}% OFF</span>}
        {!failed && src && (
          <span className="pointer-events-none absolute bottom-4 right-4 flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-medium text-olive shadow-card">
            <ZoomIn className="h-3.5 w-3.5" /> Hover to zoom · click to enlarge
          </span>
        )}
      </div>
      {open && src && (
        <div role="dialog" aria-modal="true" aria-label={alt} className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 p-4" onClick={() => setOpen(false)} onKeyDown={(e) => e.key === "Escape" && setOpen(false)}>
          <button type="button" autoFocus onClick={() => setOpen(false)} aria-label="Close" className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white text-olive"><X className="h-5 w-5" /></button>
          <div className="relative h-full w-full max-w-5xl">
            <Image src={src} alt={alt} fill unoptimized sizes="100vw" className="object-contain" />
          </div>
        </div>
      )}
    </>
  );
}

export function BarcodeProductDetail({ item, categoryTitle, categoryHref, previous, next, freeShippingAbove, codEnabled }: {
  item: BarcodeProduct;
  categoryTitle: string;
  categoryHref: string;
  previous: Neighbour;
  next: Neighbour;
  freeShippingAbove?: number | null;
  codEnabled: boolean;
}) {
  const router = useRouter();
  const { add } = useCart();
  const { has, toggle } = useWishlist();
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<"details" | "care" | "shipping">("details");
  const [shared, setShared] = useState(false);

  const price = item.price ?? 0;
  const selling = item.offerPrice && item.offerPrice < price ? item.offerPrice : price;
  const discount = selling < price && price > 0 ? Math.round(((price - selling) / price) * 100) : 0;
  const inStock = item.status === "IN_STOCK" && !(item.qty != null && item.qty <= 0);
  const maxQty = Math.max(1, Math.min(10, item.qty ?? 1));
  const name = item.ecommerce?.displayName || item.itemName || item.name;
  const subtitle = [item.ecommerce?.description, item.printDescription].find((d) => d && d.trim() && d !== name);
  const attrs = Object.entries(item.ecommerce?.attributes ?? {}).filter((e): e is [string, string] => Boolean(e[1]));
  const colour = item.ecommerce?.attributes?.color;
  const wished = has(item.barcode);
  const busy = add.isPending;

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: name, url });
      else {
        await navigator.clipboard.writeText(url);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      }
    } catch {
      /* share sheet dismissed */
    }
  };
  const buyNow = () => add.mutate({ sku: item.barcode, qty }, { onSuccess: () => router.push("/checkout") });

  const trust = [
    { Icon: Truck, title: "Free Shipping", text: freeShippingAbove ? `On orders above ₹${freeShippingAbove.toLocaleString("en-IN")}` : "Across India" },
    { Icon: ShieldCheck, title: "Secure Payment", text: "Safe, encrypted checkout" },
    ...(codEnabled ? [{ Icon: Banknote, title: "Cash on Delivery", text: "On eligible orders" }] : []),
    { Icon: BadgeCheck, title: "Authentic Weave", text: "From Temple Fabrics, Bengaluru" },
  ];

  return (
    <div>
      {(previous || next) && (
        <div className="mb-4 flex justify-end gap-4 text-sm font-medium text-olive">
          {previous && <Link href={previous.href} title={previous.name} className="inline-flex items-center gap-1 hover:text-maroon"><ChevronLeft className="h-4 w-4" /> Previous</Link>}
          {next && <Link href={next.href} title={next.name} className="inline-flex items-center gap-1 hover:text-maroon">Next <ChevronRight className="h-4 w-4" /></Link>}
        </div>
      )}
      <div className="grid gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-10">
        {/* Gallery */}
        <div className="min-w-0 lg:sticky lg:top-40 lg:self-start">
          <ZoomImage src={item.image} alt={name} discount={discount} />
          <div className="mt-3 rounded-xl border border-line bg-white px-3 py-2.5 sm:px-4 sm:py-3">
            <p className="text-[13px] font-semibold text-olive sm:text-sm">Why you&apos;ll love it</p>
            <ul className="we-scroller -mx-1 mt-2 flex gap-2 overflow-x-auto px-1 text-[11px] text-ink/75 sm:grid sm:grid-cols-4 sm:gap-3 sm:overflow-visible sm:text-xs">
              {[["Handpicked piece", BadgeCheck], ["One-of-a-kind barcode", Tag], ["Checked before dispatch", ShieldCheck], ["Easy to style", Wand2]].map(([label, Icon]) => {
                const I = Icon as React.ComponentType<{ className?: string }>;
                return (
                  <li key={label as string} className="flex min-w-[96px] shrink-0 flex-col items-center gap-1.5 whitespace-nowrap text-center sm:min-w-0">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-maroon/10 text-maroon sm:h-9 sm:w-9"><I className="h-4 w-4" /></span>
                    {label as string}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Details */}
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <span className="inline-block rounded-full bg-maroon/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-maroon">Barcode {item.barcode}</span>
              <h1 className="mt-3 font-display text-3xl font-semibold leading-tight sm:text-4xl">{name}</h1>
              {subtitle && <p className="mt-1 text-base text-muted">{sentence(subtitle)}</p>}
            </div>
            <div className="flex shrink-0 gap-3">
              <button type="button" onClick={share} className="flex flex-col items-center gap-1 text-xs text-muted hover:text-maroon">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-maroon/10 text-maroon">{shared ? <Check className="h-5 w-5" /> : <Share2 className="h-5 w-5" />}</span>
                {shared ? "Copied" : "Share"}
              </button>
              <button type="button" onClick={() => toggle.mutate(item.barcode)} aria-pressed={wished} className="flex flex-col items-center gap-1 text-xs text-muted hover:text-maroon">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-maroon/10 text-maroon"><Heart className={cn("h-5 w-5", wished && "fill-maroon")} /></span>
                {wished ? "Saved" : "Wishlist"}
              </button>
            </div>
          </div>

          {(attrs.length > 0 || item.uom) && (
            <div className="we-scroller mt-4 flex gap-4 overflow-x-auto rounded-xl border border-line bg-white px-3 py-2.5 sm:justify-between sm:gap-5 sm:px-5">
              {attrs.map(([key, value]) => {
                const Icon = ATTR_ICONS[key] ?? Tag;
                return (
                  <div key={key} className="flex shrink-0 items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-maroon/10 text-maroon"><Icon className="h-4 w-4" /></span>
                    <span className="min-w-0"><span className="block text-[10px] text-muted sm:text-[11px]">{ATTR_LABELS[key] ?? key}</span><span className="block whitespace-nowrap text-[13px] font-medium text-olive sm:text-sm">{value}</span></span>
                  </div>
                );
              })}
              {item.uom && (
                <div className="flex shrink-0 items-center gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-maroon/10 text-maroon"><Ruler className="h-4 w-4" /></span>
                  <span><span className="block text-[10px] text-muted sm:text-[11px]">Sold as</span><span className="block whitespace-nowrap text-[13px] font-medium text-olive sm:text-sm">{item.uom}</span></span>
                </div>
              )}
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              {price > 0 ? (
                <p className="flex flex-wrap items-center gap-3">
                  {discount > 0 && <span className="text-lg text-muted line-through">{formatINR(price)}</span>}
                  <span className="text-3xl font-bold text-maroon">{formatINR(selling)}</span>
                  {discount > 0 && <span className="rounded-lg bg-maroon/10 px-2.5 py-1 text-sm font-semibold text-maroon">{discount}% off</span>}
                </p>
              ) : <p className="text-sm text-muted">Price on request</p>}
              <p className="mt-1 text-xs text-muted">Inclusive of all taxes{item.gstPercent ? ` (GST ${item.gstPercent}%)` : ""}</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted">
              <span className={cn("inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold", inStock ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>
                {inStock ? <><Check className="h-4 w-4" /> In Stock</> : "Unavailable"}
              </span>
              <span className="leading-relaxed">
                {item.itemCode && <>SKU: {item.itemCode}<br /></>}
                Category: <Link href={categoryHref} className="hover:text-maroon">{categoryTitle}</Link>
              </span>
            </div>
          </div>

          {colour && (
            <div className="mt-5 flex items-center gap-4">
              <span className="w-20 text-sm font-medium text-olive">Colour</span>
              <span className="flex items-center gap-2 text-sm text-ink/80"><span className="h-7 w-7 rounded-full ring-2 ring-maroon ring-offset-2" style={{ background: swatchColor(colour) }} />{colour}</span>
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            {maxQty > 1 && (
              <div className="flex h-12 items-center rounded-full border border-line bg-white">
                <button type="button" aria-label="Decrease quantity" disabled={qty <= 1} onClick={() => setQty((q) => q - 1)} className="flex h-12 w-11 items-center justify-center text-olive disabled:opacity-30"><Minus className="h-4 w-4" /></button>
                <span className="w-8 text-center text-sm font-semibold" aria-live="polite"><span key={qty} className="we-pop">{qty}</span></span>
                <button type="button" aria-label="Increase quantity" disabled={qty >= maxQty} onClick={() => setQty((q) => q + 1)} className="flex h-12 w-11 items-center justify-center text-olive disabled:opacity-30"><Plus className="h-4 w-4" /></button>
              </div>
            )}
            <button type="button" disabled={!inStock || busy} onClick={() => add.mutate({ sku: item.barcode, qty })} className="inline-flex h-12 min-w-[170px] flex-1 items-center justify-center gap-2 rounded-full bg-maroon px-6 text-[15px] font-semibold text-white shadow-[0_10px_22px_-12px_rgba(219,26,114,0.9)] transition-all hover:-translate-y-0.5 hover:bg-gold disabled:translate-y-0 disabled:bg-[#e4e1e3] disabled:text-muted disabled:shadow-none">
              <ShoppingBag className="h-5 w-5" /> {inStock ? (busy ? "Adding…" : "Add to Bag") : "Unavailable"}
            </button>
            {inStock && (
              <button type="button" disabled={busy} onClick={buyNow} className="inline-flex h-12 min-w-[150px] flex-1 items-center justify-center gap-2 rounded-full border-2 border-maroon bg-white px-6 text-[15px] font-semibold text-maroon transition-colors hover:bg-maroon/5 disabled:opacity-60">
                <ShoppingCart className="h-5 w-5" /> Buy Now
              </button>
            )}
          </div>
          {add.isError && <p role="alert" className="mt-2 text-sm text-red-700">{(add.error as Error).message}</p>}

          <ul className="mt-5 grid grid-cols-2 gap-3 rounded-xl border border-line bg-white p-3.5 xl:flex xl:justify-between xl:gap-2 xl:px-2.5 xl:py-3">
            {trust.map(({ Icon, title, text }) => (
              <li key={title} className="flex min-w-0 items-start gap-2.5 xl:shrink-0 xl:gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-maroon/10 text-maroon xl:h-8 xl:w-8"><Icon className="h-4 w-4 xl:h-3.5 xl:w-3.5" /></span>
                <span className="min-w-0"><span className="block whitespace-nowrap text-[13px] font-semibold text-olive xl:text-xs">{title}</span><span className="block text-[11px] leading-snug text-muted xl:max-w-[88px] xl:text-[10.5px]">{text}</span></span>
              </li>
            ))}
          </ul>

          <div className="mt-6">
            <div role="tablist" aria-label="Product information" className="we-scroller flex gap-1 overflow-x-auto border-b border-line">
              {([["details", "Product Details"], ["care", "Fabric & Care"], ["shipping", "Shipping & Returns"]] as const).map(([key, label]) => (
                <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={cn("-mb-px shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-[13px] font-semibold transition-colors sm:px-4 sm:py-2.5 sm:text-sm", tab === key ? "border-maroon text-maroon" : "border-transparent text-olive hover:text-maroon")}>
                  {label}
                </button>
              ))}
            </div>
            <div role="tabpanel" className="pt-4 text-[15px] leading-relaxed text-ink/80">
              {tab === "details" && (
                <>
                  <p>{subtitle ? `${sentence(subtitle)}. ` : ""}A {categoryTitle.toLowerCase().replace(/s$/, "")} chosen at our Temple Fabrics store in Jayanagar, Bengaluru. Each barcode is a single piece, so the one you order is the one in the photo.</p>
                  {attrs.length > 0 && (
                    <ul className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                      {attrs.map(([key, value]) => <li key={key} className="flex items-center gap-2"><Check className="h-4 w-4 text-maroon" />{ATTR_LABELS[key] ?? key}: {value}</li>)}
                      {item.hsnCode && <li className="flex items-center gap-2"><Check className="h-4 w-4 text-maroon" />HSN: {item.hsnCode}</li>}
                    </ul>
                  )}
                </>
              )}
              {tab === "care" && (
                <ul className="space-y-1.5">
                  <li className="flex gap-2"><Check className="mt-1 h-4 w-4 shrink-0 text-maroon" />Dry clean recommended for silks and zari work.</li>
                  <li className="flex gap-2"><Check className="mt-1 h-4 w-4 shrink-0 text-maroon" />Store folded in a muslin or cotton cloth, away from damp and direct sunlight.</li>
                  <li className="flex gap-2"><Check className="mt-1 h-4 w-4 shrink-0 text-maroon" />Refold every few months to protect the zari from creasing.</li>
                  <li className="flex gap-2"><Check className="mt-1 h-4 w-4 shrink-0 text-maroon" />Iron on low heat on the reverse side.</li>
                </ul>
              )}
              {tab === "shipping" && (
                <div className="space-y-2">
                  <p className="flex gap-2"><Truck className="mt-1 h-4 w-4 shrink-0 text-maroon" />Shipped from Bengaluru to addresses across India{freeShippingAbove ? `; free on orders above ₹${freeShippingAbove.toLocaleString("en-IN")}` : ""}.</p>
                  <p className="flex gap-2"><RotateCcw className="mt-1 h-4 w-4 shrink-0 text-maroon" />See our <Link href="/pages/returns" className="text-maroon underline underline-offset-2">returns</Link> and <Link href="/pages/shipping-policy" className="text-maroon underline underline-offset-2">shipping</Link> policies, or <Link href="/contact" className="text-maroon underline underline-offset-2">contact us</Link> with any question.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
