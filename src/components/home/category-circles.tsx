"use client";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn, isRemoteImageSource } from "@/lib/utils";

export interface CategoryCircle {
  id: string;
  name: string;
  href: string;
  image?: string | null;
}

const smallArrowClass = "flex h-8 w-8 items-center justify-center rounded-full bg-maroon/10 text-maroon transition-colors active:bg-maroon active:text-white disabled:opacity-35";
const arrowClass = "hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-maroon/10 text-maroon transition-colors hover:bg-maroon hover:text-white disabled:pointer-events-none disabled:opacity-35 sm:flex";

/** Round category photos in a horizontal scroller with pink arrows either side. */
export function CategoryCircles({ items }: { items: CategoryCircle[] }) {
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

  const scroll = (dir: number) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.75, behavior: "smooth" });
  const fits = edges.start && edges.end;

  return (
    <>
    <div className="relative flex items-center gap-2 sm:gap-4">
      <button type="button" onClick={() => scroll(-1)} disabled={edges.start} aria-label="Previous categories" className={arrowClass}>
        <ChevronLeft className="h-5 w-5" />
      </button>
      <div ref={ref} className={cn("we-scroller flex flex-1 snap-x gap-4 overflow-x-auto py-2 sm:gap-5 lg:gap-4 xl:gap-5", fits && "justify-center")}>
        {items.map((c) => (
          <Link key={c.id} href={c.href} className="group flex w-[104px] shrink-0 snap-start flex-col items-center gap-3 sm:w-32 lg:w-[120px] xl:w-[124px]">
            <span className="relative block aspect-square w-full overflow-hidden rounded-full bg-line shadow-[0_8px_24px_-12px_rgba(0,0,0,0.35)] ring-1 ring-black/5 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_14px_28px_-12px_rgba(219,26,114,0.45)]">
              {c.image && <Image src={c.image} alt={c.name} fill unoptimized={isRemoteImageSource(c.image)} sizes="140px" className="scale-105 object-cover transition-transform duration-500 group-hover:scale-110" />}
            </span>
            <span className="text-center text-sm font-medium text-olive transition-colors group-hover:text-maroon sm:text-[15px]">{c.name}</span>
          </Link>
        ))}
      </div>
      <button type="button" onClick={() => scroll(1)} disabled={edges.end} aria-label="More categories" className={arrowClass}>
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
    {/* Phones: small arrows under the row instead of beside it. */}
    {!fits && (
      <div className="mt-3 flex items-center justify-center gap-3 sm:hidden">
        <button type="button" onClick={() => scroll(-1)} disabled={edges.start} aria-label="Previous categories" className={smallArrowClass}>
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => scroll(1)} disabled={edges.end} aria-label="More categories" className={smallArrowClass}>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    )}
    </>
  );
}
