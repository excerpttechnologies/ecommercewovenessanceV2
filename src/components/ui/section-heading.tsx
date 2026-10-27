import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** "Shop by Occasion" → "Shop by " + pink "Occasion". Single words stay one colour. */
export function AccentTitle({ title }: { title: string }) {
  const parts = title.trim().split(/\s+/);
  if (parts.length < 2) return <>{title}</>;
  const last = parts.pop();
  return (
    <>
      {parts.join(" ")} <span className="text-maroon">{last}</span>
    </>
  );
}

/** Centred section title with a small pink lotus between two rules: "Shop by occasion", "From our customers"… */
export function OrnateHeading({ title, subtitle, className }: { title: string; subtitle?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mb-8 text-center", className)}>
      <div className="flex items-center justify-center gap-3 text-maroon" aria-hidden>
        <span className="h-px w-16 bg-maroon/40 sm:w-24" />
        <svg viewBox="0 0 48 32" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" className="h-6 w-9">
          <path d="M24 3c4 5 5.5 11 0 22-5.5-11-4-17 0-22Z" />
          <path d="M24 25c-1.5-7-6-12-12.5-13.5C11 18 15.5 23.5 24 25Z" />
          <path d="M24 25c1.5-7 6-12 12.5-13.5C37 18 32.5 23.5 24 25Z" />
          <path d="M24 25c-5-3-11-4-17.5-2.5C10 27 17 27.5 24 25Z" />
          <path d="M24 25c5-3 11-4 17.5-2.5C38 27 31 27.5 24 25Z" />
        </svg>
        <span className="h-px w-16 bg-maroon/40 sm:w-24" />
      </div>
      <h2 className="mt-2 font-display text-4xl font-medium tracking-tight text-olive sm:text-5xl"><AccentTitle title={title} /></h2>
      {subtitle && <p className="mx-auto mt-3 max-w-xl text-[15px] text-muted">{subtitle}</p>}
    </div>
  );
}

export function SectionHeading({ title, subtitle, href, hrefLabel = "View All", align = "left", className }: { title: string; subtitle?: string; href?: string; hrefLabel?: string; align?: "left" | "center"; className?: string }) {
  return (
    <div className={cn("mb-6 flex items-end justify-between gap-4", align === "center" && "flex-col items-center text-center", className)}>
      <div>
        <h2 className="text-2xl font-bold sm:text-[28px]"><AccentTitle title={title} /></h2>
        {subtitle && <p className="mt-1.5 max-w-xl text-sm text-muted">{subtitle}</p>}
      </div>
      {href && (
        <Link href={href} className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-ink hover:text-maroon">
          {hrefLabel} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
