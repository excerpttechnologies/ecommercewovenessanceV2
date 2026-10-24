"use client";
import Image from "next/image";
import Link from "next/link";
import { cn, isRemoteImageSource } from "@/lib/utils";
import type { MenuNode } from "@/repositories/web/site.repository";

/** Full-width mega menu. Columns = child "group" nodes; leaves = links (attribute filters). */
export function MegaMenu({ item, open }: { item: MenuNode; open: boolean }) {
  const groups = item.children.filter((c) => c.kind === "group" && c.children.length);
  const loose = item.children.filter((c) => c.kind === "link");
  const image = item.image ?? item.children.find((c) => c.image)?.image;
  return (
    <div className={cn("absolute inset-x-0 top-full border-b border-line bg-ivory shadow-[0_24px_40px_-24px_rgba(0,0,0,0.35)] transition-all duration-200", open ? "visible translate-y-0 opacity-100" : "invisible -translate-y-1 opacity-0")}>
      <div className="mx-auto grid max-w-site grid-cols-12 gap-8 px-6 py-8">
        <div className={cn("grid gap-8", image ? "col-span-9" : "col-span-12", groups.length >= 4 ? "grid-cols-4" : "grid-cols-3")}>
          {groups.map((g) => (
            <div key={g.id}>
              <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.22em] text-gold">{g.label}</p>
              <ul className="space-y-1.5">
                {g.children.map((l) => (
                  <li key={l.id}>
                    <Link href={l.href ?? "#"} className="text-sm text-ink hover:text-maroon">
                      {l.label}
                      {l.badge && <span className="ml-2 rounded-sm bg-gold/20 px-1 text-[9px] uppercase text-gold">{l.badge}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {loose.length > 0 && (
            <ul className="space-y-1.5">
              {loose.map((l) => (
                <li key={l.id}><Link href={l.href ?? "#"} className="text-sm text-ink hover:text-maroon">{l.label}</Link></li>
              ))}
            </ul>
          )}
        </div>
        {image && (
          <Link href={item.href ?? "#"} className="col-span-3 group relative block overflow-hidden rounded-sm">
            <div className="relative aspect-[4/5]">
              <Image src={image} alt={item.label} fill unoptimized={isRemoteImageSource(image)} sizes="300px" className="object-cover transition-transform duration-700 group-hover:scale-105" />
            </div>
            <span className="absolute bottom-3 left-3 rounded-sm bg-ivory/90 px-3 py-1 text-xs uppercase tracking-widest text-olive">Explore {item.label}</span>
          </Link>
        )}
      </div>
    </div>
  );
}
