"use client";

import { useQuery } from "@tanstack/react-query";
import type { ProductCard } from "@/domain/types";
import { api } from "@/hooks/api";
import { normalizeBarcode } from "@/lib/barcode-search";
import { ProductGrid } from "@/components/product/product-grid";

interface RelatedSearchProductsProps {
  query: string;
  excludeSkus: string[];
  initialItems: ProductCard[];
  limit?: number;
}

/**
 * Displays dynamically matched related product-code recommendations directly below
 * the main search result, refreshing cleanly whenever the search query changes.
 */
export function RelatedSearchProducts({
  query,
  excludeSkus,
  initialItems,
  limit = 24,
}: RelatedSearchProductsProps) {
  const normalizedQuery = normalizeBarcode(query);
  const normalizedExcludes = Array.from(
    new Set(excludeSkus.map((sku) => normalizeBarcode(sku)).filter(Boolean)),
  ).sort();
  const excludeParam = normalizedExcludes.join(",");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["related-search", normalizedQuery, excludeParam, limit],
    queryFn: async () => {
      const params = new URLSearchParams({ q: query, limit: String(limit) });
      if (excludeParam) params.set("exclude", excludeParam);
      const res = await api<ProductCard[]>(`/api/v1/products/related-search?${params.toString()}`);
      return res.data;
    },
    enabled: Boolean(normalizedQuery),
    initialData: initialItems,
    staleTime: 60_000,
    retry: 1,
  });

  const items = data ?? initialItems;

  if (isLoading && items.length === 0) {
    return (
      <section aria-labelledby="related-for-your-search" className="mt-12 border-t border-line pt-10">
        <div className="mb-6">
          <h2 id="related-for-your-search" className="font-display text-2xl font-semibold tracking-tight text-olive sm:text-3xl">
            Related For Your Search
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4" aria-busy="true">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="aspect-[4/5] animate-pulse rounded-xl border border-line bg-line/40" />
          ))}
        </div>
      </section>
    );
  }

  if (isError && items.length === 0) {
    return (
      <section aria-labelledby="related-for-your-search" className="mt-12 border-t border-line pt-10">
        <h2 id="related-for-your-search" className="font-display text-2xl font-semibold tracking-tight text-olive sm:text-3xl">
          Related For Your Search
        </h2>
        <p role="status" className="mt-3 text-sm text-muted">
          Unable to load related products right now.
        </p>
      </section>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="related-for-your-search" className="mt-12 border-t border-line pt-10">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="related-for-your-search" className="font-display text-2xl font-semibold tracking-tight text-olive sm:text-3xl">
          Related For Your Search
        </h2>
        <p className="text-sm text-muted">
          <span className="font-medium text-ink">{items.length}</span>{" "}
          {items.length === 1 ? "product" : "products"}
        </p>
      </div>
      <ProductGrid items={items} cols={4} />
    </section>
  );
}
