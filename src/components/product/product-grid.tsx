import type { ProductCard as Card } from "@/domain/types";
import { ProductCard } from "./product-card";

export function ProductGrid({ items, cols = 4, priorityCount = 0 }: { items: Card[]; cols?: 3 | 4 | 5; priorityCount?: number }) {
  const grid = cols === 3 ? "lg:grid-cols-3" : cols === 5 ? "lg:grid-cols-5" : "lg:grid-cols-4";
  return (
    <div className={`grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 ${grid}`}>
      {items.map((p, i) => (
        <ProductCard key={p.id} p={p} priority={i < priorityCount} />
      ))}
    </div>
  );
}
