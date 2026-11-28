"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  BadgeCheck, Banknote, Check, ChevronLeft, ChevronRight, Grid3x3, Heart, Layers, Palette,
  Brush, Share2, ShieldCheck, ShoppingBag, ShoppingCart, Tag, Truck, Wand2,
} from "lucide-react";
import { ImageGallery } from "@/components/product/image-gallery";
import { PincodeCheck } from "@/components/product/pincode-check";
import { QtyStepper } from "@/components/cart/qty-stepper";
import { ProductInformationTabs, type ProductOverviewRow } from "@/components/product/info-tabs";
import { COUNTRY_OF_ORIGIN, type CustomerCareInfo, type ShippingReturnsInfo } from "@/lib/product-info";
import type { BarcodeProduct } from "@/domain/types";
import { useCart, useWishlist } from "@/hooks/useCart";
import { formatCategoryDisplayName } from "@/lib/add-on-categories";
import { galleryViewLabel, buildGalleryImages } from "@/lib/product-gallery";
import { swatchColor } from "@/lib/colour";
import { getDefaultProductQty } from "@/lib/product-quantity";
import { isDecimalUnit } from "@/lib/product-quantity";
import { cn, formatINR } from "@/lib/utils";

type Neighbour = { href: string; name: string } | null;

const ATTR_ICONS: Record<string, React.ComponentType<{ className?: string }>> = { weave: Grid3x3, fabric: Layers, craft: Brush, occasion: Tag, color: Palette };
const ATTR_LABELS: Record<string, string> = { weave: "Weave", fabric: "Fabric", craft: "Craft", occasion: "Occasion", color: "Colour" };

