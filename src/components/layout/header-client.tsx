// "use client";
// import { BadgeCheck, Banknote, ChevronDown, Headphones, Home, IndianRupee, Heart, MapPin, Menu, Package, Search, ShoppingCart, Truck, X } from "lucide-react";
// import Link from "next/link";
// import { usePathname, useRouter, useSearchParams } from "next/navigation";
// import { useEffect, useRef, useState } from "react";
// import { CURRENCIES } from "@/lib/currency";
// import { cn } from "@/lib/utils";
// import { DEFAULT_MENU } from "@/lib/default-menu";
// import type { MenuNode } from "@/repositories/web/site.repository";
// import { useCart, useWishlist } from "@/hooks/useCart";
// import { useUi } from "@/store/ui";
// import { CartDrawer } from "@/components/cart/cart-drawer";
// import { AnnouncementBar, type AnnouncementItem } from "./announcement-bar";
// import { SearchOverlay } from "./search-overlay";
// import { MegaMenu } from "./mega-menu";
// import { AccountMenu } from "./account-menu";
// import { ADD_ON_CATEGORIES, ADD_ON_CATEGORY_SLUGS, isAddOnCategorySlug } from "@/lib/add-on-categories";

// interface Props {
//   menu: MenuNode[];
//   messages: string[];
//   stores: { id: string; name: string; city?: string }[];
//   currencies: string[];
//   tagline: string;
//   logo: React.ReactNode;
//   whatsapp: string;
// }

// const MESSAGE_ICONS = [Truck, BadgeCheck, Banknote];

// /** How well a menu href matches the current URL: -1 = no match, otherwise the number of query params it pins. */
// function matchScore(href: string | undefined, pathname: string, search: URLSearchParams): number {
//   if (!href || href === "#") return -1;
//   const [path, query = ""] = href.split("?");
//   const pathMatches = path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(`${path}/`);
//   if (!pathMatches) return -1;
//   const wanted = [...new URLSearchParams(query).entries()];
//   return wanted.every(([k, v]) => search.get(k) === v) ? wanted.length : -1;
// }

// /** The single top-level item that best matches the URL ("New Arrivals" over "Sarees" on ?sort=newest). */
// function activeItemId(items: MenuNode[], pathname: string, search: URLSearchParams): string | null {
//   let best: { id: string; score: number } | null = null;
//   for (const item of items) {
//     const score = matchScore(item.href, pathname, search);
//     if (score >= 0 && (!best || score > best.score)) best = { id: item.id, score };
//   }
//   return best?.id ?? null;
// }

// const ADD_ON_ITEM_PREFIX = "storefront-add-on-";

// function withAddOnMenu(items: MenuNode[]): MenuNode[] {
//   const menu = items.filter((item) =>
//     !item.id.startsWith(ADD_ON_ITEM_PREFIX)
//     && item.id !== "storefront-add-on"
//     && item.label.trim().toLowerCase().replace(/\s+/g, " ") !== "add on"
//     && item.href !== "/collections/add-on",
//   );
//   const addOnItems: MenuNode[] = ADD_ON_CATEGORY_SLUGS.map((slug) => ({
//     id: `${ADD_ON_ITEM_PREFIX}${slug}`,
//     label: ADD_ON_CATEGORIES[slug].name,
//     kind: "top",
//     href: `/collections/${slug}`,
//     children: [],
//   }));
//   const dupattaIndex = menu.findIndex((item) => item.href?.split("?")[0] === "/collections/dupatta" || /dupatta/i.test(item.label));
//   const insertAt = dupattaIndex < 0 ? menu.length : dupattaIndex + 1;
//   return [...menu.slice(0, insertAt), ...addOnItems, ...menu.slice(insertAt)];
// }

// export function HeaderClient({ menu, messages, stores, currencies, logo }: Props) {
//   const navItems = withAddOnMenu(menu.length ? menu : DEFAULT_MENU);
//   const hasHome = navItems.some((item) => item.href === "/");
//   const { cart } = useCart();
//   const { skus } = useWishlist();
//   const ui = useUi();
//   const pathname = usePathname();
//   const searchParams = useSearchParams();
//   const router = useRouter();
//   const [active, setActive] = useState<string | null>(null);
//   const [scrolled, setScrolled] = useState(false);
//   const [query, setQuery] = useState("");
//   const lastPointer = useRef<string>("mouse");
//   const navRef = useRef<HTMLElement>(null);

//   useEffect(() => {
//     const onScroll = () => setScrolled(window.scrollY > 24);
//     onScroll();
//     window.addEventListener("scroll", onScroll, { passive: true });
//     return () => window.removeEventListener("scroll", onScroll);
//   }, []);
//   // Any navigation (path or query) closes the dropdown and the mobile drawer.
//   const search = searchParams.toString();
//   useEffect(() => {
//     setActive(null);
//     ui.setMenuOpen(false);
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [pathname, search]);
//   // Remember how the visitor is interacting so hover/focus only open dropdowns for mouse and keyboard.
//   useEffect(() => {
//     const onPointer = (e: PointerEvent) => { lastPointer.current = e.pointerType || "mouse"; };
//     const onKey = () => { lastPointer.current = "keyboard"; };
//     document.addEventListener("pointerdown", onPointer, true);
//     document.addEventListener("keydown", onKey, true);
//     return () => {
//       document.removeEventListener("pointerdown", onPointer, true);
//       document.removeEventListener("keydown", onKey, true);
//     };
//   }, []);
//   // Touch screens have no hover: a tap outside the open dropdown closes it.
//   useEffect(() => {
//     if (!active) return;
//     const onDown = (e: PointerEvent) => {
//       if (navRef.current && !navRef.current.contains(e.target as Node)) setActive(null);
//     };
//     document.addEventListener("pointerdown", onDown);
//     return () => document.removeEventListener("pointerdown", onDown);
//   }, [active]);

