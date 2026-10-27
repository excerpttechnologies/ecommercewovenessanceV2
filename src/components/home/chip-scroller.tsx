"use client";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn, isRemoteImageSource } from "@/lib/utils";
import { Lotus } from "@/components/ui/ornaments";

const arrow = "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-maroon shadow-[0_4px_12px_-6px_rgba(122,18,56,0.5)] ring-1 ring-maroon/10 transition-colors hover:bg-maroon hover:text-white disabled:pointer-events-none disabled:opacity-35";

/** One row of occasion / fabric pills that scrolls sideways, with small arrows when it overflows. */
export function ChipScroller({ items }: { items: { label: string; href: string; image?: string }[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      el.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [items.length]);

  const scroll = (dir: number) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.7, behavior: "smooth" });
  const fits = edges.start && edges.end;

  return (
    <div className="flex items-center gap-2">
      {!fits && <button type="button" onClick={() => scroll(-1)} disabled={edges.start} aria-label="Scroll left" className={arrow}><ChevronLeft className="h-4 w-4" /></button>}
      <div ref={ref} className={cn("we-scroller flex min-w-0 flex-1 snap-x gap-2.5 overflow-x-auto px-1 py-2", fits && "justify-center")}>
        {items.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className="group flex shrink-0 snap-start items-center gap-2.5 whitespace-nowrap rounded-full border border-transparent bg-white py-1 pl-1 pr-4 text-[13px] font-medium text-olive shadow-[0_6px_18px_-12px_rgba(122,18,56,0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:border-maroon hover:text-maroon"
          >
            <span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#f48fb6] to-maroon text-white">
              {it.image
                ? <Image src={it.image} alt="" fill unoptimized={isRemoteImageSource(it.image)} sizes="32px" className="object-cover transition-transform duration-500 group-hover:scale-110" />
                : <Lotus className="h-4 w-5" />}
            </span>
            {it.label}
          </Link>
        ))}
      </div>
      {!fits && <button type="button" onClick={() => scroll(1)} disabled={edges.end} aria-label="Scroll right" className={arrow}><ChevronRight className="h-4 w-4" /></button>}
    </div>
  );
}
