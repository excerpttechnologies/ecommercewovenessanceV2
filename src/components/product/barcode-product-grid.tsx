"use client";
import Image from "next/image";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useState } from "react";
import type { BarcodeProduct } from "@/domain/types";
import { useCart } from "@/hooks/useCart";
import { formatINR } from "@/lib/utils";
import { WishlistButton } from "./wishlist-button";

function BarcodeProductImage({ src, alt }: { src?: string; alt: string }) {
  const [imageFailed, setImageFailed] = useState(!src);

  if (imageFailed || !src) {
    return (
      <div role="img" aria-label={`Photo unavailable for ${alt}`} className="absolute inset-0 flex items-center justify-center bg-ivory">
        <span className="border border-line px-3 py-2 text-center text-[10px] uppercase tracking-widest text-muted">Photo unavailable</span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      unoptimized
      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
      className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
      onError={() => setImageFailed(true)}
    />
  );
}

export function BarcodeProductGrid({ items, collectionSlug, detailView = false }: { items: BarcodeProduct[]; collectionSlug?: string; detailView?: boolean }) {
  const { add } = useCart();
  if (!items.length) return null;

  return (
    <>
      {add.isError && <p role="alert" className="mb-4 text-sm text-red-700">{(add.error as Error).message}</p>}
      <div className={detailView ? "mx-auto grid max-w-5xl grid-cols-1 gap-8" : "grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4"}>
        {items.map((item) => {
          const price = item.price ?? 0;
          const sellingPrice = item.offerPrice && item.offerPrice < price ? item.offerPrice : price;
          const outOfStock = item.status !== "IN_STOCK" || (item.qty != null && item.qty <= 0);
          const productTitle = item.ecommerce?.displayName || item.itemName || item.name;
          const ecommerceDescription = item.ecommerce?.description;
          const printDescription = item.printDescription;
          const classifications = Object.entries(item.ecommerce?.attributes ?? {})
            .filter((entry): entry is [string, string] => Boolean(entry[1]));
          const detailHref = collectionSlug
            ? `/collections/${collectionSlug}?${new URLSearchParams({ barcode: item.barcode }).toString()}`
            : undefined;
          return (
            <article key={item.id} className={`group min-w-0 ${detailView ? "grid gap-6 min-[600px]:grid-cols-2" : ""}`}>
              <div className="relative aspect-[3/4] overflow-hidden rounded-sm bg-line">
                {detailHref ? (
                  <Link href={detailHref} aria-label={`View ${productTitle}`} className="absolute inset-0 block">
                    <BarcodeProductImage src={item.image} alt={productTitle} />
                  </Link>
                ) : <BarcodeProductImage src={item.image} alt={productTitle} />}
                <div className="absolute right-2 top-2"><WishlistButton sku={item.barcode} /></div>
                {outOfStock && <span className="absolute inset-x-0 bottom-0 bg-ink/75 py-2 text-center text-[11px] uppercase tracking-widest text-ivory">Unavailable</span>}
              </div>
              <div className={detailView ? "space-y-3" : "mt-3"}>
                <p className="text-xs uppercase tracking-widest text-muted">Barcode {item.barcode}</p>
                <p className="line-clamp-2 min-h-8 text-sm font-medium text-ink">{productTitle}</p>
                {ecommerceDescription && ecommerceDescription !== productTitle && <p className="line-clamp-3 text-sm text-muted">{ecommerceDescription}</p>}
                {printDescription && printDescription !== productTitle && printDescription !== ecommerceDescription && (
                  <p className="line-clamp-2 text-xs text-muted">{printDescription}</p>
                )}
                {classifications.length > 0 && (
                  <p className="text-xs text-muted">
                    {classifications.map(([key, value]) => `${key}: ${value}`).join(" · ")}
                  </p>
                )}
                {item.ecommerce?.itemCode && <p className="text-xs uppercase tracking-widest text-muted">E-com {item.ecommerce.itemCode}</p>}
                {price > 0 && <p className="mt-1 text-sm font-medium">{formatINR(sellingPrice)}{sellingPrice < price && <span className="ml-2 text-xs text-muted line-through">{formatINR(price)}</span>}</p>}
                <button type="button" disabled={outOfStock || add.isPending} onClick={() => add.mutate({ sku: item.barcode })} className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-sm bg-olive px-3 text-xs font-medium uppercase tracking-widest text-ivory transition-colors hover:bg-maroon disabled:cursor-not-allowed disabled:opacity-50">
                  <ShoppingBag className="h-4 w-4" /> {outOfStock ? "Unavailable" : "Add to bag"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}