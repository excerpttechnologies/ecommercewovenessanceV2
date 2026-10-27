"use client";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { buttonClass } from "@/components/ui/button";
import { cn, isRemoteImageSource } from "@/lib/utils";
import { ComingSoonImage } from "@/components/ui/coming-soon-image";

export interface HeroSlide {
  id: string;
  title?: string | null;
  subtitle?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  desktop: string;
  mobile?: string | null;
  alt?: string | null;
  align?: "left" | "center" | "right" | null;
}

/** "Made for Celebrations" → "Made for" on one line, pink "Celebrations." on the next. */
/** Only the first slide is the page h1; the rest are h2 so the page keeps a single h1. */
function HeroTitle({ title, primary }: { title: string; primary: boolean }) {
  const Tag = primary ? "h1" : "h2";
  const words = title.trim().split(/\s+/);
  const last = words.length > 1 ? words.pop() : undefined;
  return (
    <Tag className="max-w-2xl font-heading text-[34px] font-semibold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
      {words.join(" ")}
      {last && (
        <>
          <br />
          <span className="font-extrabold text-maroon">{last.replace(/[.!]$/, "")}.</span>
        </>
      )}
    </Tag>
  );
}

export function HeroCarousel({ slides, interval = 6000 }: { slides: HeroSlide[]; interval?: number }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (slides.length < 2 || paused) return;
    const t = setInterval(() => setI((v) => (v + 1) % slides.length), interval);
    return () => clearInterval(t);
  }, [slides.length, interval, paused, i]);
  if (!slides.length) return null;
  const go = (delta: number) => setI((v) => (v + delta + slides.length) % slides.length);
  return (
    <section
      className="relative aspect-[4/5] w-full overflow-hidden bg-line sm:aspect-[16/7] lg:aspect-[16/6]"
      aria-roledescription="carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {slides.map((s, idx) => (
        <div key={s.id} className={cn("absolute inset-0 transition-opacity duration-1000", idx === i ? "opacity-100" : "pointer-events-none opacity-0")} aria-hidden={idx !== i}>
          <picture>
            {s.mobile && <source media="(max-width: 1023px)" srcSet={s.mobile} />}
            {/* The motion classes are applied only to the active slide, so they replay each time it comes round. */}
            {s.desktop ? <Image src={s.desktop} alt={s.alt ?? s.title ?? ""} fill priority={idx === 0} unoptimized={isRemoteImageSource(s.desktop)} sizes="100vw" className={cn("object-cover object-top", idx === i && "we-kenburns")} /> : <ComingSoonImage className="absolute inset-0" />}
          </picture>
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent sm:bg-gradient-to-r sm:from-black/65 sm:via-black/25 sm:to-transparent" />
          <div className={cn("absolute inset-0 mx-auto flex max-w-site flex-col justify-end px-6 pb-14 sm:justify-center sm:px-14 sm:pb-0 lg:px-20", s.align === "center" && "items-center text-center", s.align === "right" && "items-end text-right")}>
            {s.title && <div className={cn(idx === i && "we-rise")}><HeroTitle title={s.title} primary={idx === 0} /></div>}
            {s.subtitle && <p className={cn("mt-3 max-w-md text-sm text-white/90 sm:text-base", idx === i && "we-rise")} style={{ "--we-delay": "150ms" } as React.CSSProperties}>{s.subtitle}</p>}
            {s.ctaHref && (
              <Link href={s.ctaHref} className={buttonClass("primary", "md", cn("mt-6 h-11 w-fit px-6", idx === i && "we-rise"))} style={{ "--we-delay": "300ms" } as React.CSSProperties}>
                {s.ctaLabel ?? "Shop Now"} <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      ))}
      {slides.length > 1 && (
        <>
          <button type="button" aria-label="Previous slide" onClick={() => go(-1)} className="absolute left-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white text-olive shadow-lift transition-colors hover:bg-maroon hover:text-white sm:flex lg:left-6">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" aria-label="Next slide" onClick={() => go(1)} className="absolute right-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white text-olive shadow-lift transition-colors hover:bg-maroon hover:text-white sm:flex lg:right-6">
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-2">
            {slides.map((_, idx) => (
              <button key={idx} aria-label={`Slide ${idx + 1}`} aria-current={idx === i} onClick={() => setI(idx)} className={cn("h-2.5 rounded-full transition-all", idx === i ? "w-2.5 bg-maroon ring-2 ring-white/70" : "w-2.5 bg-white/80 hover:bg-white")} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