//   const count = cart?.totals.itemCount ?? 0;
//   const currencyOptions = currencies.filter((c) => CURRENCIES[c]);
//   const linkClass = "hover:text-maroon";
//   const addOnSlug = pathname.match(/^\/collections\/([^/]+)/)?.[1];
//   const currentId = addOnSlug && isAddOnCategorySlug(addOnSlug)
//     ? `${ADD_ON_ITEM_PREFIX}${addOnSlug}`
//     : activeItemId(navItems, pathname, searchParams);
//   const close = () => setActive(null);
//   const isTouch = () => lastPointer.current === "touch" || lastPointer.current === "pen";

//   const barItems: AnnouncementItem[] = [
//     {
//       key: "store",
//       icon: MapPin,
//       content: (
//         <label className="flex items-center gap-1 text-olive/60">
//           Store
//           <select value={ui.storeId ?? ""} onChange={(e) => ui.setStoreId(e.target.value || undefined)} className="cursor-pointer bg-transparent font-medium text-olive focus:outline-none">
//             {stores.length === 0 && <option value="">Bangalore Urban</option>}
//             {stores.map((s) => (
//               <option key={s.id} value={s.id}>{s.name}</option>
//             ))}
//           </select>
//         </label>
//       ),
//     },
//     {
//       key: "currency",
//       icon: IndianRupee,
//       content: (
//         <label className="flex items-center gap-1 text-olive/60">
//           Currency
//           <select value={ui.currency} onChange={(e) => ui.setCurrency(e.target.value)} className="cursor-pointer bg-transparent font-medium text-olive focus:outline-none">
//             {currencyOptions.map((c) => (
//               <option key={c} value={c}>{c}</option>
//             ))}
//           </select>
//         </label>
//       ),
//     },
//     ...messages.map((m, i): AnnouncementItem => ({ key: `msg-${i}`, icon: MESSAGE_ICONS[i] ?? BadgeCheck, content: <span>{m}</span> })),
//     { key: "track", icon: Package, content: <Link href="/track-order" className={linkClass}>Track Order</Link> },
//     { key: "stores", icon: MapPin, content: <Link href="/stores" className={linkClass}>Store Locator</Link> },
//     { key: "support", icon: Headphones, content: <Link href="/contact" className={linkClass}>Customer Support</Link> },
//   ];

//   return (
//     <>
//       <AnnouncementBar items={barItems} />

//       <header className={cn("sticky z-50 bg-white transition-shadow duration-300", scrolled ? "shadow-[0_10px_30px_-18px_rgba(122,18,56,0.45)]" : "shadow-[0_6px_20px_-18px_rgba(122,18,56,0.35)]")} style={{ top: "env(safe-area-inset-top, 0px)" }}>
//         {/* main bar: silk-and-lotus strip behind logo, search and icons; it tightens once the page scrolls */}
//         <div className="bg-[url('/header-bg.webp')] bg-cover bg-center">
//           <div className={cn("mx-auto flex max-w-site items-center gap-3 px-4 transition-[height] duration-300 sm:px-6 md:grid md:grid-cols-[minmax(160px,1fr)_minmax(0,620px)_minmax(160px,1fr)] md:gap-8", scrolled ? "h-14 md:h-[68px]" : "h-16 md:h-[84px]")}>
//             {/* Left and right columns share the leftover width equally, so the search sits in the exact centre. */}
//             <div className="flex flex-1 items-center gap-3 md:basis-0">
//               <button className={iconBtn("lg:hidden")} aria-label="Menu" onClick={() => ui.setMenuOpen(true)}>
//                 <Menu className="h-5 w-5" />
//               </button>
//               <div className={cn("shrink-0 origin-left transition-transform duration-300", scrolled ? "scale-[0.72] md:scale-[0.8]" : "scale-[0.82] md:scale-100")}>{logo}</div>
//             </div>

//             <form
//               role="search"
//               className="group/search relative hidden w-full min-w-0 md:block"
//               onSubmit={(e) => {
//                 e.preventDefault();
//                 const q = query.trim();
//                 if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
//               }}
//             >
//               <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-olive/70 transition-colors group-focus-within/search:text-maroon" />
//               <input
//                 type="text"
//                 inputMode="search"
//                 enterKeyHint="search"
//                 value={query}
//                 onChange={(e) => setQuery(e.target.value)}
//                 placeholder="Search sarees, fabrics, dupattas..."
//                 aria-label="Search products"
//                 className={cn("w-full rounded-full border border-white bg-white/95 pl-14 pr-24 text-[15px] text-ink shadow-[0_8px_24px_-14px_rgba(122,18,56,0.45)] placeholder:text-muted transition-[height,box-shadow] focus:border-maroon/40 focus:outline-none focus:ring-4 focus:ring-maroon/10", scrolled ? "h-11" : "h-12")}
//               />
//               {query && (
//                 <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="absolute right-[3.6rem] top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-maroon/10 hover:text-maroon">
//                   <X className="h-4 w-4" />
//                 </button>
//               )}
//               <button type="submit" aria-label="Search" className="absolute right-1 top-1/2 flex h-[calc(100%-8px)] w-12 -translate-y-1/2 items-center justify-center rounded-full bg-maroon text-white transition-colors hover:bg-gold">
//                 <Search className="h-5 w-5" />
//               </button>
//             </form>

