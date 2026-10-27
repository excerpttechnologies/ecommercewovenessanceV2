"use client";
import Image from "next/image";
import Link from "next/link";
import { Image as ImageIcon, ShoppingBag } from "lucide-react";
import { useState } from "react";
import type { BarcodeProduct } from "@/domain/types";
import { useCart } from "@/hooks/useCart";
import { cn, formatINR } from "@/lib/utils";
import { swatchColor } from "@/lib/colour";
import { barcodeProductPath } from "@/lib/paths";
import { WishlistButton } from "./wishlist-button";

function BarcodeProductImage({ src, alt, sizes }: { src?: string; alt: string; sizes: string }) {
  const [imageFailed, setImageFailed] = useState(!src);

  if (imageFailed || !src) {
    return (
      <div role="img" aria-label={`Photo unavailable for ${alt}`} className="absolute inset-0 flex items-end justify-center bg-[#fbe3ea] bg-[url('/placeholders/photo-unavailable.webp')] bg-cover bg-center pb-[14%]">
        <span className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wide text-maroon sm:gap-2 sm:px-4 sm:py-1.5 sm:text-xs shadow-[0_6px_16px_-8px_rgba(219,26,114,0.5)]">
          <ImageIcon className="h-3 w-3 sm:h-4 sm:w-4" /> Photo unavailable
        </span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      unoptimized
      sizes={sizes}
      className="object-cover transition-transform duration-500 group-hover:scale-105"
      onError={() => setImageFailed(true)}
    />
  );
}

type Layout = "grid" | "list";

/**
 * ERP barcode products as shop cards. `detailView` renders the single-product layout of ?barcode=;
 * `wide` fits five cards per row on desktop (homepage rows, which have no filter column).
 */
export function BarcodeProductGrid({ items, collectionSlug, detailView = false, layout = "grid", wide = false }: { items: BarcodeProduct[]; collectionSlug?: string; detailView?: boolean; layout?: Layout; wide?: boolean }) {
  const { add } = useCart();
  if (!items.length) return null;
  const list = !detailView && layout === "list";

  return (
    <>
      {add.isError && <p role="alert" className="mb-4 text-sm text-red-700">{(add.error as Error).message}</p>}
      <div className={detailView ? "mx-auto grid max-w-5xl grid-cols-1 gap-8" : list ? "grid grid-cols-1 gap-4 xl:grid-cols-2" : wide ? "grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" : "grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3 xl:grid-cols-4 xl:gap-4"}>
        {items.map((item) => {
          const price = item.price ?? 0;
          const sellingPrice = item.offerPrice && item.offerPrice < price ? item.offerPrice : price;
          const discount = sellingPrice < price && price > 0 ? Math.round(((price - sellingPrice) / price) * 100) : 0;
          const outOfStock = item.status !== "IN_STOCK" || (item.qty != null && item.qty <= 0);
          const productTitle = item.ecommerce?.displayName || item.itemName || item.name;
          const ecommerceDescription = item.ecommerce?.description;
          const printDescription = item.printDescription;
          const subtitle = [ecommerceDescription, printDescription].find((d) => d && d !== productTitle);
          const colour = item.ecommerce?.attributes?.color;
          const classifications = Object.entries(item.ecommerce?.attributes ?? {})
            .filter((entry): entry is [string, string] => Boolean(entry[1]));
          const detailHref = collectionSlug
            ? barcodeProductPath(collectionSlug, item.barcode)
            : undefined;
          const adding = add.isPending && add.variables?.sku === item.barcode;
          const sizes = detailView ? "(min-width: 600px) 50vw, 100vw" : list ? "260px" : "(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 480px) 50vw, 100vw";

          const image = (
            <div className={cn("relative overflow-hidden rounded-xl bg-line", detailView ? "aspect-[4/5]" : list ? "aspect-[4/3] w-40 shrink-0 sm:w-64" : "aspect-[3/2]")}>
              {detailHref ? (
                <Link href={detailHref} aria-label={`View ${productTitle}`} className="absolute inset-0 block">
                  <BarcodeProductImage src={item.image} alt={productTitle} sizes={sizes} />
                </Link>
              ) : <BarcodeProductImage src={item.image} alt={productTitle} sizes={sizes} />}
              {discount > 0 && <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-maroon px-2 py-0.5 text-[10px] font-semibold sm:left-3 sm:top-3 sm:px-3 sm:py-0.5 sm:text-[11px] text-white shadow-sm">{discount}% OFF</span>}
              <div className="absolute right-2 top-2 sm:right-3 sm:top-3"><WishlistButton sku={item.barcode} /></div>
              {outOfStock && <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/60 py-1.5 text-center text-[10px] font-semibold sm:py-2.5 sm:text-xs uppercase tracking-wider text-white backdrop-blur-[2px]">Unavailable</span>}
            </div>
          );

          const priceRow = price > 0 && (
            <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 sm:gap-x-2.5">
              {discount > 0 && <span className={cn("text-muted line-through", detailView ? "text-lg" : "text-[11px] sm:text-[13px]")}>{formatINR(price)}</span>}
              <span className={cn("font-bold text-maroon", detailView ? "text-3xl" : "text-sm sm:text-base")}>{formatINR(sellingPrice)}</span>
              {discount > 0 && <span className="rounded-md bg-maroon/10 px-1.5 py-0.5 text-[10px] font-semibold sm:rounded-lg sm:px-2 sm:py-0.5 sm:text-[11px] text-maroon">{discount}% off</span>}
            </p>
          );

          const addButton = (
            <button
              type="button"
              disabled={outOfStock || adding}
              onClick={() => add.mutate({ sku: item.barcode })}
              className={cn(
                "inline-flex w-full shrink-0 items-center justify-center gap-2.5 rounded-full bg-maroon px-5 font-semibold text-white shadow-[0_10px_22px_-12px_rgba(219,26,114,0.9)] transition-all hover:-translate-y-0.5 hover:bg-gold active:translate-y-0 disabled:cursor-not-allowed disabled:translate-y-0 disabled:bg-[#e4e1e3] disabled:text-muted disabled:shadow-none",
                detailView ? "mt-2 h-12 text-sm" : "h-8 gap-1.5 px-2 text-[11px] sm:h-9 sm:gap-2 sm:px-4 sm:text-xs",
              )}
            >
              <ShoppingBag className="h-4 w-4" /> {outOfStock ? "Unavailable" : adding ? "Adding…" : "Add to Bag"}
            </button>
          );

          if (detailView) {
            return (
              <article key={item.id} className="grid gap-6 min-[600px]:grid-cols-2">
                {image}
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-wider text-muted">Barcode {item.barcode}</p>
                  <h1 className="font-display text-3xl font-semibold sm:text-4xl">{productTitle}</h1>
                  {ecommerceDescription && ecommerceDescription !== productTitle && <p className="text-[15px] leading-relaxed text-ink/80">{ecommerceDescription}</p>}
                  {printDescription && printDescription !== productTitle && printDescription !== ecommerceDescription && <p className="text-sm text-muted">{printDescription}</p>}
                  {classifications.length > 0 && (
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-xl border border-line bg-white p-4 text-sm">
                      {classifications.map(([key, value]) => (
                        <div key={key} className="contents">
                          <dt className="capitalize text-muted">{key === "color" ? "Colour" : key}</dt>
                          <dd className="flex items-center gap-2 text-olive">
                            {key === "color" && <span className="h-3.5 w-3.5 rounded-full border border-line" style={{ background: swatchColor(value) }} />}
                            {value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  {item.ecommerce?.itemCode && <p className="text-xs uppercase tracking-wider text-muted">E-com {item.ecommerce.itemCode}</p>}
                  {priceRow}
                  {addButton}
                </div>
              </article>
            );
          }

          return (
            <article key={item.id} data-reveal className={cn("group flex min-w-0 overflow-hidden rounded-xl bg-white/90 shadow-[0_10px_30px_-18px_rgba(122,18,56,0.35)] ring-1 ring-black/[0.04] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_-18px_rgba(122,18,56,0.45)]", list ? "flex-row p-3" : "flex-col")}>
              {image}
              <div className="flex min-w-0 flex-1 flex-col px-2.5 pb-2.5 pt-2 sm:px-3 sm:pb-3 sm:pt-2.5">
                <p className="text-[9px] uppercase tracking-wide text-muted sm:text-[10px]">Barcode {item.barcode}</p>
                {detailHref ? (
                  <Link href={detailHref} className="mt-0.5 line-clamp-1 font-display text-sm font-semibold uppercase sm:text-base leading-tight text-olive hover:text-maroon">{productTitle}</Link>
                ) : (
                  <p className="mt-0.5 line-clamp-1 font-display text-sm font-semibold uppercase sm:text-base leading-tight text-olive">{productTitle}</p>
                )}
                {subtitle ? <p className="mt-0.5 line-clamp-1 text-[10px] uppercase text-muted sm:text-[11px]">{subtitle}</p> : <p className="mt-0.5 h-3.5 sm:h-4" aria-hidden />}
                {list && classifications.length > 0 && (
                  <p className="mt-2 flex flex-wrap items-center gap-x-1.5 text-xs text-muted">
                    {colour && <span className="h-3.5 w-3.5 rounded-full ring-1 ring-black/10" style={{ background: swatchColor(colour) }} />}
                    {classifications.map(([key, value]) => `${key === "color" ? "colour" : key}: ${value}`).join(" · ")}
                  </p>
                )}
                <div className="mt-1.5 sm:mt-2">{priceRow}</div>
                <span aria-hidden className="flex-1" />
                <div className="mt-2.5 sm:mt-3">{addButton}</div>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
