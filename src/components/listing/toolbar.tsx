"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SORT_KEYS, type SortKey } from "@/domain/types";

const LABELS: Record<SortKey, string> = { featured: "Featured", newest: "Newest", price_asc: "Price: low to high", price_desc: "Price: high to low", best_selling: "Best selling" };

export function SortSelect() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const value = (sp.get("sort") as SortKey) ?? "featured";
  return (
    <label className="flex items-center gap-2 text-sm text-muted">
      Sort by
      <select
        value={value}
        onChange={(e) => {
          const next = new URLSearchParams(sp.toString());
          next.set("sort", e.target.value);
          next.delete("page");
          router.push(`${pathname}?${next.toString()}`, { scroll: false });
        }}
        className="h-9 rounded-md border border-line bg-white px-3 text-sm font-medium text-ink focus:border-maroon focus:outline-none"
      >
        {SORT_KEYS.map((k) => (
          <option key={k} value={k}>{LABELS[k]}</option>
        ))}
      </select>
    </label>
  );
}

export function Pagination({ page, pages }: { page: number; pages: number }) {
  const sp = useSearchParams();
  const pathname = usePathname();
  if (pages <= 1) return null;
  const href = (p: number) => {
    const next = new URLSearchParams(sp.toString());
    next.set("page", String(p));
    return `${pathname}?${next.toString()}`;
  };
  const window = Array.from({ length: pages }, (_, i) => i + 1).filter((p) => p === 1 || p === pages || Math.abs(p - page) <= 2);
  return (
    <nav className="mt-10 flex items-center justify-center gap-1.5 text-sm" aria-label="Pagination">
      {page > 1 && <a href={href(page - 1)} aria-label="Previous page" className="flex h-9 w-9 items-center justify-center rounded-md border border-line bg-white hover:border-maroon hover:text-maroon">‹</a>}
      {window.map((p, i) => (
        <span key={p} className="flex items-center gap-1">
          {i > 0 && window[i - 1] !== p - 1 && <span className="px-1 text-muted">…</span>}
          <a href={href(p)} aria-current={p === page ? "page" : undefined} className={`flex h-9 min-w-9 items-center justify-center rounded-md border px-2 font-medium ${p === page ? "border-maroon bg-maroon text-white" : "border-line bg-white hover:border-maroon hover:text-maroon"}`}>{p}</a>
        </span>
      ))}
      {page < pages && <a href={href(page + 1)} aria-label="Next page" className="flex h-9 w-9 items-center justify-center rounded-md border border-line bg-white hover:border-maroon hover:text-maroon">›</a>}
    </nav>
  );
}
