"use client";
import { ChevronDown, Filter, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { BarcodeFacets, FacetOption } from "@/domain/types";
import { swatchColor } from "@/lib/colour";
import { cn } from "@/lib/utils";

type Props = { facets: BarcodeFacets };

const CHIP_KEYS = ["fabric", "subgroup", "occasion"] as const;
const MAX_CHIPS = 7;

function useFilterUrl() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(sp.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    router.push(`${pathname}${next.size ? `?${next.toString()}` : ""}`, { scroll: false });
  };
  const clearAll = () => {
    const next = new URLSearchParams();
    for (const keep of ["sort", "view"]) {
      const v = sp.get(keep);
      if (v) next.set(keep, v);
    }
    router.push(`${pathname}${next.size ? `?${next.toString()}` : ""}`, { scroll: false });
  };
  return { sp, update, clearAll };
}

type Choice = { key: string; label: string; options: FacetOption[] };

function facetChoices(facets: BarcodeFacets): Choice[] {
  return [
    { key: "subgroup", label: "Category", options: facets.subgroup ?? [] },
    { key: "fabric", label: "Fabric", options: facets.fabric ?? [] },
    { key: "occasion", label: "Occasion", options: facets.occasion ?? [] },
    { key: "color", label: "Colour", options: facets.color ?? [] },
    { key: "weave", label: "Weave", options: facets.weave ?? [] },
    { key: "craft", label: "Craft", options: facets.craft ?? [] },
    { key: "group", label: "Group", options: facets.group },
    { key: "business", label: "Business", options: facets.business },
    { key: "status", label: "Status", options: facets.status },
    { key: "uomType", label: "Unit", options: facets.uomType },
  ];
}

/** Search box + every facet group; shared by the desktop sidebar and the mobile drawer. */
function FilterBody({ choices, onSearch }: { choices: Choice[]; onSearch?: () => void }) {
  const { sp, update } = useFilterUrl();
  return (
    <>
      <form
        className="relative mb-3"
        onSubmit={(event) => {
          event.preventDefault();
          update("q", String(new FormData(event.currentTarget).get("q") ?? "").trim());
          onSearch?.();
        }}
      >
        <input name="q" defaultValue={sp.get("q") ?? ""} placeholder="Search in this collection" aria-label="Search products" className="h-10 w-full rounded-full border border-line bg-[#f6f4f4] pl-4 pr-10 text-sm focus:border-maroon focus:bg-white focus:outline-none focus:ring-2 focus:ring-maroon/15" />
        <button type="submit" aria-label="Search" className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-maroon hover:text-white">
          <Search className="h-4 w-4" />
        </button>
      </form>
      {choices.filter((c) => c.options.length > 0).map(({ key, label, options }, index) => {
        const current = sp.get(key) ?? "";
        return (
          <FilterGroup key={key} title={label} defaultOpen={index < 4 || Boolean(current)}>
            <ul className="we-scroller max-h-72 space-y-0.5 overflow-y-auto pr-1">
              <li>
                <OptionRow label={`All ${label.toLowerCase()}`} active={!current} onClick={() => update(key, "")} />
              </li>
              {options.map((option) => (
                <li key={option.value}>
                  <OptionRow
                    label={option.label}
                    count={option.count}
                    swatch={key === "color" ? swatchColor(option.swatch ?? option.value) : undefined}
                    active={current === option.value}
                    onClick={() => update(key, current === option.value ? "" : option.value)}
                  />
                </li>
              ))}
            </ul>
          </FilterGroup>
        );
      })}
    </>
  );
}

/** Desktop (lg+) filter column beside the product grid; small screens use the drawer instead. */
export function BarcodeFilterSidebar({ facets }: Props) {
  const { sp, clearAll } = useFilterUrl();
  const choices = facetChoices(facets);
  const activeCount = ["q", ...choices.map((c) => c.key)].filter((k) => sp.get(k)).length;
  return (
    <aside aria-label="Product filters" className="hidden lg:block">
      <div className="sticky top-4 rounded-lg border border-line bg-white">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <span className="flex items-center gap-2 font-heading text-[15px] font-semibold text-olive">
            <Filter className="h-4 w-4 text-maroon" /> Filters
            {activeCount > 0 && <span className="rounded-full bg-maroon px-1.5 text-[10px] font-semibold text-white">{activeCount}</span>}
          </span>
          <button type="button" onClick={clearAll} disabled={!activeCount} className="text-xs font-semibold text-maroon hover:underline disabled:text-muted disabled:no-underline disabled:opacity-60">Clear all</button>
        </div>
        <div className="we-scroller max-h-[calc(100vh-4.5rem)] overflow-y-auto px-4 py-2">
          <FilterBody choices={choices} />
        </div>
      </div>
    </aside>
  );
}

