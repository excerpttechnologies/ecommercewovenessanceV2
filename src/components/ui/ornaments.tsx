import { cn } from "@/lib/utils";

/** Outline lotus, drawn in currentColor. */
export function Lotus({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 32" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M24 3c4 5 5.5 11 0 22-5.5-11-4-17 0-22Z" />
      <path d="M24 25c-1.5-7-6-12-12.5-13.5C11 18 15.5 23.5 24 25Z" />
      <path d="M24 25c1.5-7 6-12 12.5-13.5C37 18 32.5 23.5 24 25Z" />
      <path d="M24 25c-5-3-11-4-17.5-2.5C10 27 17 27.5 24 25Z" />
      <path d="M24 25c5-3 11-4 17.5-2.5C38 27 31 27.5 24 25Z" />
      <path d="M14 29h20" strokeLinecap="round" />
    </svg>
  );
}

/** Thin brass rule with diamond ends and a lotus in the middle. */
export function LotusDivider({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center gap-2 text-brass", className)} aria-hidden>
      <span className="h-1.5 w-1.5 rotate-45 bg-current" />
      <span className="h-px w-16 bg-current opacity-70 sm:w-40 lg:w-56" />
      <Lotus className="h-7 w-10 shrink-0" />
      <span className="h-px w-16 bg-current opacity-70 sm:w-40 lg:w-56" />
      <span className="h-1.5 w-1.5 rotate-45 bg-current" />
    </div>
  );
}

/** Faint line-drawn foliage for section corners. Mirror it with `-scale-x-100`. */
export function LeafSpray({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 260" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className={cn("pointer-events-none select-none", className)} aria-hidden>
      <path d="M20 250C60 190 90 130 150 20" />
      <path d="M48 205c-30-8-42-30-40-58 26 6 40 28 40 58Z" />
      <path d="M48 205c26-14 52-12 72 4-22 16-50 14-72-4Z" />
      <path d="M78 150c-28-12-36-36-30-62 24 10 34 34 30 62Z" />
      <path d="M78 150c24-18 50-20 72-6-20 20-48 22-72 6Z" />
      <path d="M108 95c-22-16-24-40-14-62 20 14 26 38 14 62Z" />
      <path d="M108 95c22-20 46-26 70-16-16 22-44 28-70 16Z" />
      <path d="M150 20c4 14 2 28-8 38" />
      <path d="M30 236c-14-4-22-14-22-28 12 4 20 14 22 28Z" />
    </svg>
  );
}
