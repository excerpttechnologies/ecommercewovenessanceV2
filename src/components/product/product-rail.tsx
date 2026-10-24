import type { ProductCard as Card } from "@/domain/types";
import { ProductCard } from "./product-card";

/** Horizontal scroll on mobile, grid on desktop. */
export function ProductRail({ items }: { items: Card[] }) {
  return (
    <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-4">
      {items.map((p) => (
        <div key={p.id} className="w-[62vw] shrink-0 snap-start sm:w-auto">
          <ProductCard p={p} />
        </div>
      ))}
    </div>
  );
}
