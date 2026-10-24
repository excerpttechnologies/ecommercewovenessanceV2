"use client";
import Image from "next/image";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import type { ProductCard as Card } from "@/domain/types";
import { useCart } from "@/hooks/useCart";
import { isRemoteImageSource } from "@/lib/utils";
import { ComingSoonImage } from "@/components/ui/coming-soon-image";
import { Price } from "@/components/ui/price";
import { WishlistButton } from "./wishlist-button";

export function ProductCard({ p, priority }: { p: Card; priority?: boolean }) {
  const { add } = useCart();
  const out = p.stock.status === "out_of_stock";
  const [img1, img2] = p.images;
  const showErpImages = p.source === "erp";
  const productHref = !(showErpImages && img1)
    ? `/products/${p.slug}?comingSoon=1&name=${encodeURIComponent(p.name)}`
    : `/products/${p.slug}`;
  return (
    <article className="group relative">
      <Link href={productHref} className="block">
        <div className="relative aspect-[3/4] overflow-hidden rounded-sm bg-line">
          {showErpImages && img1 ? <Image src={img1} alt={p.name} fill priority={priority} unoptimized={isRemoteImageSource(img1)} sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw" className={`object-cover transition-all duration-700 ${img2 ? "group-hover:opacity-0" : "group-hover:scale-105"}`} /> : <ComingSoonImage className="absolute inset-0" />}
          {showErpImages && img2 && <Image src={img2} alt="" fill unoptimized={isRemoteImageSource(img2)} sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw" className="object-cover opacity-0 transition-opacity duration-700 group-hover:opacity-100" />}
          <div className="absolute left-2 top-2 flex flex-col gap-1">
            {p.isNewArrival && <span className="rounded-sm bg-olive px-2 py-0.5 text-[10px] uppercase tracking-widest text-ivory">New</span>}
            {p.pricing.discountPercent > 0 && <span className="rounded-sm bg-ivory/90 px-2 py-0.5 text-[10px] uppercase tracking-widest text-maroon">{p.pricing.discountPercent}% off</span>}
            {p.stock.status === "low_stock" && <span className="rounded-sm bg-gold px-2 py-0.5 text-[10px] uppercase tracking-widest text-ivory">Only {p.stock.qty} left</span>}
          </div>
          {out && <div className="absolute inset-x-0 bottom-0 bg-ink/70 py-1.5 text-center text-[11px] uppercase tracking-widest text-ivory">Sold out</div>}
        </div>
      </Link>
      <div className="absolute right-2 top-2">
        <WishlistButton sku={p.sku} />
      </div>
      <div className="mt-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link href={productHref} className="line-clamp-2 text-sm leading-snug hover:text-maroon">{p.web?.cardTitle || p.name}</Link>
          <p className="mt-0.5 text-xs text-muted">{p.web?.cardDescription || [p.fabric, p.color].filter(Boolean).join(" · ")}</p>
          <Price amount={p.pricing.sellingPrice} mrp={p.pricing.mrp} size="sm" className="mt-1" />
        </div>
        {!out && (
          <button onClick={() => add.mutate({ sku: p.sku })} aria-label="Add to bag" className="mt-0.5 shrink-0 rounded-full border border-line p-2 text-olive opacity-0 transition-opacity hover:bg-olive hover:text-ivory group-hover:opacity-100 focus:opacity-100 md:opacity-0 max-md:opacity-100">
            <ShoppingBag className="h-4 w-4" />
          </button>
        )}
      </div>
    </article>
  );
}