/**
 * ERP collection filters: quick chips for the most-used fabric (or subgroup) values, and (below lg)
 * a Filters drawer holding every facet. Each facet is single-select and synced to one URL key.
 */
export function BarcodeCollectionFilters({ facets }: Props) {
  const { sp, update, clearAll } = useFilterUrl();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const choices = facetChoices(facets);
  const activeKeys = ["q", ...choices.map((c) => c.key)].filter((k) => sp.get(k));

  // Chips come from the first facet that has values, most-stocked first.
  const chipKey = CHIP_KEYS.find((k) => (choices.find((c) => c.key === k)?.options.length ?? 0) > 0);
  const chipOptions = chipKey ? [...choices.find((c) => c.key === chipKey)!.options].sort((a, b) => b.count - a.count).slice(0, MAX_CHIPS) : [];
  const chipValue = chipKey ? sp.get(chipKey) ?? "" : "";
  // Keep a selected value visible even when it is not one of the top chips.
  const selectedExtra = chipKey && chipValue && !chipOptions.some((o) => o.value === chipValue)
    ? choices.find((c) => c.key === chipKey)!.options.find((o) => o.value === chipValue)
    : undefined;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <div className="flex min-w-0 items-center gap-2.5 lg:items-start">
        {chipKey && (
          <div className="we-scroller flex min-w-0 flex-1 gap-2 overflow-x-auto py-1 lg:flex-wrap lg:py-0 lg:justify-end lg:overflow-visible">
            <Chip label="All" active={!chipValue} onClick={() => update(chipKey, "")} />
            {[...chipOptions, ...(selectedExtra ? [selectedExtra] : [])].map((o) => (
              <Chip key={o.value} label={o.label} active={chipValue === o.value} onClick={() => update(chipKey, chipValue === o.value ? "" : o.value)} />
            ))}
          </div>
        )}
        <button type="button" onClick={() => setOpen(true)} className="ml-auto flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-line bg-white px-3.5 text-[13px] font-medium text-olive transition-colors hover:border-maroon hover:text-maroon lg:hidden">
          <Filter className="h-4 w-4" /> Filters
          {activeKeys.length > 0 && <span className="rounded-full bg-maroon px-1.5 text-[10px] font-semibold text-white">{activeKeys.length}</span>}
        </button>
      </div>

      {/* Portalled to <body> so no page wrapper (e.g. the route fade) can trap it beneath the sticky header. */}
      {mounted && createPortal(<div className={cn("fixed inset-0 z-[70] lg:hidden", open ? "pointer-events-auto" : "pointer-events-none")} aria-hidden={!open}>
        <div onClick={() => setOpen(false)} className={cn("absolute inset-0 bg-ink/40 transition-opacity", open ? "opacity-100" : "opacity-0")} />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Filters"
          className={cn("absolute inset-y-0 right-0 flex w-[88%] max-w-sm flex-col bg-white shadow-2xl transition-transform duration-300", open ? "translate-x-0" : "translate-x-full")}
          style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
        >
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <span className="font-heading text-lg font-semibold text-olive">Filters</span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close filters" className="rounded-full p-1.5 hover:bg-maroon/10"><X className="h-5 w-5" /></button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <FilterBody choices={choices} onSearch={() => setOpen(false)} />
          </div>
          <div className="flex gap-3 border-t border-line px-5 py-4">
            <button type="button" onClick={clearAll} disabled={!activeKeys.length} className="h-11 flex-1 rounded-lg border border-line text-sm font-semibold text-olive hover:border-maroon hover:text-maroon disabled:opacity-40">Clear all</button>
            <button type="button" onClick={() => setOpen(false)} className="h-11 flex-1 rounded-lg bg-maroon text-sm font-semibold text-white hover:bg-gold">Show results</button>
          </div>
        </aside>
      </div>, document.body)}
    </>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "h-9 shrink-0 whitespace-nowrap rounded-lg border px-3.5 text-[13px] font-medium transition-colors",
        active ? "border-maroon bg-maroon text-white shadow-[0_6px_16px_-8px_rgba(219,26,114,0.7)]" : "border-line bg-white text-olive hover:border-maroon hover:text-maroon",
      )}
    >
      {label}
    </button>
  );
}

function OptionRow({ label, count, swatch, active, onClick }: { label: string; count?: number; swatch?: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={cn("flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors", active ? "bg-maroon/10 font-medium text-maroon" : "text-ink/80 hover:bg-maroon/5 hover:text-maroon")}>
      {swatch && <span className="h-4 w-4 shrink-0 rounded-full border border-line" style={{ background: swatch }} />}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count != null && <span className="text-xs text-muted">({count})</span>}
    </button>
  );
}

function FilterGroup({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-line py-3">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center justify-between text-[15px] font-semibold text-olive">
        {title} <ChevronDown className={cn("h-4 w-4 text-muted transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  );
}
