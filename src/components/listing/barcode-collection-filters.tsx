"use client";

import { Check, ChevronDown, Filter, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import type { BarcodeFacets, FacetOption } from "@/domain/types";
import { cn } from "@/lib/utils";

type Props = {
  facets: BarcodeFacets;
};

const PRICE_KEYS = ["priceMin", "priceMax"] as const;

/** Shortcuts for the price input below; any custom range can still be typed. */
const PRICE_RANGES = [
  { label: "Under ₹1,000", min: "", max: "1000" },
  { label: "₹1,000 – ₹2,500", min: "1000", max: "2500" },
  { label: "₹2,500 – ₹5,000", min: "2500", max: "5000" },
  { label: "₹5,000 – ₹10,000", min: "5000", max: "10000" },
  { label: "Above ₹10,000", min: "10000", max: "" },
];

/** Section headings share one type scale on the sidebar and in the mobile drawer. */
const headingClass =
  "font-heading text-[12.5px] font-semibold uppercase leading-5 tracking-[0.12em] text-olive";

function useFilterUrl() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const push = (next: URLSearchParams) =>
    router.push(`${pathname}${next.size ? `?${next.toString()}` : ""}`, { scroll: false });

  /** Set or clear several URL keys in one navigation (used by the price filter). */
  const updateMany = (values: Record<string, string>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [key, value] of Object.entries(values)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    // Older links may still carry the removed category parameters.
    if (values.group !== undefined) {
      next.delete("subgroup");
      next.delete("category");
    }
    next.delete("page");
    push(next);
  };

  const update = (key: string, value: string) => updateMany({ [key]: value });

  const clearAll = () => {
    const next = new URLSearchParams();
    for (const keep of ["sort", "view"]) {
      const value = sp.get(keep);
      if (value) next.set(keep, value);
    }
    push(next);
  };

  return { sp, update, updateMany, clearAll };
}

type Choice = { key: string; label: string; options: FacetOption[] };

/** ERP group labels are stored lower case ("ready bits"); present them as category names. */
function categoryLabel(label: string): string {
  return label === label.toLowerCase()
    ? label.replace(/\b\w/g, (character) => character.toUpperCase())
    : label;
}

/**
 * The customer-facing sidebar keeps exactly two groups: Category and Price.
 * Category uses the ERP group facet, which is the real category of each piece
 * and carries live product counts; every other facet stays out of the UI.
 */
function facetChoices(facets: BarcodeFacets): Choice[] {
  const categories = [...(facets.group ?? [])]
    .sort((a, b) => b.count - a.count)
    .map((option) => ({ ...option, label: categoryLabel(option.label) }));

  return [
    {
      key: "group",
      label: "Category",
      options: categories,
    },
  ];
}

/** Whole rupees only; anything else is treated as empty. */
const cleanPrice = (value: FormDataEntryValue | null) => {
  const raw = String(value ?? "").trim();
  const n = Number(raw);
  return raw !== "" && Number.isFinite(n) && n >= 0 ? String(Math.floor(n)) : "";
};

