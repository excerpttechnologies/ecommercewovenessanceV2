import type { Metadata } from "next";
import { getWishlistSkus } from "@/lib/cart-server";
import { getBarcodeLabels, getMasterData } from "@/repositories";
import { toProductCard } from "@/lib/erp-mapping";
import { WishlistContent } from "@/components/product/wishlist-context";

export const metadata: Metadata = { title: "Wishlist", robots: { index: false } };

export default async function WishlistPage() {
  const skus = await getWishlistSkus();
  const products = skus.length ? (await getMasterData().products.getBySkus(skus)).filter((product) => product.stock.qty > 0) : [];
  const regularSkus = new Set(products.map((product) => product.sku));
  const barcodeItems = skus.length
    ? (await getBarcodeLabels().getByBarcodes(skus.filter((sku) => !regularSkus.has(sku))))
      .filter((item) => item.status === "IN_STOCK" && (item.qty == null || item.qty > 0))
    : [];
  return (
    <div className="mx-auto max-w-site px-4 py-8 sm:px-6">
      <h1 className="text-4xl font-bold">Wishlist</h1>
      <WishlistContent products={products.map(toProductCard)} barcodeItems={barcodeItems} />
    </div>
  );
}
