"use client";
import Image from "next/image";
import Link from "next/link";
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

export function HeroCarousel({ slides, interval = 6000 }: { slides: HeroSlide[]; interval?: number }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setI((v) => (v + 1) % slides.length), interval);
    return () => clearInterval(t);
  }, [slides.length, interval]);
  if (!slides.length) return null;
  return (
    <section className="relative aspect-[4/5] w-full overflow-hidden bg-line sm:aspect-[21/9]" aria-roledescription="carousel">
      {slides.map((s, idx) => (
        <div key={s.id} className={cn("absolute inset-0 transition-opacity duration-1000", idx === i ? "opacity-100" : "opacity-0")} aria-hidden={idx !== i}>
          <picture>
            {s.mobile && <source media="(max-width: 640px)" srcSet={s.mobile} />}
            {s.desktop ? <Image src={s.desktop} alt={s.alt ?? s.title ?? ""} fill priority={idx === 0} unoptimized={isRemoteImageSource(s.desktop)} sizes="100vw" className="object-cover object-top" /> : <ComingSoonImage className="absolute inset-0" />}
          </picture>
          <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-ink/10 to-transparent sm:bg-gradient-to-r sm:from-ink/50 sm:via-ink/10" />
          <div className={cn("absolute inset-0 mx-auto flex max-w-site flex-col justify-end px-6 pb-14 text-ivory sm:justify-center sm:pb-0", s.align === "center" && "items-center text-center", s.align === "right" && "items-end text-right")}>
            {s.subtitle && <p className="mb-2 text-[11px] uppercase tracking-[0.3em] text-gold">{s.subtitle}</p>}
            {s.title && <h1 className="max-w-xl font-heading text-4xl text-ivory sm:text-6xl">{s.title}</h1>}
            {s.ctaHref && (
              <Link href={s.ctaHref} className={buttonClass("primary", "lg", "mt-6 w-fit")}>{s.ctaLabel ?? "Shop now"}</Link>
            )}
          </div>
        </div>
      ))}
      {slides.length > 1 && (
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
          {slides.map((_, idx) => (
            <button key={idx} aria-label={`Slide ${idx + 1}`} onClick={() => setI(idx)} className={cn("h-1.5 rounded-full transition-all", idx === i ? "w-8 bg-gold" : "w-3 bg-ivory/60")} />
          ))}
        </div>
      )}
    </section>
  );
}
