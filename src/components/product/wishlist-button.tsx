"use client";
import { Heart } from "lucide-react";
import { useWishlist } from "@/hooks/useCart";
import { cn } from "@/lib/utils";

export function WishlistButton({ sku, className, label }: { sku: string; className?: string; label?: boolean }) {
  const { has, toggle } = useWishlist();
  const on = has(sku);
  return (
    <button
      type="button"
      onClick={() => toggle.mutate(sku)}
      aria-pressed={on}
      aria-label={on ? "Remove from wishlist" : "Add to wishlist"}
      className={cn("inline-flex items-center gap-2 rounded-full bg-white/95 p-2 text-olive shadow-card transition-colors hover:text-maroon", label && "h-12 rounded-md border border-line px-5 text-sm font-semibold shadow-none hover:border-maroon", className)}
    >
      <Heart className={cn("h-[18px] w-[18px]", on && "fill-maroon text-maroon")} />
      {label && (on ? "Saved" : "Save")}
    </button>
  );
}
