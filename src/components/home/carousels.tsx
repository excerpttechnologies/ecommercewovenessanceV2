"use client";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Instagram, Quote, Star } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn, isRemoteImageSource } from "@/lib/utils";

/** Scroll-snap row with arrow buttons and page dots. Children are the slides. */
function useRail(count: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState({ page: 0, pages: 1, start: true, end: true });
  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const pages = Math.max(1, Math.ceil(el.scrollWidth / el.clientWidth - 0.05));
    const page = Math.min(pages - 1, Math.round(el.scrollLeft / el.clientWidth));
    setState({ page, pages, start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      el.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [measure, count]);
  const go = (dir: number) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth, behavior: "smooth" });
  const toPage = (p: number) => ref.current?.scrollTo({ left: p * ref.current.clientWidth, behavior: "smooth" });
  return { ref, ...state, go, toPage };
}

function Arrows({ start, end, go, label, outside }: { start: boolean; end: boolean; go: (d: number) => void; label: string; outside?: boolean }) {
  const base = "absolute top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full shadow-[0_10px_24px_-12px_rgba(122,18,56,0.6)] transition-all hover:scale-105 disabled:pointer-events-none disabled:opacity-40 sm:flex";
  return (
    <>
      <button type="button" onClick={() => go(-1)} disabled={start} aria-label={`Previous ${label}`} className={cn(base, "bg-white text-olive hover:text-maroon", outside ? "-left-2 lg:-left-6" : "left-2")}>
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button type="button" onClick={() => go(1)} disabled={end} aria-label={`Next ${label}`} className={cn(base, "bg-maroon text-white hover:bg-gold", outside ? "-right-2 lg:-right-6" : "right-2")}>
        <ChevronRight className="h-5 w-5" />
      </button>
    </>
  );
}

export interface TestimonialCard {
  id: string;
  name: string;
  city?: string | null;
  rating?: number | null;
  text: string;
  image?: string | null;
}

export function TestimonialCarousel({ items }: { items: TestimonialCard[] }) {
  const rail = useRail(items.length);
  return (
    <div>
      <div className="relative">
        <Arrows start={rail.start} end={rail.end} go={rail.go} label="reviews" outside />
        <div ref={rail.ref} className="we-scroller -mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 py-3 sm:mx-6 sm:px-0">
          {items.map((t) => (
            <figure key={t.id} className="relative w-[86%] shrink-0 snap-start overflow-hidden rounded-xl border border-black/[0.05] bg-white p-5 shadow-[0_10px_28px_-22px_rgba(122,18,56,0.4)] sm:w-[calc(50%-10px)] lg:w-[calc(33.333%-14px)]">
              <Quote className="absolute right-5 top-5 h-8 w-8 rotate-180 fill-maroon/10 text-maroon/10" aria-hidden />
              <div className="flex items-center gap-4">
                {t.image ? (
                  <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full ring-4 ring-maroon/10">
                    <Image src={t.image} alt="" fill unoptimized={isRemoteImageSource(t.image)} sizes="48px" className="object-cover" />
                  </span>
                ) : (
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-maroon to-gold font-display text-xl text-white ring-4 ring-maroon/10" aria-hidden>
                    {t.name.trim().charAt(0).toUpperCase()}
                  </span>
                )}
                <div className="flex gap-1 text-amber-400" aria-label={`${t.rating ?? 5} out of 5 stars`}>
                  {Array.from({ length: t.rating ?? 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-amber-400" />)}
                </div>
              </div>
              <blockquote className="relative mt-4 text-sm leading-relaxed text-ink/80">“{t.text}”</blockquote>
              <figcaption className="relative mt-4 flex items-center gap-3 text-[13px]">
                <span className="font-semibold text-olive">{t.name}</span>
                {t.city && <><span className="h-4 w-px bg-maroon/40" /><span className="text-muted">{t.city}</span></>}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
      {rail.pages > 1 && (
        <div className="mt-6 flex justify-center gap-2.5">
          {Array.from({ length: rail.pages }).map((_, i) => (
            <button key={i} type="button" onClick={() => rail.toPage(i)} aria-label={`Show reviews page ${i + 1}`} aria-current={i === rail.page} className={cn("h-3 w-3 rounded-full transition-all", i === rail.page ? "bg-maroon" : "bg-maroon/15 hover:bg-maroon/35")} />
          ))}
        </div>
      )}
    </div>
  );
}

export function InstagramCarousel({ images, href }: { images: string[]; href: string }) {
  const rail = useRail(images.length);
  return (
    <div className="relative">
      <Arrows start={rail.start} end={rail.end} go={rail.go} label="photos" outside />
      <div ref={rail.ref} className="we-scroller -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 sm:mx-8 sm:px-0 lg:mx-12">
        {images.map((src, i) => (
          <a key={src + i} href={href} target="_blank" rel="noreferrer" aria-label="Open our Instagram" className="group relative aspect-[5/4] w-[70%] shrink-0 snap-start overflow-hidden rounded-lg bg-line sm:w-[calc(33.333%-8px)] lg:w-[calc(16.666%-10px)]">
            <Image src={src} alt="" fill unoptimized={isRemoteImageSource(src)} sizes="(min-width: 1024px) 16vw, (min-width: 640px) 33vw, 70vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
            <span className="absolute inset-0 flex items-center justify-center bg-maroon/0 text-white opacity-0 transition-all duration-300 group-hover:bg-maroon/40 group-hover:opacity-100"><Instagram className="h-7 w-7" /></span>
          </a>
        ))}
      </div>
    </div>
  );
}
