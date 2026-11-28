"use client";

import Link from "next/link";
import {
  ArrowRight,
  Brush,
  CalendarDays,
  ChevronRight,
  Grid3x3,
  Layers,
  Palette,
  Tag,
} from "lucide-react";

import { formatCategoryDisplayName } from "@/lib/add-on-categories";
import { cn } from "@/lib/utils";
import type { MenuNode } from "@/repositories/web/site.repository";

/** Column icon by heading. */
function groupIcon(label: string) {
  if (/weave/i.test(label)) return Grid3x3;
  if (/fabric/i.test(label)) return Layers;
  if (/craft|work|print/i.test(label)) return Brush;
  if (/occasion/i.test(label)) return CalendarDays;
  if (/colou?r/i.test(label)) return Palette;

  return Tag;
}

const titleCase = (s: string) => {
  const normalized = formatCategoryDisplayName(s);
  return normalized === normalized.toUpperCase()
    ? normalized.charAt(0) + normalized.slice(1).toLowerCase()
    : normalized;
};

/**
 * Promo card links to a real filter:
 * Banarasi under By Fabric, otherwise the first fabric value,
 * otherwise the whole category.
 */
function promoFor(item: MenuNode) {
  const fabrics =
    item.children.find(
      (c) => c.kind === "group" && /fabric/i.test(c.label)
    )?.children ?? [];

  const pick =
    fabrics.find((l) => /banaras/i.test(l.label)) ?? fabrics[0];

  return pick?.href
    ? { title: pick.label, href: pick.href }
    : {
        title: `${titleCase(item.label)} Collection`,
        href: item.href ?? "#",
      };
}

interface MegaMenuProps {
  item: MenuNode;
  open: boolean;
  onNavigate?: () => void;
}

/**
 * Mega menu:
 * - Displays classification groups as columns.
 * - Displays loose links separately.
 * - Includes a promotional collection card.
 * - Keeps long ERP value lists scrollable.
 */
export function MegaMenu({
  item,
  open,
  onNavigate,
}: MegaMenuProps) {
  const groups = item.children.filter(
    (c) => c.kind === "group" && c.children.length
  );

  const loose = item.children.filter(
    (c) => c.kind === "link"
  );

  const label = titleCase(item.label);
  const promo = promoFor(item);

  const linkClass =
    "group/link flex items-center justify-between gap-1.5 rounded-lg px-1.5 py-1.5 text-[13px] text-ink/85 transition-colors hover:bg-maroon/[0.06] hover:text-maroon";

  return (
    <div
      role="region"
      aria-label={`${label} menu`}
      aria-hidden={!open}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("a")) {
          onNavigate?.();
        }
      }}
      className={cn(
        "absolute inset-x-0 top-full px-4 pt-2 transition-all duration-200 sm:px-6",
        open
          ? "visible translate-y-0 opacity-100"
          : "invisible -translate-y-1 opacity-0"
      )}
    >
      <div className="mx-auto flex w-fit max-w-site gap-3 overflow-hidden rounded-2xl border border-maroon/10 bg-white p-3 shadow-[0_30px_60px_-30px_rgba(122,18,56,0.45)]">
        <div className="flex min-w-0 divide-x divide-maroon/10">
          {/* Classification groups */}
          {groups.map((g) => {
            const Icon = groupIcon(g.label);

            return (
              <div
                key={g.id}
                className="w-52 min-w-0 shrink px-2.5 py-1.5 xl:px-3"
              >
                <p className="mb-2 flex items-center gap-2.5 whitespace-nowrap text-sm font-semibold text-olive">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-maroon/10 text-maroon">
                    <Icon className="h-[18px] w-[18px]" />
                  </span>

                  {g.label}
                </p>

                {/* Scrollable classification values */}
                <ul className="we-scroller max-h-[min(19rem,52vh)] overflow-y-auto overscroll-contain pr-1">
                  {g.children.map((l) => (
                    <li key={l.id}>
                      <Link
                        href={l.href ?? "#"}
                        title={l.label}
                        className={linkClass}
                      >
                        <span className="min-w-0 truncate whitespace-nowrap">
                          {l.label}

                          {l.badge && (
                            <span className="ml-2 rounded-full bg-maroon/10 px-1.5 text-[9px] font-semibold uppercase text-maroon">
                              {l.badge}
                            </span>
                          )}
                        </span>

                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-maroon/70 transition-transform group-hover/link:translate-x-0.5" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          {/* Loose links */}
          {loose.length > 0 && (
            <ul className="w-52 min-w-0 shrink px-2.5 py-1.5 xl:px-3">
              {loose.map((l) => (
                <li key={l.id}>
                  <Link
                    href={l.href ?? "#"}
                    title={l.label}
                    className={linkClass}
                  >
                    <span className="min-w-0 truncate">
                      {l.label}
                    </span>

                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-maroon/70" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Promotional card */}
        <Link
          href={promo.href}
          onClick={onNavigate}
          className="group/promo relative hidden w-[220px] shrink-0 flex-col justify-center overflow-hidden rounded-xl bg-[linear-gradient(135deg,#fde4ee_0%,#fbd3e2_100%)] px-5 py-4 xl:flex"
        >
          <svg
            viewBox="0 0 200 200"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            className="pointer-events-none absolute -right-8 -top-6 h-40 w-40 text-maroon/15"
            aria-hidden
          >
            <path d="M100 20c18 22 24 48 0 96-24-48-18-74 0-96Z" />
            <path d="M100 116c-6-30-26-52-54-58-2 28 18 52 54 58Z" />
            <path d="M100 116c6-30 26-52 54-58 2 28-18 52-54 58Z" />
            <path d="M100 116c-22-14-48-18-76-10 16 20 46 22 76 10Z" />
            <path d="M100 116c22-14 48-18 76-10-16 20-46 22-76 10Z" />
          </svg>

          <span className="relative w-fit rounded-full bg-white/70 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-maroon">
            Trending now
          </span>

          <p className="relative mt-2.5 font-display text-2xl font-medium leading-tight text-[#8c1048]">
            {promo.title}
          </p>

          <p className="relative mt-1.5 text-xs leading-snug text-ink/70">
            Timeless elegance for every occasion
          </p>

          <span className="relative mt-3.5 inline-flex h-9 w-fit items-center gap-1.5 rounded-full bg-maroon px-4 text-[13px] font-semibold text-white shadow-[0_10px_24px_-10px_rgba(219,26,114,0.9)] transition-colors group-hover/promo:bg-gold">
            Explore Collection

            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/promo:translate-x-0.5" />
          </span>
        </Link>
      </div>
    </div>
  );
}
