"use client";
import { LogOut, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { NavItem } from "@/lib/admin/nav";
import { cn } from "@/lib/utils";
import { Providers } from "@/components/providers";
import { Badge } from "@/components/ui/badge";

export function AdminShell({ nav, user, dataSource, children }: { nav: NavItem[]; user: { name: string; email: string; role: string }; dataSource: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const groups = Array.from(new Set(nav.map((n) => n.group)));
  const active = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));
  const sidebar = (
    <nav className="flex h-full flex-col">
      <div className="border-b border-line px-5 py-4">
        <Link href="/admin" className="font-heading text-2xl text-olive">Woven Essence</Link>
        <p className="text-[10px] uppercase tracking-[0.25em] text-gold">Admin</p>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {groups.map((g) => (
          <div key={g} className="mb-4">
            <p className="px-2 pb-1 text-[10px] uppercase tracking-[0.2em] text-muted">{g}</p>
            {nav.filter((n) => n.group === g).map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className={cn("block rounded-sm px-2 py-1.5 text-sm text-ink/80 hover:bg-olive/5", active(n.href) && "bg-olive text-ivory hover:bg-olive")}>{n.label}</Link>
            ))}
          </div>
        ))}
      </div>
      <div className="border-t border-line p-4 text-xs">
        <p className="font-medium">{user.name}</p>
        <p className="text-muted">{user.email} · {user.role}</p>
        <div className="mt-2 flex items-center justify-between">
          <Badge tone={dataSource === "erp" ? "green" : "amber"}>{dataSource === "erp" ? "RetailERP live" : "Mock data"}</Badge>
          <button onClick={async () => { await fetch("/api/v1/admin/auth/logout", { method: "POST" }); router.push("/admin/login"); router.refresh(); }} className="flex items-center gap-1 text-muted hover:text-maroon"><LogOut className="h-3.5 w-3.5" /> Log out</button>
        </div>
        <Link href="/" target="_blank" className="mt-2 block text-muted hover:text-olive">View storefront ↗</Link>
      </div>
    </nav>
  );
  return (
    <Providers>
      <div className="flex min-h-screen bg-white">
        <aside className="hidden w-60 shrink-0 border-r border-line bg-ivory lg:block">{sidebar}</aside>
        <div className={cn("fixed inset-0 z-50 lg:hidden", open ? "" : "pointer-events-none")}>
          <div onClick={() => setOpen(false)} className={cn("absolute inset-0 bg-ink/40 transition-opacity", open ? "opacity-100" : "opacity-0")} />
          <aside className={cn("absolute inset-y-0 left-0 w-64 bg-ivory transition-transform", open ? "translate-x-0" : "-translate-x-full")}>{sidebar}</aside>
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 items-center gap-3 border-b border-line px-4 lg:px-8">
            <button className="lg:hidden" onClick={() => setOpen((v) => !v)} aria-label="Menu">{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
            <p className="text-xs uppercase tracking-[0.2em] text-muted">{nav.find((n) => active(n.href))?.label ?? "Admin"}</p>
          </header>
          <main className="flex-1 p-4 lg:p-8">{children}</main>
        </div>
      </div>
    </Providers>
  );
}
