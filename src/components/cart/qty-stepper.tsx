"use client";
import { Minus, Plus, Trash2 } from "lucide-react";

export function QtyStepper({ value, max = 20, min = 0, onChange, size = "sm" }: { value: number; max?: number; min?: number; onChange: (v: number) => void; size?: "sm" | "md" }) {
  const h = size === "sm" ? "h-8" : "h-11";
  return (
    <div className={`inline-flex items-center rounded-sm border border-line bg-white ${h}`}>
      <button type="button" aria-label="Decrease" onClick={() => onChange(Math.max(min, value - 1))} className="flex h-full w-8 items-center justify-center text-muted hover:text-maroon">
        {value <= 1 && min === 0 ? <Trash2 className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
      </button>
      <span className="w-8 text-center text-sm tabular-nums">{value}</span>
      <button type="button" aria-label="Increase" disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))} className="flex h-full w-8 items-center justify-center text-muted hover:text-olive disabled:opacity-40">
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
