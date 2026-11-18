"use client";

import { ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  sku: string;
  maxQty?: number;
  uom?: string;
  onAdd: (qty: number) => void;
  disabled?: boolean;
  adding?: boolean;
}

/**
 * Small, secondary "Available Qty" line + "Add to Bag" button for product cards.
 * There is no plus/minus control: stock is read-only and Add to Bag adds one unit.
 */
export function ProductCardQuantitySelector({
  maxQty,
  uom,
  onAdd,
  disabled = false,
  adding = false,
}: Props) {
  const available = Math.max(0, maxQty ?? 0);
  const unit = uom?.trim() || "Pc(s)";

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[11px] leading-tight text-muted sm:text-xs">
        Available Qty: {available} {unit}
      </p>

      <button
        type="button"
        disabled={disabled || adding || available <= 0}
        onClick={() => onAdd(1)}
        className={cn(
          "inline-flex w-full shrink-0 items-center justify-center gap-1.5 rounded-full bg-maroon px-2 font-semibold text-white shadow-[0_10px_22px_-12px_rgba(219,26,114,0.9)] transition-all",
          "hover:-translate-y-0.5 hover:bg-gold active:translate-y-0",
          "disabled:cursor-not-allowed disabled:translate-y-0 disabled:bg-[#e4e1e3] disabled:text-muted disabled:shadow-none",
          "h-8 text-[11px] sm:h-9 sm:gap-2 sm:px-4 sm:text-xs",
        )}
      >
        <ShoppingBag className="h-4 w-4 shrink-0" />
        {disabled ? "Unavailable" : adding ? "Adding…" : "Add to Bag"}
      </button>
    </div>
  );
}
