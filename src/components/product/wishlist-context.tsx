"use client";

import { useState } from "react";
import type { BarcodeProduct, ProductCard as ProductCardData } from "@/domain/types";
import { BarcodeProductGrid } from "@/components/product/barcode-product-grid";
import { ProductGrid } from "@/components/product/product-grid";
import { Empty } from "@/components/ui/empty";

export function WishlistContent({
  products,
  barcodeItems,
}: {
  products: ProductCardData[];
  barcodeItems: BarcodeProduct[];
}) {
  const [visibleProducts] = useState(() => products);
  const [visibleBarcodeItems] = useState(() => barcodeItems);

  return (
    <div className="mt-8 space-y-10">
      {visibleProducts.length > 0 && <ProductGrid items={visibleProducts} />}
      {visibleBarcodeItems.length > 0 && <BarcodeProductGrid items={visibleBarcodeItems} />}
      {!visibleProducts.length && !visibleBarcodeItems.length && (
        <Empty title="Nothing saved yet" text="Tap the heart on any product to keep it here." href="/collections/sarees" />
      )}
    </div>
  );
}