function PriceFilter({ onApply }: { onApply?: () => void }) {
  const { sp, updateMany } = useFilterUrl();
  const min = sp.get("priceMin") ?? "";
  const max = sp.get("priceMax") ?? "";
  const hasPrice = Boolean(min || max);

  const apply = (nextMin: string, nextMax: string) => {
    updateMany({ priceMin: nextMin, priceMax: nextMax });
    onApply?.();
  };

  return (
    <FilterGroup title="Price" defaultOpen>
      <ul className="space-y-0.5">
        <li>
          <OptionRow label="All prices" active={!hasPrice} onClick={() => apply("", "")} />
        </li>
        {PRICE_RANGES.map((range) => (
          <li key={range.label}>
            <OptionRow
              label={range.label}
              active={Boolean(hasPrice) && min === range.min && max === range.max}
              onClick={() => apply(range.min, range.max)}
            />
          </li>
        ))}
      </ul>

      {/* key resets the typed values whenever the URL changes (quick range, clear all) */}
      <form
        key={`${min}-${max}`}
        className="mt-3 flex items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          let lo = cleanPrice(data.get("min"));
          let hi = cleanPrice(data.get("max"));
          if (lo && hi && Number(lo) > Number(hi)) [lo, hi] = [hi, lo];
          apply(lo, hi);
        }}
      >
        <input
          name="min"
          type="number"
          min={0}
          inputMode="numeric"
          defaultValue={min}
          placeholder="Min ₹"
          aria-label="Minimum price"
          className="h-9 w-full min-w-0 rounded-md border border-line bg-white px-2.5 text-[13px] leading-5 text-ink placeholder:text-muted focus:border-maroon focus:outline-none focus:ring-2 focus:ring-maroon/15"
        />
        <span className="text-[13px] text-muted" aria-hidden="true">
          –
        </span>
        <input
          name="max"
          type="number"
          min={0}
          inputMode="numeric"
          defaultValue={max}
          placeholder="Max ₹"
          aria-label="Maximum price"
          className="h-9 w-full min-w-0 rounded-md border border-line bg-white px-2.5 text-[13px] leading-5 text-ink placeholder:text-muted focus:border-maroon focus:outline-none focus:ring-2 focus:ring-maroon/15"
        />
        <button
          type="submit"
          className="h-9 shrink-0 rounded-md bg-maroon px-3 text-[12px] font-semibold uppercase tracking-wide text-white transition-colors hover:bg-gold"
        >
          Go
        </button>
      </form>
    </FilterGroup>
  );
}

/** Category + Price only; shared by the desktop sidebar and the mobile drawer. */
function FilterBody({
  choices,
  total,
  onApply,
}: {
  choices: Choice[];
  total: number;
  onApply?: () => void;
}) {
  const { sp, update } = useFilterUrl();

  return (
    <>
      <form
        key={sp.get("q") ?? ""}
        className="relative mb-1 mt-2"
        onSubmit={(event) => {
          event.preventDefault();
          update("q", String(new FormData(event.currentTarget).get("q") ?? "").trim());
          onApply?.();
        }}
      >
        <input
          name="q"
          defaultValue={sp.get("q") ?? ""}
          placeholder="Search in this collection"
          aria-label="Search products"
          className="h-10 w-full rounded-md border border-line bg-white pl-3 pr-10 text-[13px] leading-5 text-ink placeholder:text-muted focus:border-maroon focus:outline-none focus:ring-2 focus:ring-maroon/15"
        />
        <button
          type="submit"
          aria-label="Search"
          className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted transition-colors hover:bg-maroon/5 hover:text-maroon"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
        </button>
      </form>

      {choices.map(({ key, label, options }) => {
        const current = sp.get(key) ?? "";
        const allLabel = label === "Category" ? "All categories" : `All ${label.toLowerCase()}`;
        return (
          <FilterGroup key={key} title={label} defaultOpen>
            <ul className="space-y-0.5">
              <li>
                <OptionRow
                  label={allLabel}
                  count={total}
                  active={!current}
                  onClick={() => update(key, "")}
                />
              </li>
              {options.map((option) => (
                <li key={option.value}>
                  <OptionRow
                    label={option.label}
                    count={option.count}
                    active={current === option.value}
                    onClick={() => update(key, current === option.value ? "" : option.value)}
                  />
                </li>
              ))}
            </ul>
          </FilterGroup>
        );
      })}

      <PriceFilter onApply={onApply} />
    </>
  );
}

/** Desktop (lg+) filter column beside the product grid; small screens use the drawer instead. */
export function BarcodeFilterSidebar({ facets }: Props) {
  const { sp, clearAll } = useFilterUrl();
  const choices = facetChoices(facets);
  const activeCount = [
    ...PRICE_KEYS,
    ...choices.map((choice) => choice.key),
    ...(sp.get("q") ? ["q"] : []),
  ].filter((key) => sp.get(key)).length;

  return (
    <aside aria-label="Product filters" className="hidden lg:block">
      <div className="sticky top-4 border border-line bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3.5">
          <span className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-maroon" aria-hidden="true" />
            <span className={headingClass}>Filters</span>
            {activeCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-maroon px-1 text-[10px] font-semibold leading-none text-white">
                {activeCount}
              </span>
            )}
          </span>
          <button
            type="button"
            onClick={clearAll}
            disabled={!activeCount}
            className="text-[11px] font-semibold uppercase tracking-[0.08em] text-maroon transition-colors hover:text-gold disabled:cursor-default disabled:text-muted disabled:opacity-60"
          >
            Clear all
          </button>
        </div>
        <div className="we-scroller max-h-[calc(100vh-4.5rem)] overflow-y-auto px-4 pb-2 pt-1">
          <FilterBody choices={choices} total={facets.total} />
        </div>
      </div>
    </aside>
  );
}

