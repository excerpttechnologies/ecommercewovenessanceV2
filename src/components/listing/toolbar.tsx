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
    <label className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted">
      Sort
      <select
        value={value}
        onChange={(e) => {
          const next = new URLSearchParams(sp.toString());
          next.set("sort", e.target.value);
          next.delete("page");
          router.push(`${pathname}?${next.toString()}`, { scroll: false });
        }}
        className="rounded-sm border border-line bg-white px-2 py-1.5 text-xs normal-case tracking-normal text-ink"
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
    <nav className="mt-10 flex items-center justify-center gap-1 text-sm" aria-label="Pagination">
      {page > 1 && <a href={href(page - 1)} className="rounded-sm border border-line px-3 py-1.5 hover:bg-olive/5">‹</a>}
      {window.map((p, i) => (
        <span key={p} className="flex items-center gap-1">
          {i > 0 && window[i - 1] !== p - 1 && <span className="px-1 text-muted">…</span>}
          <a href={href(p)} aria-current={p === page ? "page" : undefined} className={`rounded-sm border px-3 py-1.5 ${p === page ? "border-olive bg-olive text-ivory" : "border-line hover:bg-olive/5"}`}>{p}</a>
        </span>
      ))}
      {page < pages && <a href={href(page + 1)} className="rounded-sm border border-line px-3 py-1.5 hover:bg-olive/5">›</a>}
    </nav>
  );
}
