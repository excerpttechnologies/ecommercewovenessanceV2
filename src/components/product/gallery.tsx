"use client";
import Image from "next/image";
import { useState } from "react";
import { cn, isRemoteImageSource } from "@/lib/utils";

export function Gallery({ images, alt, badge }: { images: string[]; alt: string; badge?: string }) {
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const src = images[i];
  return (
    <div className="grid gap-3 md:grid-cols-[72px_1fr]">
      <ul className="order-2 flex gap-2 overflow-x-auto md:order-1 md:flex-col">
        {images.map((img, idx) => (
          <li key={img + idx}>
            <button onClick={() => setI(idx)} aria-label={`Image ${idx + 1}`} className={cn("relative h-20 w-16 shrink-0 overflow-hidden rounded-sm border bg-line", idx === i ? "border-gold" : "border-transparent")}>
              <Image src={img} alt="" fill unoptimized={isRemoteImageSource(img)} sizes="64px" className="object-cover" />
            </button>
          </li>
        ))}
      </ul>
      <div
        className="relative order-1 aspect-[3/4] overflow-hidden rounded-sm bg-line md:order-2"
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
        }}
        onMouseLeave={() => setZoom(null)}
      >
        {src ? <Image src={src} alt={alt} fill priority unoptimized={isRemoteImageSource(src)} sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover transition-transform duration-200" style={zoom ? { transform: "scale(1.8)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined} /> : <ComingSoonFallback />}
        {badge && <span className="absolute left-3 top-3 rounded-sm bg-olive px-2 py-0.5 text-[10px] uppercase tracking-widest text-ivory">{badge}</span>}
      </div>
    </div>
  );
}

function ComingSoonFallback() {
  return <div className="absolute inset-0 flex items-center justify-center bg-ivory"><span className="border border-line px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-muted">Coming Soon</span></div>;
}