//             <div className="ml-auto flex items-center justify-end gap-1.5 sm:gap-3 md:flex-1 md:basis-0">
//               <button className={iconBtn("md:hidden")} aria-label="Search" onClick={() => ui.setSearchOpen(true)}>
//                 <Search className="h-5 w-5" />
//               </button>
//               <AccountMenu className="hidden sm:block" buttonClassName={iconBtn()} />
//               <Link href="/wishlist" className={iconBtn("relative")} aria-label="Wishlist">
//                 <Heart className="h-5 w-5" strokeWidth={1.75} />
//                 {skus.length > 0 && <Count n={skus.length} />}
//               </Link>
//               <button className={iconBtn("relative")} aria-label="Cart" onClick={() => ui.setCartOpen(true)}>
//                 <ShoppingCart className="h-5 w-5" strokeWidth={1.75} />
//                 <Count n={count} />
//               </button>
//             </div>
//           </div>
//         </div>

//         {/* category nav */}
//         <nav
//           ref={navRef}
//           aria-label="Main"
//           className="relative hidden border-y border-line bg-white lg:block"
//           onMouseLeave={() => !isTouch() && close()}
//           onKeyDown={(e) => {
//             if (e.key === "Escape" && active) {
//               close();
//               (navRef.current?.querySelector(`[data-nav-id="${active}"]`) as HTMLElement | null)?.focus();
//             }
//           }}
//           onBlur={(e) => {
//             if (!e.currentTarget.contains(e.relatedTarget as Node | null)) close();
//           }}
//         >
//           <ul tabIndex={0} aria-label="Store categories" className="mx-auto flex w-full flex-wrap items-center justify-center gap-x-2 px-3 sm:gap-x-4 xl:gap-x-5">
//             {!hasHome && (
//               <li className="shrink-0" onMouseEnter={close} onFocus={close}>
//                 <NavLink id="home" href="/" label="Home" isHome current={pathname === "/"} />
//               </li>
//             )}
//             {navItems.map((item) => {
//               const hasChildren = item.children.length > 0;
//               return (
//                 <li
//                   key={item.id}
//                   className="shrink-0"
//                   onMouseEnter={() => !isTouch() && setActive(hasChildren ? item.id : null)}
//                   onFocus={() => !isTouch() && setActive(hasChildren ? item.id : null)}
//                 >
//                   <NavLink
//                     id={item.id}
//                     href={item.href ?? "#"}
//                     label={item.label}
//                     isHome={item.href?.split("?")[0] === "/"}
//                     badge={item.badge}
//                     hasChildren={hasChildren}
//                     current={currentId === item.id}
//                     open={active === item.id}
//                     onClick={(e) => {
//                       // First tap on a touch screen opens the dropdown instead of navigating.
//                       if (hasChildren && isTouch() && active !== item.id) {
//                         e.preventDefault();
//                         setActive(item.id);
//                         return;
//                       }
//                       close();
//                     }}
//                   />
//                 </li>
//               );
//             })}
//           </ul>
//           {navItems.map((item) => item.children.length > 0 && <MegaMenu key={item.id} item={item} open={active === item.id} onNavigate={close} />)}
//         </nav>
//       </header>

//       {/* mobile menu */}
//       <div className={cn("fixed inset-0 z-[70] lg:hidden", ui.menuOpen ? "pointer-events-auto" : "pointer-events-none")}>
//         <div onClick={() => ui.setMenuOpen(false)} className={cn("absolute inset-0 bg-ink/40 transition-opacity", ui.menuOpen ? "opacity-100" : "opacity-0")} />
//         <aside className={cn("absolute left-0 top-0 flex h-full w-[86%] max-w-sm flex-col bg-white transition-transform duration-300", ui.menuOpen ? "translate-x-0" : "-translate-x-full")} style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
//           <div className="flex items-center justify-between border-b border-line px-4 py-3">
//             <span className="font-heading text-lg font-semibold text-olive">Menu</span>
//             <button onClick={() => ui.setMenuOpen(false)} aria-label="Close" className="rounded-full p-1.5 hover:bg-maroon/10"><X className="h-5 w-5" /></button>
//           </div>
//           <div className="flex-1 overflow-y-auto px-4 py-2" onClick={(e) => { if ((e.target as HTMLElement).closest("a")) ui.setMenuOpen(false); }}>
//             {!hasHome && (
//               <div className="border-b border-line">
//                 <Link href="/" className={cn("flex items-center gap-2 py-3 text-[15px] font-medium", pathname === "/" ? "text-maroon" : "text-olive")}>
//                   <Home className="h-4 w-4" aria-hidden="true" /> Home
//                 </Link>
//               </div>
//             )}
//             {navItems.map((item) => (
//               <MobileItem key={item.id} item={item} current={currentId === item.id} />
//             ))}
//             <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4 text-sm text-muted">
//               <Link href="/account" className={linkClass}>My account</Link>
//               <Link href="/stores" className={linkClass}>Store locator</Link>
//               <Link href="/track-order" className={linkClass}>Track order</Link>
//               <Link href="/contact" className={linkClass}>Customer support</Link>
//               <label className="flex items-center justify-between">Store
//                 <select value={ui.storeId ?? ""} onChange={(e) => ui.setStoreId(e.target.value || undefined)} className="bg-transparent font-medium text-olive">
//                   {stores.length === 0 && <option value="">Bangalore Urban</option>}
//                   {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
//                 </select>
//               </label>
//               <label className="flex items-center justify-between">Currency
//                 <select value={ui.currency} onChange={(e) => ui.setCurrency(e.target.value)} className="bg-transparent font-medium text-olive">
//                   {currencyOptions.map((c) => <option key={c} value={c}>{c}</option>)}
//                 </select>
//               </label>
//             </div>
//           </div>
//         </aside>
//       </div>

