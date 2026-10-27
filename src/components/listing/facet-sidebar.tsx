"use client";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import type { ProductFacets } from "@/domain/types";
import { formatMoney } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { useUi } from "@/store/ui";

/**
 * Facet filters synced to the URL (?fabric=A,B&priceMin=..). Server re-renders
 * the grid; counts come from /products/facets which ignores each facet's own selection.
 */
export function FacetSidebar({ facets }: { facets: ProductFacets }) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const [mobileOpen, setMobileOpen] = useState(false);
  const currency = useUi((s) => s.currency);

  const selected = useCallback((key: string) => (sp.get(key) ?? "").split(",").filter(Boolean), [sp]);

  const update = useCallback(
    (mutate: (p: URLSearchParams) => void) => {
      const next = new URLSearchParams(sp.toString());
      mutate(next);
      next.delete("page");
      start(() => router.push(`${pathname}?${next.toString()}`, { scroll: false }));
    },
    [sp, router, pathname],
  );

  const toggle = (key: string, value: string) =>
    update((p) => {
      const cur = selected(key);
      const nxt = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
      if (nxt.length) p.set(key, nxt.join(","));
      else p.delete(key);
    });

  const activeCount = facets.groups.reduce((n, g) => n + selected(g.key).length, 0) + (sp.get("priceMin") || sp.get("priceMax") ? 1 : 0) + (sp.get("inStock") ? 1 : 0) + (sp.get("discountMin") ? 1 : 0);

  const body = (
    <div className={cn("space-y-1", pending && "opacity-60")}>
      {activeCount > 0 && (
        <button onClick={() => update((p) => { [...facets.groups.map((g) => g.key), "priceMin", "priceMax", "inStock", "discountMin"].forEach((k) => p.delete(k)); })} className="mb-2 flex items-center gap-1 text-xs font-semibold text-maroon hover:underline">
          <X className="h-3 w-3" /> Clear all ({activeCount})
        </button>
      )}
      <Group title="Price" defaultOpen>
        <PriceRange min={facets.price.min} max={facets.price.max} curMin={sp.get("priceMin")} curMax={sp.get("priceMax")} currency={currency} onApply={(a, b) => update((p) => { a ? p.set("priceMin", String(a)) : p.delete("priceMin"); b ? p.set("priceMax", String(b)) : p.delete("priceMax"); })} />
      </Group>
      {facets.groups.filter((g) => g.options.length).map((g) => (
        <Group key={g.key} title={g.label} defaultOpen={["fabric", "occasion", "color"].includes(g.key)}>
          <ul className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
            {g.options.map((o) => {
              const on = selected(g.key).includes(o.value);
              return (
                <li key={o.value}>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input type="checkbox" checked={on} onChange={() => toggle(g.key, o.value)} className="h-4 w-4 rounded accent-[var(--we-maroon)]" />
                    {g.key === "color" && <span className="h-3.5 w-3.5 rounded-full border border-line" style={{ background: o.swatch ?? o.value.toLowerCase() }} />}
                    <span className={cn("flex-1 text-ink/80", on && "font-medium text-maroon")}>{o.label}</span>
                    <span className="text-[11px] text-muted">{o.count}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </Group>
      ))}
      <Group title="Availability">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={sp.get("inStock") === "true"} onChange={(e) => update((p) => (e.target.checked ? p.set("inStock", "true") : p.delete("inStock")))} className="h-4 w-4 rounded accent-[var(--we-maroon)]" />
          In stock only <span className="ml-auto text-[11px] text-muted">{facets.availability.inStock}</span>
        </label>
      </Group>
      {facets.discount.length > 0 && (
        <Group title="Discount">
          <ul className="space-y-1.5">
            {facets.discount.map((d) => (
              <li key={d.minPercent}>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" name="discount" checked={sp.get("discountMin") === String(d.minPercent)} onChange={() => update((p) => p.set("discountMin", String(d.minPercent)))} className="h-4 w-4 rounded accent-[var(--we-maroon)]" />
                  {d.minPercent}% and above <span className="ml-auto text-[11px] text-muted">{d.count}</span>
                </label>
              </li>
            ))}
          </ul>
        </Group>
      )}
    </div>
  );

  return (
    <>
      <button onClick={() => setMobileOpen(true)} className="flex h-10 w-fit items-center gap-2 rounded-md border border-line bg-white px-4 text-sm font-medium lg:hidden">
        <SlidersHorizontal className="h-4 w-4" /> Filters {activeCount > 0 && `(${activeCount})`}
      </button>
      <aside className="hidden w-64 shrink-0 lg:block">{body}</aside>
      <div className={cn("fixed inset-0 z-[70] lg:hidden", mobileOpen ? "pointer-events-auto" : "pointer-events-none")}>
        <div onClick={() => setMobileOpen(false)} className={cn("absolute inset-0 bg-ink/40 transition-opacity", mobileOpen ? "opacity-100" : "opacity-0")} />
        <div className={cn("absolute inset-y-0 left-0 w-[86%] max-w-sm overflow-y-auto bg-white p-5 transition-transform", mobileOpen ? "translate-x-0" : "-translate-x-full")} style={{ paddingTop: "calc(1.25rem + env(safe-area-inset-top, 0px))" }}>
          <div className="mb-4 flex items-center justify-between"><span className="font-heading text-xl font-semibold text-olive">Filters</span><button onClick={() => setMobileOpen(false)} aria-label="Close"><X className="h-5 w-5" /></button></div>
          {body}
        </div>
      </div>
    </>
  );
}

function Group({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-line py-3">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between text-[15px] font-semibold text-olive">
        {title} <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

function PriceRange({ min, max, curMin, curMax, currency, onApply }: { min: number; max: number; curMin: string | null; curMax: string | null; currency: string; onApply: (a: number | null, b: number | null) => void }) {
  const [a, setA] = useState(curMin ?? "");
  const [b, setB] = useState(curMax ?? "");
  return (
    <div>
      <p className="mb-2 text-xs text-muted">{formatMoney(min, currency)} – {formatMoney(max, currency)}</p>
      <div className="flex items-center gap-2">
        <input inputMode="numeric" placeholder="Min" value={a} onChange={(e) => setA(e.target.value)} className="h-9 w-full rounded-md border border-line bg-white px-2 text-sm focus:border-maroon focus:outline-none" />
        <span className="text-muted">–</span>
        <input inputMode="numeric" placeholder="Max" value={b} onChange={(e) => setB(e.target.value)} className="h-9 w-full rounded-md border border-line bg-white px-2 text-sm focus:border-maroon focus:outline-none" />
        <button onClick={() => onApply(a ? Number(a) : null, b ? Number(b) : null)} className="h-9 rounded-md bg-maroon px-3 text-xs font-semibold text-white hover:bg-gold">Go</button>
      </div>
    </div>
  );
}
