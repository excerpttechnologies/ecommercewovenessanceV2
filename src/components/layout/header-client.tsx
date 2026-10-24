"use client";
import { ChevronDown, Heart, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CURRENCIES } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { DEFAULT_MENU } from "@/lib/default-menu";
import type { MenuNode } from "@/repositories/web/site.repository";
import { useCart, useWishlist } from "@/hooks/useCart";
import { useUi } from "@/store/ui";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { SearchOverlay } from "./search-overlay";
import { MegaMenu } from "./mega-menu";

interface Props {
  menu: MenuNode[];
  stores: { id: string; name: string; city?: string }[];
  currencies: string[];
  tagline: string;
  logo: React.ReactNode;
  whatsapp: string;
}

export function HeaderClient({ menu, stores, currencies, tagline, logo }: Props) {
  const navItems = menu.length ? menu : DEFAULT_MENU;
  const { cart } = useCart();
  const { skus } = useWishlist();
  const ui = useUi();
  const pathname = usePathname();
  const [active, setActive] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    setActive(null);
    ui.setMenuOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const count = cart?.totals.itemCount ?? 0;

  return (
    <>
      <header className={cn("sticky z-50 border-b border-line bg-ivory/95 backdrop-blur transition-shadow", scrolled && "shadow-[0_2px_20px_-12px_rgba(0,0,0,0.35)]")} style={{ top: "env(safe-area-inset-top, 0px)" }}>
        {/* utility bar */}
        <div className="border-b border-line/70 text-[11px] uppercase tracking-[0.18em] text-muted">
          <div className="mx-auto flex h-8 max-w-site items-center justify-start px-6 md:justify-between">
            <p className="font-heading text-sm normal-case italic tracking-normal text-gold">{tagline}</p>
            <div className="hidden items-center gap-5 md:flex">
              <label className="flex items-center gap-1">
                <span>Store</span>
                <select value={ui.storeId ?? ""} onChange={(e) => ui.setStoreId(e.target.value || undefined)} className="bg-transparent text-olive focus:outline-none">
                  {stores.length === 0 && <option value="">Bangalore Urban</option>}
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-1">
                <span>Currency</span>
                <select value={ui.currency} onChange={(e) => ui.setCurrency(e.target.value)} className="bg-transparent text-olive focus:outline-none">
                  {currencies.filter((c) => CURRENCIES[c]).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </label>
              <Link href="/stores" className="hover:text-olive">Store locator</Link>
              <Link href="/track-order" className="hover:text-olive">Track order</Link>
            </div>
          </div>
        </div>

        {/* main bar */}
        <div className="relative mx-auto flex h-16 max-w-site items-center gap-4 px-4 sm:px-6 md:h-[76px]">
          <button className="rounded-full p-1.5 hover:bg-olive/10 sm:p-2 lg:hidden" aria-label="Menu" onClick={() => ui.setMenuOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1 lg:flex-none">{logo}</div>

          <nav className="hidden flex-1 justify-center lg:flex" onMouseLeave={() => setActive(null)}>
            <ul className="flex items-center gap-8">
              {navItems.map((item) => (
                <li key={item.id} onMouseEnter={() => setActive(item.children.length ? item.id : null)}>
                  <Link
                    href={item.href ?? "#"}
                    className={cn("flex items-center gap-1 py-6 text-[13px] font-medium uppercase tracking-[0.18em] text-olive transition-colors hover:text-maroon", active === item.id && "text-maroon")}
                  >
                    {item.label}
                    {item.badge && <span className="ml-1 rounded-sm bg-maroon px-1.5 py-0.5 text-[9px] text-ivory">{item.badge}</span>}
                    {item.children.length > 0 && <ChevronDown className="h-3 w-3" />}
                  </Link>
                </li>
              ))}
            </ul>
            {navItems.map((item) => item.children.length > 0 && <MegaMenu key={item.id} item={item} open={active === item.id} />)}
          </nav>

          <div className="flex items-center gap-1">
            <button className="rounded-full p-1.5 hover:bg-olive/10 sm:p-2" aria-label="Search" onClick={() => ui.setSearchOpen(true)}>
              <Search className="h-5 w-5" />
            </button>
            <Link href="/account" className="hidden rounded-full p-2 hover:bg-olive/10 sm:block" aria-label="Account">
              <User className="h-5 w-5" />
            </Link>
            <Link href="/wishlist" className="relative rounded-full p-1.5 hover:bg-olive/10 sm:p-2" aria-label="Wishlist">
              <Heart className="h-5 w-5" />
              {skus.length > 0 && <Count n={skus.length} />}
            </Link>
            <button className="relative rounded-full p-1.5 hover:bg-olive/10 sm:p-2" aria-label="Cart" onClick={() => ui.setCartOpen(true)}>
              <ShoppingBag className="h-5 w-5" />
              {count > 0 && <Count n={count} />}
            </button>
          </div>
        </div>
      </header>

      {/* mobile menu */}
      <div className={cn("fixed inset-0 z-[70] lg:hidden", ui.menuOpen ? "pointer-events-auto" : "pointer-events-none")}>
        <div onClick={() => ui.setMenuOpen(false)} className={cn("absolute inset-0 bg-ink/40 transition-opacity", ui.menuOpen ? "opacity-100" : "opacity-0")} />
        <aside className={cn("absolute left-0 top-0 flex h-full w-[86%] max-w-sm flex-col bg-ivory transition-transform duration-300", ui.menuOpen ? "translate-x-0" : "-translate-x-full")} style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="font-heading text-xl text-olive">Menu</span>
            <button onClick={() => ui.setMenuOpen(false)} aria-label="Close"><X className="h-5 w-5" /></button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-2">
            {navItems.map((item) => (
              <MobileItem key={item.id} item={item} />
            ))}
            <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4 text-sm text-muted">
              <Link href="/account">My account</Link>
              <Link href="/stores">Store locator</Link>
              <Link href="/track-order">Track order</Link>
              <label className="flex items-center justify-between">Currency
                <select value={ui.currency} onChange={(e) => ui.setCurrency(e.target.value)} className="bg-transparent text-olive">
                  {currencies.filter((c) => CURRENCIES[c]).map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
            </div>
          </div>
        </aside>
      </div>

      <SearchOverlay />
      <CartDrawer />
    </>
  );
}

function Count({ n }: { n: number }) {
  return <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-maroon px-1 text-[10px] text-ivory">{n}</span>;
}

function MobileItem({ item, depth = 0 }: { item: MenuNode; depth?: number }) {
  const [open, setOpen] = useState(false);
  const hasKids = item.children.length > 0;
  return (
    <div className={cn(depth === 0 && "border-b border-line")}>
      <div className="flex items-center justify-between">
        <Link href={item.href ?? "#"} className={cn("block py-3", depth === 0 ? "text-sm font-medium uppercase tracking-[0.15em] text-olive" : depth === 1 ? "text-xs uppercase tracking-widest text-gold" : "text-sm text-ink")}>
          {item.label}
        </Link>
        {hasKids && (
          <button onClick={() => setOpen((v) => !v)} aria-label="Expand" className="p-2">
            <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
          </button>
        )}
      </div>
      {hasKids && open && <div className="pl-3">{item.children.map((c) => <MobileItem key={c.id} item={c} depth={depth + 1} />)}</div>}
    </div>
  );
}