/**
 * Small-screen entry point: a Filters button that opens the same Category and
 * Price sections in a drawer. Nothing renders beside it on desktop.
 */
export function BarcodeCollectionFilters({ facets }: Props) {
  const { sp, clearAll } = useFilterUrl();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const choices = facetChoices(facets);
  const activeCount = [
    ...PRICE_KEYS,
    ...choices.map((choice) => choice.key),
    ...(sp.get("q") ? ["q"] : []),
  ].filter((key) => sp.get(key)).length;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ml-auto flex h-9 shrink-0 items-center gap-1.5 border border-line bg-white px-3.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-olive transition-colors hover:border-maroon hover:text-maroon lg:hidden"
      >
        <Filter className="h-4 w-4" aria-hidden="true" /> Filters
        {activeCount > 0 && (
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-maroon px-1 text-[10px] font-semibold leading-none text-white">
            {activeCount}
          </span>
        )}
      </button>

      {/* Portalled to <body> so no page wrapper (e.g. the route fade) can trap it beneath the sticky header. */}
      {mounted &&
        createPortal(
          <div
            className={cn(
              "fixed inset-0 z-[70] lg:hidden",
              open ? "pointer-events-auto" : "pointer-events-none",
            )}
            aria-hidden={!open}
          >
            <div
              onClick={() => setOpen(false)}
              className={cn(
                "absolute inset-0 bg-ink/40 transition-opacity",
                open ? "opacity-100" : "opacity-0",
              )}
            />
            <aside
              role="dialog"
              aria-modal="true"
              aria-label="Filters"
              className={cn(
                "absolute inset-y-0 right-0 flex w-[88%] max-w-sm flex-col bg-white shadow-2xl transition-transform duration-300",
                open ? "translate-x-0" : "translate-x-full",
              )}
              style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
            >
              <div className="flex items-center justify-between border-b border-line px-5 py-4">
                <span className={headingClass}>Filters</span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close filters"
                  className="rounded-full p-1.5 text-olive hover:bg-maroon/10"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 pb-4 pt-1">
                <FilterBody
                  choices={choices}
                  total={facets.total}
                  onApply={() => setOpen(false)}
                />
              </div>
              <div className="flex gap-3 border-t border-line px-5 py-4">
                <button
                  type="button"
                  onClick={clearAll}
                  disabled={!activeCount}
                  className="h-11 flex-1 border border-line text-[12px] font-semibold uppercase tracking-[0.08em] text-olive transition-colors hover:border-maroon hover:text-maroon disabled:opacity-40"
                >
                  Clear all
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="h-11 flex-1 bg-maroon text-[12px] font-semibold uppercase tracking-[0.08em] text-white transition-colors hover:bg-gold"
                >
                  Show results
                </button>
              </div>
            </aside>
          </div>,
          document.body,
        )}
    </>
  );
}

/** One selectable filter value with an optional live product count. */
function OptionRow({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-1.5 py-[7px] text-left text-[13.5px] leading-5 transition-colors",
        active
          ? "bg-maroon/[0.07] font-medium text-maroon"
          : "font-normal text-ink/75 hover:bg-maroon/[0.04] hover:text-maroon",
      )}
    >
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {active && <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} aria-hidden="true" />}
      {count != null && (
        <span
          className={cn(
            "shrink-0 text-right text-[12px] leading-5 tabular-nums",
            active ? "text-maroon/80" : "text-muted",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

/** Collapsible filter section with the shared heading + chevron alignment. */
function FilterGroup({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-line py-4 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className={headingClass}>{title}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted transition-transform duration-200",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>
      {open && <div className="mt-2.5">{children}</div>}
    </div>
  );
}
