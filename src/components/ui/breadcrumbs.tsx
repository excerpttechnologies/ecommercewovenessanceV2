import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Fragment } from "react";

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-xs text-muted">
      <ol className="flex flex-wrap items-center gap-1.5">
        <li>
          <Link href="/" className="hover:text-maroon">Home</Link>
        </li>
        {items.map((it, i) => (
          <Fragment key={i}>
            <li aria-hidden><ChevronRight className="h-3 w-3" /></li>
            <li className={i === items.length - 1 ? "font-medium text-maroon" : undefined}>{it.href ? <Link href={it.href} className="hover:text-maroon">{it.label}</Link> : it.label}</li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}
