"use client";
import { formatMoney } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { useUi } from "@/store/ui";

export function Price({ amount, mrp, className, size = "md" }: { amount: number; mrp?: number; className?: string; size?: "sm" | "md" | "lg" }) {
  const currency = useUi((s) => s.currency);
  const hasDiscount = mrp != null && mrp > amount;
  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-2", className)}>
      <span className={cn("font-medium text-maroon", size === "sm" && "text-sm", size === "md" && "text-base", size === "lg" && "text-2xl")}>{formatMoney(amount, currency)}</span>
      {hasDiscount && (
        <>
          <span className={cn("text-muted line-through", size === "lg" ? "text-base" : "text-xs")}>{formatMoney(mrp, currency)}</span>
          <span className="text-xs font-medium text-olive">({Math.round(((mrp - amount) / mrp) * 100)}% off)</span>
        </>
      )}
    </span>
  );
}
