"use client";
import { useState } from "react";
import { MessageCircle } from "lucide-react";
import type { Product } from "@/domain/types";
import { useCart } from "@/hooks/useCart";
import { Button } from "@/components/ui/button";
import { QtyStepper } from "@/components/cart/qty-stepper";
import { WishlistButton } from "./wishlist-button";

export function AddToCart({ product, whatsapp, siteUrl }: { product: Product; whatsapp?: string | null; siteUrl: string }) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const out = product.stock.qty <= 0;
  const waText = encodeURIComponent(`Hi, I'm interested in "${product.name}" (SKU ${product.sku}) ${siteUrl}/products/${product.slug}`);
  return (
    <div className="space-y-4">
      {!out && (
        <div className="flex items-center gap-4">
          <span className="text-xs uppercase tracking-widest text-muted">Qty</span>
          <QtyStepper value={qty} min={1} max={Math.min(product.stock.qty, 10)} onChange={setQty} size="md" />
        </div>
      )}
      <div className="flex gap-2">
        <Button size="lg" className="flex-1" disabled={out} loading={add.isPending} onClick={() => add.mutate({ sku: product.sku, qty })}>
          {out ? "Sold out" : "Add to bag"}
        </Button>
        <WishlistButton sku={product.sku} className="h-12 w-12 justify-center rounded-sm border border-line bg-white shadow-none" />
      </div>
      {add.isError && <p className="text-xs text-red-700">{(add.error as Error).message}</p>}
      {whatsapp && (
        <a href={`https://wa.me/${whatsapp.replace(/\D/g, "")}?text=${waText}`} target="_blank" rel="noreferrer" className="flex h-12 items-center justify-center gap-2 rounded-sm border border-[#25D366] text-sm font-medium uppercase tracking-[0.12em] text-[#128C7E] hover:bg-[#25D366]/10">
          <MessageCircle className="h-4 w-4" /> Enquire on WhatsApp
        </a>
      )}
    </div>
  );
}