export function BarcodeProductDetail({ item, categoryTitle, categoryHref, previous, next, freeShippingAbove, codEnabled, customerCare, shippingReturns }: {
  item: BarcodeProduct;
  categoryTitle: string;
  categoryHref: string;
  previous: Neighbour;
  next: Neighbour;
  freeShippingAbove?: number | null;
  codEnabled: boolean;
  customerCare: CustomerCareInfo;
  shippingReturns: ShippingReturnsInfo;
}) {
  const router = useRouter();
  const { add } = useCart();
  const { has, toggle } = useWishlist();
  const busy = add.isPending;

  const price = item.price ?? 0;
  const selling = item.offerPrice && item.offerPrice < price ? item.offerPrice : price;
  const discount = selling < price && price > 0 ? Math.round(((price - selling) / price) * 100) : 0;
  const inStock = item.status === "IN_STOCK" && !(item.qty != null && item.qty <= 0);
  const decimalQuantity = isDecimalUnit(item.uom, item.uomType);
  const availableStock = item.qty != null && Number.isFinite(item.qty) ? Math.max(0, item.qty) : 1;
  const maxQty = decimalQuantity
    ? Math.floor((availableStock + Number.EPSILON) * 100) / 100
    : Math.floor(availableStock);
  const minQty = decimalQuantity ? (availableStock >= 0.5 ? 0.5 : 0) : (availableStock >= 1 ? 1 : 0);
  const defaultQty = getDefaultProductQty(item.uom, item.uomType, availableStock, inStock);
  const [qty, setQty] = useState(() => defaultQty);
  const [draftQty, setDraftQty] = useState(() => defaultQty);
  const [shared, setShared] = useState(false);

  // The storefront shows the barcode as the product title; item names stay internal.
  const codeLabel = `Code ${item.barcode}`;
  const printDescription = item.printDescription?.trim() || undefined;
  const availableQty = `${item.qty ?? 0} ${decimalQuantity ? "Mtr" : (item.uom?.trim() || "Pc(s)")}`;
  const canSubmit = inStock && !busy && draftQty > 0;
  const attrs = Object.entries(item.ecommerce?.attributes ?? {}).filter((e): e is [string, string] => Boolean(e[1]));
  const overview: ProductOverviewRow[] = [
    { label: "Product code", value: item.barcode },
    { label: "Category", value: categoryTitle },
    ...attrs.map(([key, value]) => ({ label: ATTR_LABELS[key] ?? key, value })),
    { label: "Group", value: item.group ? formatCategoryDisplayName(item.group) : "" },
    { label: "HSN", value: item.hsnCode ?? "" },
    { label: "Net quantity", value: item.qty != null ? `${item.qty} ${item.uom ?? "piece"}` : "" },
    { label: "Country of origin", value: COUNTRY_OF_ORIGIN },
  ].filter((row) => row.value.trim());
  const colour = item.ecommerce?.attributes?.color;
  const galleryContext = [categoryTitle, item.ecommerce?.productType, item.group].filter(Boolean).join(" ");
  const galleryUrls = buildGalleryImages(
    item.images?.[0] ?? item.image,
    [...(item.images?.slice(1) ?? []), ...(item.erpAdditionalImages ?? [])],
    item.image,
  );
  const gallery = galleryUrls.map((src, index) => ({
    src,
    label: galleryViewLabel(index, galleryContext),
  }));
  const wished = has(item.barcode);

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: codeLabel, url });
      else {
        await navigator.clipboard.writeText(url);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      }
    } catch {
      /* share sheet dismissed */
    }
  };
  const changeQuantity = (quantity: number) => { setQty(quantity); setDraftQty(quantity); };
  const addToBag = () => {
    setQty(draftQty);
    if (draftQty > 0) add.mutate({ sku: item.barcode, qty: draftQty });
  };
  const buyNow = () => {
    setQty(draftQty);
    if (draftQty > 0) {
      add.mutate({ sku: item.barcode, qty: draftQty }, { onSuccess: () => router.push("/checkout") });
    }
  };

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
          <ImageGallery
            images={gallery}
            alt={codeLabel}
            discount={discount}
            mainAspectClassName="aspect-[4/3] sm:aspect-[5/4]"
          />
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
              <h1 className="mt-3 font-display text-3xl font-semibold uppercase leading-tight tracking-wide text-olive sm:text-4xl">{codeLabel}</h1>
              {printDescription && <p className="mt-2 max-w-xl text-base leading-relaxed text-ink/80">{printDescription}</p>}
              <p className="mt-1 text-xs text-muted">Available Qty: {availableQty}</p>
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

          {attrs.length > 0 && (
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
              {item.uom && <p className="mt-0.5 text-sm text-muted">Sold as: {item.uom}</p>}
            </div>
            <div className="flex items-center gap-4 text-xs text-muted">
              <span className={cn("inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold", inStock ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>
                {inStock ? <><Check className="h-4 w-4" /> In Stock</> : "Unavailable"}
              </span>
              <span className="leading-relaxed">
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
            {inStock && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-olive">Quantity:</span>
                <QtyStepper
                  value={qty}
                  min={minQty}
                  step={decimalQuantity ? 0.5 : 1}
                  max={maxQty}
                  unit={item.uom}
                  unitType={item.uomType}
                  ariaLabel="Quantity"
                  onChange={changeQuantity}
                  onDraftChange={setDraftQty}
                  size="product"
                  showUnit
                />
              </div>
            )}
            <button type="button" disabled={!canSubmit} onClick={addToBag} className="inline-flex h-12 min-w-[170px] flex-1 items-center justify-center gap-2 rounded-full bg-maroon px-6 text-[15px] font-semibold text-white shadow-[0_10px_22px_-12px_rgba(219,26,114,0.9)] transition-all hover:-translate-y-0.5 hover:bg-gold disabled:translate-y-0 disabled:bg-[#e4e1e3] disabled:text-muted disabled:shadow-none">
              <ShoppingBag className="h-5 w-5" /> {inStock ? (busy ? "Adding…" : "Add to Bag") : "Unavailable"}
            </button>
            {inStock && (
              <button type="button" disabled={!canSubmit} onClick={buyNow} className="inline-flex h-12 min-w-[150px] flex-1 items-center justify-center gap-2 rounded-full border-2 border-maroon bg-white px-6 text-[15px] font-semibold text-maroon transition-colors hover:bg-maroon/5 disabled:opacity-60">
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
          <ProductInformationTabs
            productName={codeLabel}
            overview={overview}
            description={printDescription}
            material={item.ecommerce?.attributes?.fabric}
            silkMark={null}
            shipping={shippingReturns}
            customerCare={customerCare}
            deliveryCheck={
              <PincodeCheck sku={item.barcode} price={item.offerPrice ?? item.price} className="rounded-xl border border-line bg-ivory/60 p-4" />
            }
          />
        </div>
      </div>
    </div>
  );
}