//       <SearchOverlay />
//       <CartDrawer />
//     </>
//   );
// }

// function NavLink({ id, href, label, isHome, badge, hasChildren, current, open, onClick }: { id: string; href: string; label: string; isHome?: boolean; badge?: string; hasChildren?: boolean; current?: boolean; open?: boolean; onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void }) {
//   return (
//     <Link
//       href={href}
//       data-nav-id={id}
//       onClick={onClick}
//       aria-label={isHome ? "Home" : undefined}
//       title={isHome ? "Home" : undefined}
//       aria-current={current ? "page" : undefined}
//       aria-haspopup={hasChildren ? "true" : undefined}
//       aria-expanded={hasChildren ? Boolean(open) : undefined}
//       className={cn(
//         "relative flex items-center gap-1.5 whitespace-nowrap rounded-t-lg px-2 py-3 text-[14px] font-medium text-olive transition-colors hover:text-maroon focus-visible:outline-none focus-visible:text-maroon 2xl:px-2.5 2xl:text-[15px]",
//         "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-maroon after:transition-transform after:content-['']",
//         current || open ? "text-maroon after:scale-x-100" : "after:scale-x-0 hover:bg-maroon/[0.04]",
//         open && "bg-maroon/[0.08]",
//       )}
//     >
//       {isHome && <Home className="h-4 w-4" aria-hidden="true" />}
//       {!isHome && displayLabel(label)}
//       {badge && <span className="ml-1.5 rounded-full bg-maroon px-2 py-0.5 text-[10px] font-semibold text-white">{badge}</span>}
//       {hasChildren && <ChevronDown className={cn("h-3.5 w-3.5 text-olive/50 transition-transform", open && "rotate-180 text-maroon")} />}
//     </Link>
//   );
// }

// /** Round white icon button used across the header bar. */
// function iconBtn(extra?: string) {
//   return cn(
//     "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-olive shadow-[0_6px_18px_-10px_rgba(122,18,56,0.5)] ring-1 ring-black/[0.04] transition-all duration-200 hover:-translate-y-0.5 hover:text-maroon hover:shadow-[0_10px_22px_-10px_rgba(219,26,114,0.6)] hover:ring-maroon/30 md:h-11 md:w-11",
//     extra,
//   );
// }

// function Count({ n }: { n: number }) {
//   // Render only after mount so server and browser HTML match (fixes the hydration error).
//   const [mounted, setMounted] = useState(false);
//   useEffect(() => setMounted(true), []);
//   if (!mounted) return null;
//   return (
//     <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-maroon px-1 text-[10px] font-semibold text-white ring-2 ring-white">
//       <span key={n} className="we-pop">{n}</span>
//     </span>
//   );
// }

// function MobileItem({ item, current, depth = 0 }: { item: MenuNode; current?: boolean; depth?: number }) {
//   const [open, setOpen] = useState(false);
//   const hasKids = item.children.length > 0;
//   const pathname = usePathname();
//   const selected = item.href?.split("?")[0] === pathname;
//   const labelClass = cn(
//     "block flex-1 py-3 text-left",
//     depth === 0 ? cn("text-[15px] font-medium", current ? "text-maroon" : "text-olive") : cn(depth === 1 ? "text-xs font-semibold uppercase tracking-wider" : "text-sm", selected ? "text-maroon" : depth === 1 ? "text-gold" : "text-ink"),
//   );
//   const isHome = depth === 0 && item.href?.split("?")[0] === "/";
//   return (
//     <div className={cn(depth === 0 && "border-b border-line")}>
//       <div className="flex items-center justify-between">
//         {item.href ? (
//           <Link href={item.href} className={cn(labelClass, isHome && "flex items-center gap-2")}>
//             {isHome && <Home className="h-4 w-4" aria-hidden="true" />}
//             {depth === 0 ? displayLabel(item.label) : item.label}
//           </Link>
//         ) : (
//           // Group headings ("By Weave") have no page of their own: tapping them expands the group.
//           <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className={labelClass}>{item.label}</button>
//         )}
//         {hasKids && (
//           <button type="button" onClick={() => setOpen((v) => !v)} aria-label={`${open ? "Collapse" : "Expand"} ${item.label}`} aria-expanded={open} className="p-2">
//             <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
//           </button>
//         )}
//       </div>
//       {hasKids && open && <div className="pl-3">{item.children.map((c) => <MobileItem key={c.id} item={c} depth={depth + 1} />)}</div>}
//     </div>
//   );
// }

// /** Menu labels stored in ALL CAPS ("SAREES") read as Title Case; mixed-case labels are left alone. */
// function displayLabel(label: string) {
//   return label === label.toUpperCase() ? label.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase()) : label;
// }


"use client";

import {
  BadgeCheck,
  Banknote,
  ChevronDown,
  Headphones,
  Home,
  IndianRupee,
  Heart,
  MapPin,
  Menu,
  Package,
  Search,
  ShoppingCart,
  Truck,
  X,
} from "lucide-react";

import Link from "next/link";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

import { useEffect, useRef, useState } from "react";

import { CURRENCIES } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { DEFAULT_MENU } from "@/lib/default-menu";
import type { MenuNode } from "@/repositories/web/site.repository";

import { useCart, useWishlist } from "@/hooks/useCart";
import { useUi } from "@/store/ui";

import { CartDrawer } from "@/components/cart/cart-drawer";

import {
  AnnouncementBar,
  type AnnouncementItem,
} from "./announcement-bar";

