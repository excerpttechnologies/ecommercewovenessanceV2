"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Props<T extends string> = {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  /** Caption shown beside, not inside, the control. */
  label?: string;
  className?: string;
};

/**
 * Sort control used by every listing toolbar. A plain listbox instead of a
 * native <select> so the whole box is clickable and it looks the same in each panel.
 */
export function SortDropdown<T extends string>({
  value,
  options,
  onChange,
  label = "Sort by:",
  className,
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const current = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={cn("flex items-center gap-2 text-[13px] text-olive", className)}>
      <span className="shrink-0 text-olive/80">{label}</span>
      <div ref={root} className="relative">
        <button
          type="button"
          onClick={() => setOpen((state) => !state)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label="Sort products"
          className="flex h-9 min-w-[170px] cursor-pointer items-center justify-between gap-3 rounded-lg border border-line bg-white pl-3.5 pr-3 text-left text-[13px] font-medium text-olive transition-colors hover:border-maroon/60 focus:border-maroon focus:outline-none"
        >
          <span className="truncate">{current?.label}</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted transition-transform duration-200",
              open && "rotate-180",
            )}
            aria-hidden="true"
          />
        </button>

        {open && (
          <ul
            role="listbox"
            aria-label="Sort products"
            className="absolute right-0 z-50 mt-1 max-h-72 w-full min-w-[190px] overflow-y-auto rounded-lg border border-line bg-white py-1 shadow-[0_14px_34px_-16px_rgba(41,35,30,0.45)]"
          >
            {options.map((option) => {
              const active = option.value === value;
              return (
                <li key={option.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      setOpen(false);
                      if (!active) onChange(option.value);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 px-3.5 py-2 text-left text-[13px] leading-5 transition-colors",
                      active
                        ? "bg-maroon/[0.07] font-medium text-maroon"
                        : "font-normal text-ink/75 hover:bg-maroon/[0.04] hover:text-maroon",
                    )}
                  >
                    <span className="truncate">{option.label}</span>
                    {active && <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} aria-hidden="true" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
