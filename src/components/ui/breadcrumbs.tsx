import Link from "next/link";
import { Fragment } from "react";

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-xs text-muted">
      <ol className="flex flex-wrap items-center gap-1">
        <li>
          <Link href="/" className="hover:text-olive">Home</Link>
        </li>
        {items.map((it, i) => (
          <Fragment key={i}>
            <li aria-hidden>/</li>
            <li className={i === items.length - 1 ? "text-olive" : undefined}>{it.href ? <Link href={it.href} className="hover:text-olive">{it.label}</Link> : it.label}</li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}
