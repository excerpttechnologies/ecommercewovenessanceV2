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
      className={cn("inline-flex items-center gap-2 rounded-full bg-ivory/90 p-2 text-olive shadow-sm transition-colors hover:text-maroon", label && "rounded-sm border border-line px-4 py-2 text-xs uppercase tracking-widest", className)}
    >
      <Heart className={cn("h-4 w-4", on && "fill-maroon text-maroon")} />
      {label && (on ? "Saved" : "Save")}
    </button>
  );
}
