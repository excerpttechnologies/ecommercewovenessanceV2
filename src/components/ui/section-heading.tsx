import Link from "next/link";
import { cn } from "@/lib/utils";

export function SectionHeading({ title, subtitle, href, hrefLabel = "View all", align = "left", className }: { title: string; subtitle?: string; href?: string; hrefLabel?: string; align?: "left" | "center"; className?: string }) {
  return (
    <div className={cn("mb-6 flex items-end justify-between gap-4", align === "center" && "flex-col items-center text-center", className)}>
      <div>
        <h2 className={cn("we-rule text-3xl sm:text-4xl", align === "center" && "after:left-1/2 after:-translate-x-1/2")}>{title}</h2>
        {subtitle && <p className="mt-3 max-w-xl text-sm text-muted">{subtitle}</p>}
      </div>
      {href && (
        <Link href={href} className="text-xs font-medium uppercase tracking-[0.2em] text-maroon underline-offset-4 hover:underline">
          {hrefLabel} →
        </Link>
      )}
    </div>
  );
}