import { SearchOverlay } from "./search-overlay";
import { MegaMenu } from "./mega-menu";
import { AccountMenu } from "./account-menu";

import {
  isAddOnCategorySlug,
} from "@/lib/add-on-categories";

interface Props {
  menu: MenuNode[];
  messages: string[];
  stores: { id: string; name: string; city?: string }[];
  currencies: string[];
  defaultStoreId?: string;
  defaultCurrency: string;
  tagline: string;
  logo: React.ReactNode;
  whatsapp: string;
}

const MESSAGE_ICONS = [Truck, BadgeCheck, Banknote];

/** Match a menu href against the current URL. */
function matchScore(
  href: string | undefined,
  pathname: string,
  search: URLSearchParams,
): number {
  if (!href || href === "#") return -1;

  const [path, query = ""] = href.split("?");

  const pathMatches =
    path === "/"
      ? pathname === "/"
      : pathname === path || pathname.startsWith(`${path}/`);

  if (!pathMatches) return -1;

  const wanted = [...new URLSearchParams(query).entries()];

  return wanted.every(([k, v]) => search.get(k) === v)
    ? wanted.length
    : -1;
}

/** Find the best matching top-level menu item. */
function activeItemId(
  items: MenuNode[],
  pathname: string,
  search: URLSearchParams,
): string | null {
  let best: { id: string; score: number } | null = null;

  for (const item of items) {
    const score = matchScore(item.href, pathname, search);

    if (score >= 0 && (!best || score > best.score)) {
      best = { id: item.id, score };
    }
  }

  return best?.id ?? null;
}

const ADD_ON_ITEM_PREFIX = "storefront-add-on-";

/**
 * The published customer-facing navigation: exactly these ten categories, in
 * this order. Ready Made, Border and Dhotis stay live as collection pages but
 * are kept out of the header.
 */
const STOREFRONT_NAV: { label: string; href: string; badge?: string }[] = [
  { label: "FABRICS", href: "/collections/fabrics" },
  { label: "PLAIN FABRICS", href: "/collections/plain-fabrics" },
  { label: "PRE-CUT FABRICS", href: "/collections/pre-cut-fabrics" },
  { label: "SAREES", href: "/collections/sarees" },
  { label: "UNSTITCHED SUITS", href: "/collections/unstitched-suits" },
  { label: "DUPATTA", href: "/collections/dupatta" },
  { label: "PAVADA", href: "/collections/pavada" },
  { label: "INSKIRT", href: "/collections/inskirt" },
  { label: "NEW ARRIVALS", href: "/new-arrivals", badge: "New" },
  { label: "BEST BUY", href: "/collections/best-buy" },
];

