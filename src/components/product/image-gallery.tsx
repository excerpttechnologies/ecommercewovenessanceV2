"use client";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Image as ImageIcon, X, ZoomIn } from "lucide-react";
import { cn, isRemoteImageSource } from "@/lib/utils";

export type GalleryImage = { src: string; label?: string };

/**
 * Remote ERP/CDN photos are already processed by their source and bypass Next's optimizer.
 * Website-uploaded photos are site-relative, so Next resizes/compresses them for each viewport.
 */
const unoptimized = (src: string) => isRemoteImageSource(src);

/**
 * Product image gallery used by both storefront product detail layouts.
 *
 * Desktop: vertical thumbnails on the left, large image on the right.
 * Mobile: main image first, horizontal thumbnails below it.
 * Supports click/arrow/keyboard navigation, swipe, hover zoom and full screen.
 * A single image renders exactly like the previous single-photo layout.
 */
export function ImageGallery({
  images,
  alt,
  badge,
  discount,
  mainAspectClassName = "aspect-[3/4]",
  className,
}: {
  images: GalleryImage[];
  alt: string;
  badge?: string;
  discount?: number;
  mainAspectClassName?: string;
  className?: string;
}) {
  const items = images.filter((image) => image.src && image.src.trim());
  const [active, setActive] = useState(0);
  const [origin, setOrigin] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const thumbRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const touchStart = useRef<number | null>(null);
  const count = items.length;
  const current = items[Math.min(active, Math.max(count - 1, 0))];
  const multiple = count > 1;

  useEffect(() => {
    setActive((value) => Math.min(value, Math.max(count - 1, 0)));
  }, [count]);

  const go = useCallback((delta: number) => {
    if (count < 2) return;
    setActive((value) => (value + delta + count) % count);
    setOrigin(null);
  }, [count]);

  // Keep the selected thumbnail visible in the mobile horizontal strip.
  useEffect(() => {
    thumbRefs.current[active]?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [active]);

  // Full-screen keyboard controls and scroll lock.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if (event.key === "ArrowLeft") go(-1);
      if (event.key === "ArrowRight") go(1);
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, go]);

  const markLoaded = (src: string) => setLoaded((state) => (state[src] ? state : { ...state, [src]: true }));
  const markFailed = (src: string) => setFailed((state) => (state[src] ? state : { ...state, [src]: true }));

  if (!current) {
    return (
      <div className={cn("grid gap-3", className)}>
        <div className={cn("relative overflow-hidden rounded-lg bg-line", mainAspectClassName)}>
          <div className="absolute inset-0 flex items-center justify-center bg-ivory">
            <span className="border border-line px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-muted">Coming Soon</span>
          </div>
        </div>
      </div>
    );
  }

  const selectedIndex = Math.min(active, count - 1);
  const selectedFailed = failed[current.src];

  return (
    <div className={cn("grid gap-3", multiple ? "md:grid-cols-[76px_minmax(0,1fr)]" : "", className)}>
      {multiple && (
        <ul
          className="order-2 flex gap-2 overflow-x-auto pb-1 md:order-1 md:flex-col md:overflow-visible md:pb-0"
          aria-label="Product images"
        >
          {items.map((image, index) => {
            const isActive = index === selectedIndex;
            return (
              <li key={`${image.src}-${index}`}>
                <button
                  ref={(node) => { thumbRefs.current[index] = node; }}
                  type="button"
                  onClick={() => { setActive(index); setOrigin(null); }}
                  aria-label={image.label ? `View ${image.label}` : `Image ${index + 1}`}
                  aria-current={isActive ? "true" : undefined}
                  className={cn(
                    "relative block h-20 w-16 shrink-0 overflow-hidden rounded-lg border bg-line transition-colors",
                    isActive ? "border-gold ring-1 ring-gold/30" : "border-line hover:border-gold/50",
                  )}
                >
                  {failed[image.src] ? (
                    <span className="absolute inset-0 flex items-center justify-center text-muted"><ImageIcon className="h-4 w-4" /></span>
                  ) : (
                    <Image
                      src={image.src}
                      alt={image.label ? `${alt} — ${image.label}` : ""}
                      fill
                      unoptimized={unoptimized(image.src)}
                      sizes="64px"
                      className="object-cover"
                      onError={() => markFailed(image.src)}
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="order-1 min-w-0 md:order-2">
        <div
          className={cn("group relative overflow-hidden rounded-2xl bg-ivory", mainAspectClassName)}
          onMouseMove={(event) => {
            if (selectedFailed) return;
            const rect = event.currentTarget.getBoundingClientRect();
            setOrigin(`${((event.clientX - rect.left) / rect.width) * 100}% ${((event.clientY - rect.top) / rect.height) * 100}%`);
          }}
          onMouseLeave={() => setOrigin(null)}
          onTouchStart={(event) => { touchStart.current = event.touches[0]?.clientX ?? null; }}
          onTouchEnd={(event) => {
            const start = touchStart.current;
            touchStart.current = null;
            if (start == null || count < 2) return;
            const delta = (event.changedTouches[0]?.clientX ?? start) - start;
            if (Math.abs(delta) > 40) go(delta < 0 ? 1 : -1);
          }}
        >
          {selectedFailed ? (
            <div role="img" aria-label={`Photo unavailable for ${alt}`} className="absolute inset-0 flex items-end justify-center bg-[#fbe3ea] bg-[url('/placeholders/photo-unavailable.webp')] bg-cover bg-center pb-[12%]">
              <span className="flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-maroon">
                <ImageIcon className="h-4 w-4" /> Photo unavailable
              </span>
            </div>
          ) : (
            <>
              {!loaded[current.src] && <span aria-hidden className="pointer-events-none absolute inset-0 animate-pulse bg-line" />}
              <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label="View photo full screen"
                className="absolute inset-0 cursor-zoom-in"
              >
                <Image
                  key={current.src}
                  src={current.src}
                  alt={current.label ? `${alt} — ${current.label}` : alt}
                  fill
                  priority={selectedIndex === 0}
                  unoptimized={unoptimized(current.src)}
                  sizes="(min-width: 1024px) 45vw, 100vw"
                  onLoad={() => markLoaded(current.src)}
                  onError={() => markFailed(current.src)}
                  style={origin ? { transformOrigin: origin } : undefined}
                  className={cn("object-contain transition-transform duration-200", origin && "scale-[1.8]")}
                />
              </button>
            </>
          )}

          <div className="pointer-events-none absolute left-3 top-3 flex flex-col items-start gap-1.5">
            {badge && <span className="rounded-full bg-maroon px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">{badge}</span>}
            {!!discount && discount > 0 && <span className="rounded-full bg-maroon px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">{discount}% OFF</span>}
          </div>

          {multiple && (
            <>
              <button
                type="button"
                aria-label="Previous image"
                onClick={(event) => { event.stopPropagation(); go(-1); }}
                className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-olive shadow-card transition-opacity hover:bg-white md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="Next image"
                onClick={(event) => { event.stopPropagation(); go(1); }}
                className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-olive shadow-card transition-opacity hover:bg-white md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-olive shadow-card">
                {selectedIndex + 1} / {count}
              </span>
            </>
          )}

          {!selectedFailed && current.label && (
            <span className="pointer-events-none absolute bottom-3 right-3 hidden max-w-[60%] truncate rounded-full bg-white/90 px-3 py-1 text-[11px] font-medium text-olive shadow-card sm:block">
              {current.label}
            </span>
          )}

          {!selectedFailed && (
            <span className="pointer-events-none absolute right-3 top-3 hidden items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-medium text-olive shadow-card lg:flex">
              <ZoomIn className="h-3 w-3" /> Zoom
            </span>
          )}
        </div>
      </div>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${alt} full screen gallery`}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 p-4"
          onClick={() => setOpen(false)}
        >
          <button
            type="button"
            autoFocus
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white text-olive"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="relative h-full w-full max-w-5xl" onClick={(event) => event.stopPropagation()}>
            <Image
              src={current.src}
              alt={current.label ? `${alt} — ${current.label}` : alt}
              fill
              unoptimized={unoptimized(current.src)}
              sizes="100vw"
              className="object-contain"
            />
            {multiple && (
              <>
                <button
                  type="button"
                  aria-label="Previous image"
                  onClick={() => go(-1)}
                  className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-olive shadow-card hover:bg-white"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  aria-label="Next image"
                  onClick={() => go(1)}
                  className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-olive shadow-card hover:bg-white"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
                <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-olive shadow-card">
                  {selectedIndex + 1} / {count}{current.label ? ` · ${current.label}` : ""}
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
