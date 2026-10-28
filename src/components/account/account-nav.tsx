"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Heart, LayoutDashboard, MapPin, Package } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/account", label: "Overview", icon: LayoutDashboard },
  { href: "/account/orders", label: "Orders", icon: Package },
  { href: "/account/addresses", label: "Addresses", icon: MapPin },
  { href: "/wishlist", label: "Wishlist", icon: Heart },
];

/** Account section nav inside the sidebar card: a swipeable pill row on phones, a vertical list from md up. */
export function AccountNav() {
  const pathname = usePathname();
  const active = (href: string) => (href === "/account" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));
  return (
    <nav aria-label="Account" className="we-scroller flex gap-2 overflow-x-auto pb-0.5 md:flex-col md:gap-1 md:overflow-visible md:pb-0">
      {NAV.map(({ href, label, icon: Icon }) => {
        const on = active(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={on ? "page" : undefined}
            className={cn(
              "group flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors md:rounded-xl md:px-3 md:py-2.5",
              on ? "bg-maroon text-white shadow-[0_8px_20px_-10px_rgba(219,26,114,0.9)]" : "bg-white text-ink/75 ring-1 ring-black/[0.05] hover:bg-maroon/[0.06] hover:text-maroon md:bg-transparent md:ring-0",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1">{label}</span>
            <ChevronRight className={cn("hidden h-4 w-4 transition-transform group-hover:translate-x-0.5 md:block", on ? "text-white/80" : "text-maroon/50")} />
          </Link>
        );
      })}
    </nav>
  );
}