/** Category slug of a stored menu item, falling back to its label. */
function navSlug(item: { href?: string | null; label: string }): string {
  const fromHref = item.href?.match(/\/collections\/([^/?#]+)/)?.[1];
  if (fromHref) return fromHref.toLowerCase();
  return item.label.trim().toLowerCase().replace(/\s+/g, "-");
}

/**
 * Rebuilds the stored/CMS menu as the published ten-item navigation. Columns
 * configured for a category are kept; anything not on the list is dropped from
 * the header (its route, ERP group and products are untouched).
 */
function storefrontNav(items: MenuNode[]): MenuNode[] {
  return STOREFRONT_NAV.map(({ label, href, badge }) => {
    const slug = navSlug({ href, label });
    const stored = items.find((item) => navSlug(item) === slug);
    return {
      id: stored?.id ?? `${ADD_ON_ITEM_PREFIX}${slug}`,
      label,
      kind: "top" as const,
      href,
      badge: stored?.badge ?? badge,
      children: stored?.children ?? [],
    };
  });
}

export function HeaderClient({
  menu,
  messages,
  stores,
  currencies,
  defaultStoreId,
  defaultCurrency,
  logo,
}: Props) {
  const navItems = storefrontNav(menu.length ? menu : DEFAULT_MENU);

  const hasHome = navItems.some((item) => item.href === "/");

  const ui = useUi();

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [active, setActive] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [query, setQuery] = useState("");

  const lastPointer = useRef<string>("mouse");
  const navRef = useRef<HTMLElement>(null);

  // Scroll effect
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 24);
    };

    onScroll();

    window.addEventListener("scroll", onScroll, {
      passive: true,
    });

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // Close menus whenever navigation changes.
  const search = searchParams.toString();

  useEffect(() => {
    setActive(null);
    ui.setMenuOpen(false);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, search]);

  // Detect mouse, keyboard and touch interactions.
  useEffect(() => {
    const onPointer = (e: PointerEvent) => {
      lastPointer.current = e.pointerType || "mouse";
    };

    const onKey = () => {
      lastPointer.current = "keyboard";
    };

    document.addEventListener("pointerdown", onPointer, true);
    document.addEventListener("keydown", onKey, true);

    return () => {
      document.removeEventListener("pointerdown", onPointer, true);
      document.removeEventListener("keydown", onKey, true);
    };
  }, []);

  // Close dropdown when clicking outside navigation.
  useEffect(() => {
    if (!active) return;

    const onDown = (e: PointerEvent) => {
      if (
        navRef.current &&
        !navRef.current.contains(e.target as Node)
      ) {
        setActive(null);
      }
    };

    document.addEventListener("pointerdown", onDown);

    return () => {
      document.removeEventListener("pointerdown", onDown);
    };
  }, [active]);

  // Currency fallback.
  const configuredCurrencies = [
    ...new Set(
      currencies.filter((currency) => CURRENCIES[currency]),
    ),
  ];

  const currencyOptions = configuredCurrencies.length
    ? configuredCurrencies
    : ["INR"];

  const selectedCurrency = currencyOptions.includes(ui.currency)
    ? ui.currency
    : currencyOptions.includes(defaultCurrency)
      ? defaultCurrency
      : currencyOptions[0] ?? "INR";

  // Store fallback.
  const selectedStore =
    stores.find((store) => store.id === ui.storeId) ??
    stores.find((store) => store.id === defaultStoreId) ??
    stores[0];

  const linkClass = "hover:text-maroon";

  const addOnSlug = pathname.match(
    /^\/collections\/([^/]+)/,
  )?.[1];

  const currentId =
    addOnSlug && isAddOnCategorySlug(addOnSlug)
      ? `${ADD_ON_ITEM_PREFIX}${addOnSlug}`
      : activeItemId(navItems, pathname, searchParams);

  const close = () => setActive(null);

  const isTouch = () =>
    lastPointer.current === "touch" ||
    lastPointer.current === "pen";

  // Remove duplicate announcement messages.
  const uniqueMessages = [
    ...new Set(
      messages
        .map((message) => message.trim())
        .filter(Boolean),
    ),
  ];

  // Announcement bar.
  const barItems: AnnouncementItem[] = [
    {
      key: "store",
      icon: MapPin,
      content: (
        <label className="flex items-center gap-1 text-olive/60">
          Store

          {stores.length > 0 ? (
            <select
              value={selectedStore?.id ?? ""}
              onChange={(e) =>
                ui.setStoreId(e.target.value || undefined)
              }
              className="cursor-pointer bg-transparent font-medium text-olive focus:outline-none"
            >
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          ) : (
            <span className="font-medium text-olive">
              Unavailable
            </span>
          )}
        </label>
      ),
    },
    {
      key: "currency",
      icon: IndianRupee,
      content: (
        <label className="flex items-center gap-1 text-olive/60">
          Currency

          <select
            value={selectedCurrency}
            onChange={(e) => ui.setCurrency(e.target.value)}
            className="cursor-pointer bg-transparent font-medium text-olive focus:outline-none"
          >
            {currencyOptions.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
        </label>
      ),
    },

    ...uniqueMessages.map(
      (message, i): AnnouncementItem => ({
        key: `msg-${i}`,
        icon: MESSAGE_ICONS[i] ?? BadgeCheck,
        content: <span>{message}</span>,
      }),
    ),

    {
      key: "track",
      icon: Package,
      content: (
        <Link href="/track-order" className={linkClass}>
          Track Order
        </Link>
      ),
    },
    {
      key: "support",
      icon: Headphones,
      content: (
        <Link href="/contact" className={linkClass}>
          Customer Support
        </Link>
      ),
    },
  ];

  return (
    <>
      <AnnouncementBar items={barItems} />

      {/* Main header */}
      <header
        className={cn(
          "sticky z-50 bg-white transition-shadow duration-300",
          scrolled
            ? "shadow-[0_10px_30px_-18px_rgba(122,18,56,0.45)]"
            : "shadow-[0_6px_20px_-18px_rgba(122,18,56,0.35)]",
        )}
        style={{
          top: "env(safe-area-inset-top, 0px)",
        }}
      >
        <div className="bg-[url('/header-bg.webp')] bg-cover bg-center">
          <div
            className={cn(
              "mx-auto flex max-w-site items-center gap-3 px-4 transition-[height] duration-300 sm:px-6 md:grid md:grid-cols-[minmax(160px,1fr)_minmax(0,620px)_minmax(160px,1fr)] md:gap-8",
              scrolled
                ? "h-14 md:h-[68px]"
                : "h-16 md:h-[84px]",
            )}
          >
            {/* Logo and mobile menu */}
            <div className="flex flex-1 items-center gap-3 md:basis-0">
              <button
                className={iconBtn("lg:hidden")}
                aria-label="Menu"
                onClick={() => ui.setMenuOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </button>

              <div
                className={cn(
                  "shrink-0 origin-left transition-transform duration-300",
                  scrolled
                    ? "scale-[0.72] md:scale-[0.8]"
                    : "scale-[0.82] md:scale-100",
                )}
              >
                {logo}
              </div>
            </div>

            {/* Desktop search */}
            <form
              role="search"
              className="group/search relative hidden w-full min-w-0 md:block"
              onSubmit={(e) => {
                e.preventDefault();

                const q = query.trim();

                if (q) {
                  router.push(
                    `/search?q=${encodeURIComponent(q)}`,
                  );
                }
              }}
            >
              <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-olive/70 transition-colors group-focus-within/search:text-maroon" />

              <input
                type="text"
                inputMode="search"
                enterKeyHint="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search sarees, fabrics, dupattas..."
                aria-label="Search products"
                className={cn(
                  "w-full rounded-full border border-white bg-white/95 pl-14 pr-24 text-[15px] text-ink shadow-[0_8px_24px_-14px_rgba(122,18,56,0.45)] placeholder:text-muted transition-[height,box-shadow] focus:border-maroon/40 focus:outline-none focus:ring-4 focus:ring-maroon/10",
                  scrolled ? "h-11" : "h-12",
                )}
              />

              {query && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setQuery("")}
                  className="absolute right-[3.6rem] top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-maroon/10 hover:text-maroon"
                >
                  <X className="h-4 w-4" />
                </button>
              )}

              <button
                type="submit"
                aria-label="Search"
                className="absolute right-1 top-1/2 flex h-[calc(100%-8px)] w-12 -translate-y-1/2 items-center justify-center rounded-full bg-maroon text-white transition-colors hover:bg-gold"
              >
                <Search className="h-5 w-5" />
              </button>
            </form>

            {/* Header actions */}
            <div className="ml-auto flex items-center justify-end gap-1.5 sm:gap-3 md:flex-1 md:basis-0">
              <button
                className={iconBtn("md:hidden")}
                aria-label="Search"
                onClick={() => ui.setSearchOpen(true)}
              >
                <Search className="h-5 w-5" />
              </button>

              <AccountMenu
                className="hidden sm:block"
                buttonClassName={iconBtn()}
              />

              <CartWishlistActions />
            </div>
          </div>
        </div>

        {/* Desktop category navigation */}
        <nav
          ref={navRef}
          aria-label="Main"
          className="relative hidden border-y border-line bg-white lg:block"
          onMouseLeave={() => !isTouch() && close()}
          onKeyDown={(e) => {
            if (e.key === "Escape" && active) {
              close();

              (
                navRef.current?.querySelector(
                  `[data-nav-id="${active}"]`,
                ) as HTMLElement | null
              )?.focus();
            }
          }}
          onBlur={(e) => {
            if (
              !e.currentTarget.contains(
                e.relatedTarget as Node | null,
              )
            ) {
              close();
            }
          }}
        >
          <ul
            tabIndex={0}
            aria-label="Store categories"
            className="mx-auto flex w-full flex-wrap items-center justify-center gap-x-2 px-3 sm:gap-x-4 xl:gap-x-5"
          >
            {!hasHome && (
              <li
                className="shrink-0"
                onMouseEnter={close}
                onFocus={close}
              >
                <NavLink
                  id="home"
                  href="/"
                  label="Home"
                  isHome
                  current={pathname === "/"}
                />
              </li>
            )}

            {navItems.map((item) => {
              const hasChildren = item.children.length > 0;

              return (
                <li
                  key={item.id}
                  className="shrink-0"
                  onMouseEnter={() =>
                    !isTouch() &&
                    setActive(hasChildren ? item.id : null)
                  }
                  onFocus={() =>
                    !isTouch() &&
                    setActive(hasChildren ? item.id : null)
                  }
                >
                  <NavLink
                    id={item.id}
                    href={item.href ?? "#"}
                    label={item.label}
                    isHome={item.href?.split("?")[0] === "/"}
                    badge={item.badge}
                    hasChildren={hasChildren}
                    current={currentId === item.id}
                    open={active === item.id}
                    onClick={(e) => {
                      if (
                        hasChildren &&
                        isTouch() &&
                        active !== item.id
                      ) {
                        e.preventDefault();
                        setActive(item.id);
                        return;
                      }

                      close();
                    }}
                  />
                </li>
              );
            })}
          </ul>

          {navItems.map(
            (item) =>
              item.children.length > 0 && (
                <MegaMenu
                  key={item.id}
                  item={item}
                  open={active === item.id}
                  onNavigate={close}
                />
              ),
          )}
        </nav>
      </header>

      {/* Mobile navigation drawer */}
      <div
        className={cn(
          "fixed inset-0 z-[70] lg:hidden",
          ui.menuOpen
            ? "pointer-events-auto"
            : "pointer-events-none",
        )}
      >
        <div
          onClick={() => ui.setMenuOpen(false)}
          className={cn(
            "absolute inset-0 bg-ink/40 transition-opacity",
            ui.menuOpen ? "opacity-100" : "opacity-0",
          )}
        />

        <aside
          className={cn(
            "absolute left-0 top-0 flex h-full w-[86%] max-w-sm flex-col bg-white transition-transform duration-300",
            ui.menuOpen
              ? "translate-x-0"
              : "-translate-x-full",
          )}
          style={{
            paddingTop: "env(safe-area-inset-top, 0px)",
          }}
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="font-heading text-lg font-semibold text-olive">
              Menu
            </span>

            <button
              onClick={() => ui.setMenuOpen(false)}
              aria-label="Close"
              className="rounded-full p-1.5 hover:bg-maroon/10"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div
            className="flex-1 overflow-y-auto px-4 py-2"
            onClick={(e) => {
              if (
                (e.target as HTMLElement).closest("a")
              ) {
                ui.setMenuOpen(false);
              }
            }}
          >
            {!hasHome && (
              <div className="border-b border-line">
                <Link
                  href="/"
                  className={cn(
                    "flex items-center gap-2 py-3 text-[15px] font-medium",
                    pathname === "/"
                      ? "text-maroon"
                      : "text-olive",
                  )}
                >
                  <Home
                    className="h-4 w-4"
                    aria-hidden="true"
                  />
                  Home
                </Link>
              </div>
            )}

            {navItems.map((item) => (
              <MobileItem
                key={item.id}
                item={item}
                current={currentId === item.id}
              />
            ))}

            <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4 text-sm text-muted">
              <Link href="/account" className={linkClass}>
                My account
              </Link>


              <Link href="/track-order" className={linkClass}>
                Track order
              </Link>

              <Link href="/contact" className={linkClass}>
                Customer support
              </Link>

              {/* Mobile store selection */}
              <label className="flex items-center justify-between">
                Store

                {stores.length > 0 ? (
                  <select
                    value={selectedStore?.id ?? ""}
                    onChange={(e) =>
                      ui.setStoreId(
                        e.target.value || undefined,
                      )
                    }
                    className="bg-transparent font-medium text-olive"
                  >
                    {stores.map((store) => (
                      <option key={store.id} value={store.id}>
                        {store.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="font-medium text-olive">
                    Unavailable
                  </span>
                )}
              </label>

              {/* Mobile currency selection */}
              <label className="flex items-center justify-between">
                Currency

                <select
                  value={selectedCurrency}
                  onChange={(e) =>
                    ui.setCurrency(e.target.value)
                  }
                  className="bg-transparent font-medium text-olive"
                >
                  {currencyOptions.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
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

/** Navigation link component. */
function NavLink({
  id,
  href,
  label,
  isHome,
  badge,
  hasChildren,
  current,
  open,
  onClick,
}: {
  id: string;
  href: string;
  label: string;
  isHome?: boolean;
  badge?: string;
  hasChildren?: boolean;
  current?: boolean;
  open?: boolean;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}) {
  return (
    <Link
      href={href}
      data-nav-id={id}
      onClick={onClick}
      aria-label={isHome ? "Home" : undefined}
      title={isHome ? "Home" : undefined}
      aria-current={current ? "page" : undefined}
      aria-haspopup={hasChildren ? "true" : undefined}
      aria-expanded={
        hasChildren ? Boolean(open) : undefined
      }
      className={cn(
        "relative flex items-center gap-1.5 whitespace-nowrap rounded-t-lg px-2 py-3 text-[14px] font-medium text-olive transition-colors hover:text-maroon focus-visible:outline-none focus-visible:text-maroon 2xl:px-2.5 2xl:text-[15px]",
        "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-maroon after:transition-transform after:content-['']",
        current || open
          ? "text-maroon after:scale-x-100"
          : "after:scale-x-0 hover:bg-maroon/[0.04]",
        open && "bg-maroon/[0.08]",
      )}
    >
      {isHome && (
        <Home className="h-4 w-4" aria-hidden="true" />
      )}

      {!isHome && displayLabel(label)}

      {badge && (
        <span className="ml-1.5 rounded-full bg-maroon px-2 py-0.5 text-[10px] font-semibold text-white">
          {badge}
        </span>
      )}

      {hasChildren && (
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-olive/50 transition-transform",
            open && "rotate-180 text-maroon",
          )}
        />
      )}
    </Link>
  );
}

/** Shared circular header icon button. */
function iconBtn(extra?: string) {
  return cn(
    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-olive shadow-[0_6px_18px_-10px_rgba(122,18,56,0.5)] ring-1 ring-black/[0.04] transition-all duration-200 hover:-translate-y-0.5 hover:text-maroon hover:shadow-[0_10px_22px_-10px_rgba(219,26,114,0.6)] hover:ring-maroon/30 md:h-11 md:w-11",
    extra,
  );
}

/** Cart and wishlist actions. */
function CartWishlistActions() {
  const { cart } = useCart();
  const { skus } = useWishlist();

  const setCartOpen = useUi(
    (state) => state.setCartOpen,
  );

  const count = cart?.totals.itemCount ?? 0;

  return (
    <>
      <Link
        href="/wishlist"
        className={iconBtn("relative")}
        aria-label={`Wishlist${skus.length ? `, ${skus.length} items` : ""}`}
      >
        <Heart
          className="h-5 w-5"
          strokeWidth={1.75}
        />

        {skus.length > 0 && <Count n={skus.length} />}
      </Link>

      <button
        className={iconBtn("relative")}
        aria-label={`Cart, ${count} items`}
        onClick={() => setCartOpen(true)}
      >
        <ShoppingCart
          className="h-5 w-5"
          strokeWidth={1.75}
        />

        <Count n={count} />
      </button>
    </>
  );
}

/** Hydration-safe animated item counter. */
function Count({ n }: { n: number }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <span
      aria-live="polite"
      className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-maroon px-1 text-[10px] font-semibold tabular-nums text-white ring-2 ring-white"
    >
      <span key={n} className="we-pop">
        {n}
      </span>
    </span>
  );
}

/** Mobile navigation item with expandable children. */
function MobileItem({
  item,
  current,
  depth = 0,
}: {
  item: MenuNode;
  current?: boolean;
  depth?: number;
}) {
  const [open, setOpen] = useState(false);

  const hasKids = item.children.length > 0;
  const pathname = usePathname();

  const selected = item.href?.split("?")[0] === pathname;

  const labelClass = cn(
    "block flex-1 py-3 text-left",
    depth === 0
      ? cn(
          "text-[15px] font-medium",
          current ? "text-maroon" : "text-olive",
        )
      : cn(
          depth === 1
            ? "text-xs font-semibold uppercase tracking-wider"
            : "text-sm",
          selected
            ? "text-maroon"
            : depth === 1
              ? "text-gold"
              : "text-ink",
        ),
  );

  const isHome =
    depth === 0 && item.href?.split("?")[0] === "/";

  return (
    <div className={cn(depth === 0 && "border-b border-line")}>
      <div className="flex items-center justify-between">
        {item.href ? (
          <Link
            href={item.href}
            className={cn(
              labelClass,
              isHome && "flex items-center gap-2",
            )}
          >
            {isHome && (
              <Home
                className="h-4 w-4"
                aria-hidden="true"
              />
            )}

            {depth === 0
              ? displayLabel(item.label)
              : item.label}
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className={labelClass}
          >
            {item.label}
          </button>
        )}

        {hasKids && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={`${open ? "Collapse" : "Expand"} ${item.label}`}
            aria-expanded={open}
            className="p-2"
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                open && "rotate-180",
              )}
            />
          </button>
        )}
      </div>

      {hasKids && open && (
        <div className="pl-3">
          {item.children.map((child) => (
            <MobileItem
              key={child.id}
              item={child}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Convert ALL CAPS menu labels to Title Case. */
function displayLabel(label: string) {
  return label === label.toUpperCase()
    ? label
        .toLowerCase()
        .replace(/(^|\s)\S/g, (c) => c.toUpperCase())
    : label;
}
