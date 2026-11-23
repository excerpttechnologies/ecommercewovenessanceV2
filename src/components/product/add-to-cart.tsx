"use client";
import { useState } from "react";
import { WhatsAppIcon } from "@/components/layout/whatsapp-float";
import type { Product } from "@/domain/types";
import { useCart } from "@/hooks/useCart";
import { Button } from "@/components/ui/button";
import { QtyStepper } from "@/components/cart/qty-stepper";
import { isDecimalUnit } from "@/lib/product-quantity";
import { WishlistButton } from "./wishlist-button";

export function AddToCart({ product, whatsapp, siteUrl }: { product: Product; whatsapp?: string | null; siteUrl: string }) {
  const { add } = useCart();
  const isMtr = isDecimalUnit(product.uom, product.uomType);
  const minQty = isMtr ? Math.min(0.5, product.stock.qty) : 1;
  const initialQty = product.stock.qty > 0 ? (isMtr ? (product.stock.qty >= 1 ? 1 : product.stock.qty) : 1) : 0;
  const [qty, setQty] = useState(initialQty);
  const [draftQty, setDraftQty] = useState(initialQty);
  const out = product.stock.qty <= 0;
  const waText = encodeURIComponent(`Hi, I'm interested in Code ${product.sku} ${siteUrl}/products/${product.slug}`);
  return (
    <div className="space-y-4">
      {!out && (
        <div className="flex items-center gap-4">
          <span className="text-xs uppercase tracking-wider text-muted">Quantity:</span>
          <QtyStepper
            value={qty}
            min={minQty}
            step={isMtr ? 0.5 : 1}
            max={product.stock.qty}
            unit={product.uom}
            unitType={product.uomType}
            ariaLabel={`Quantity for CODE ${product.sku}`}
            onChange={setQty}
            onDraftChange={setDraftQty}
            size="md"
            showUnit
          />
        </div>
      )}
      <div className="flex gap-2">
        <Button
          size="lg"
          className="flex-1"
          disabled={out || draftQty <= 0}
          loading={add.isPending}
          onClick={() => {
            const finalQty = draftQty > 0 ? draftQty : minQty;
            setQty(finalQty);
            add.mutate({ sku: product.sku, qty: finalQty });
          }}
        >
          {out ? "Sold out" : "Add to bag"}
        </Button>
        <WishlistButton sku={product.sku} className="h-12 w-12 justify-center rounded-lg border border-line bg-white shadow-none" />
      </div>
      {add.isError && <p className="text-xs text-red-700">{(add.error as Error).message}</p>}
      {whatsapp && (
        <a href={`https://wa.me/${whatsapp.replace(/\D/g, "")}?text=${waText}`} target="_blank" rel="noreferrer" className="flex h-12 items-center justify-center gap-2 rounded-lg border border-[#25D366] text-sm font-medium uppercase tracking-[0.12em] text-[#128C7E] hover:bg-[#25D366]/10">
          <WhatsAppIcon className="h-4 w-4" /> Enquire on WhatsApp
        </a>
      )}
    </div>
  );
}
