"use client";
import { ChevronDown, LayoutGrid, List } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BARCODE_SORTS, type BarcodeSort } from "@/domain/types";
import { cn } from "@/lib/utils";

const SORT_LABELS: Record<BarcodeSort, string> = { newest: "Newest", price_asc: "Price: Low to High", price_desc: "Price: High to Low" };

function useParamSetter() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  return {
    sp,
    set: (key: string, value: string | null, resetPage = true) => {
      const next = new URLSearchParams(sp.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      if (resetPage) next.delete("page");
      router.push(`${pathname}${next.size ? `?${next.toString()}` : ""}`, { scroll: false });
    },
  };
}

export function BarcodeSortSelect() {
  const { sp, set } = useParamSetter();
  const raw = sp.get("sort");
  const value: BarcodeSort = BARCODE_SORTS.includes(raw as BarcodeSort) ? (raw as BarcodeSort) : "newest";
  return (
    <label className="relative flex h-9 min-w-[190px] items-center rounded-lg border border-line bg-white pl-3.5 pr-8 text-[13px] text-olive focus-within:border-maroon">
      <span className="mr-1 shrink-0 text-olive/80">Sort by:</span>
      <select value={value} onChange={(e) => set("sort", e.target.value === "newest" ? null : e.target.value)} aria-label="Sort products" className="w-full cursor-pointer appearance-none bg-transparent font-medium focus:outline-none">
        {BARCODE_SORTS.map((k) => (
          <option key={k} value={k}>{SORT_LABELS[k]}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-muted" />
    </label>
  );
}

export function ViewToggle() {
  const { sp, set } = useParamSetter();
  const list = sp.get("view") === "list";
  const base = "flex h-9 w-9 items-center justify-center rounded-lg transition-colors";
  return (
    <div className="flex rounded-lg bg-[#f1eeee] p-0" role="group" aria-label="Layout">
      <button type="button" aria-pressed={!list} aria-label="Grid view" onClick={() => set("view", null, false)} className={cn(base, !list ? "bg-maroon text-white shadow-[0_6px_16px_-8px_rgba(219,26,114,0.7)]" : "text-olive hover:text-maroon")}>
        <LayoutGrid className="h-4 w-4" />
      </button>
      <button type="button" aria-pressed={list} aria-label="List view" onClick={() => set("view", "list", false)} className={cn(base, list ? "bg-maroon text-white shadow-[0_6px_16px_-8px_rgba(219,26,114,0.7)]" : "text-olive hover:text-maroon")}>
        <List className="h-4 w-4" />
      </button>
    </div>
  );
}
