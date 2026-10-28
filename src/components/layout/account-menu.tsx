"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Heart, LayoutDashboard, LogIn, Mail, MapPin, Package, Phone, User, UserPlus } from "lucide-react";
import type { Customer } from "@/domain/types";
import { api } from "@/hooks/api";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/account/logout-button";

const LINKS = [
  { href: "/account", label: "Overview", icon: LayoutDashboard },
  { href: "/account/orders", label: "Orders", icon: Package },
  { href: "/account/addresses", label: "Addresses", icon: MapPin },
  { href: "/wishlist", label: "Wishlist", icon: Heart },
];

/**
 * Header account icon: clicking still goes to /account; hovering (or tabbing onto it) opens a card like the
 * account sidebar. Who is signed in is only fetched once the card is first opened, and again per page.
 */
export function AccountMenu({ className, buttonClassName }: { className?: string; buttonClassName: string }) {
  const pathname = usePathname();
  const [opened, setOpened] = useState(false);
  const me = useQuery({
    queryKey: ["account-menu-me", pathname],
    queryFn: async () => (await api<Customer | null>("/api/v1/auth/me")).data,
    enabled: opened,
    staleTime: 30_000,
  });
  const customer = me.data;
  const login = `/login?next=${encodeURIComponent(pathname)}`;

  return (
    <div className={cn("group/account relative", className)} onMouseEnter={() => setOpened(true)} onFocus={() => setOpened(true)}>
      <Link href="/account" className={buttonClassName} aria-label="Account">
        <User className="h-5 w-5" strokeWidth={1.75} />
      </Link>
      <div className="invisible absolute right-0 top-full z-[60] w-64 translate-y-1 pt-2 opacity-0 transition-all duration-150 group-focus-within/account:visible group-focus-within/account:translate-y-0 group-focus-within/account:opacity-100 group-hover/account:visible group-hover/account:translate-y-0 group-hover/account:opacity-100">
        <div className="overflow-hidden rounded-2xl bg-white text-left shadow-[0_24px_50px_-20px_rgba(122,18,56,0.45)] ring-1 ring-black/[0.06]">
          {me.isPending ? (
            <div className="space-y-2 px-5 py-5" aria-busy>
              <span className="block h-2.5 w-20 animate-pulse rounded bg-line" />
              <span className="block h-5 w-36 animate-pulse rounded bg-line" />
              <span className="block h-3 w-44 animate-pulse rounded bg-line" />
            </div>
          ) : customer ? (
            <>
              <div className="border-b border-line/70 px-5 pb-4 pt-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-maroon">My account</p>
                <p className="truncate font-display text-xl font-semibold text-[#8c1048]">Hello, {customer.name || "there"}</p>
                <div className="mt-3 space-y-1.5 text-xs text-ink/75">
                  {customer.email && <p className="flex min-w-0 items-center gap-2"><Mail className="h-3.5 w-3.5 shrink-0 text-maroon/70" /><span className="truncate" title={customer.email}>{customer.email}</span></p>}
                  {customer.mobile && <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 shrink-0 text-maroon/70" />+91 {customer.mobile}</p>}
                </div>
              </div>
              <nav aria-label="Account" className="flex flex-col gap-1 p-2">
                {LINKS.map(({ href, label, icon: Icon }) => {
                  const on = href === "/account" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
                  return (
                    <Link key={href} href={href} aria-current={on ? "page" : undefined} className={cn("group/link flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors", on ? "bg-maroon text-white shadow-[0_8px_20px_-10px_rgba(219,26,114,0.9)]" : "text-ink/75 hover:bg-maroon/[0.06] hover:text-maroon")}>
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1">{label}</span>
                      <ChevronRight className={cn("h-4 w-4 transition-transform group-hover/link:translate-x-0.5", on ? "text-white/80" : "text-maroon/50")} />
                    </Link>
                  );
                })}
              </nav>
              <div className="border-t border-line/70 p-3"><LogoutButton /></div>
            </>
          ) : (
            <div className="px-5 py-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-maroon">My account</p>
              <p className="font-display text-xl font-semibold text-[#8c1048]">Welcome</p>
              <p className="mt-1 text-xs text-muted">Log in to see your orders, addresses and wishlist.</p>
              <div className="mt-4 grid gap-2">
                <Link href={login} className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-maroon text-sm font-semibold text-white transition-colors hover:bg-gold"><LogIn className="h-4 w-4" />Log in</Link>
                <Link href="/register" className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-line text-sm font-semibold text-olive transition-colors hover:border-maroon hover:text-maroon"><UserPlus className="h-4 w-4" />Create account</Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
