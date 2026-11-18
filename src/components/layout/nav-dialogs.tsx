// // FILE: src/components/layout/nav-dialogs.tsx   (NEW FILE)
// // ADDED: WishlistMenu({count}), OrdersMenu(), AccountMenu() + helpers Menu, EmptyDialog, Skeleton, Thumb, fmtDate.
// // PURPOSE: navbar dialogs auto-filled from useAccount(); empty dialog with icon when no liked items / orders / not logged in.
// "use client";
// import { Heart, LogIn, Package, User } from "lucide-react";
// import Image from "next/image";
// import Link from "next/link";
// import { usePathname, useRouter } from "next/navigation";
// import { useEffect, useRef, useState } from "react";
// import { useQueryClient } from "@tanstack/react-query";
// import { useAccount } from "@/hooks/useAccount";
// import { buttonClass } from "@/components/ui/button";
// import { ComingSoonImage } from "@/components/ui/coming-soon-image";
// import { Price } from "@/components/ui/price";
// import { formatINR, isRemoteImageSource } from "@/lib/utils";

// /** Anchored dialog: opens under its icon, closes on outside click / Esc / page change. Refetches data each time it opens. */
// function Menu({ label, icon, count, hiddenOnMobile, children, onOpen }: { label: string; icon: React.ReactNode; count?: number; hiddenOnMobile?: boolean; children: React.ReactNode; onOpen?: () => void }) {
//   const [open, setOpen] = useState(false);
//   const ref = useRef<HTMLDivElement>(null);
//   const pathname = usePathname();
//   useEffect(() => setOpen(false), [pathname]);
//   useEffect(() => {
//     if (!open) return;
//     const click = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
//     const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
//     document.addEventListener("mousedown", click);
//     document.addEventListener("keydown", key);
//     return () => { document.removeEventListener("mousedown", click); document.removeEventListener("keydown", key); };
//   }, [open]);
//   return (
//     <div ref={ref} className={`relative ${hiddenOnMobile ? "hidden sm:block" : ""}`}>
//       <button type="button" aria-label={label} aria-expanded={open} onClick={() => { setOpen((v) => !v); if (!open) onOpen?.(); }} className="relative rounded-full p-1.5 hover:bg-olive/10 sm:p-2">
//         {icon}
//         {!!count && count > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-maroon px-1 text-[10px] text-ivory">{count}</span>}
//       </button>
//       {open && (
//         <div role="dialog" aria-label={label} className="absolute right-0 top-full z-[60] mt-2 w-[min(92vw,22rem)] rounded-sm border border-line bg-ivory shadow-2xl">
//           {children}
//         </div>
//       )}
//     </div>
//   );
// }

// function EmptyDialog({ icon, title, text, href, cta }: { icon: React.ReactNode; title: string; text: string; href: string; cta: string }) {
//   return (
//     <div className="flex flex-col items-center px-6 py-10 text-center">
//       <span className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-gold/60 bg-white text-olive">{icon}</span>
//       <h3 className="mt-4 text-xl">{title}</h3>
//       <p className="mt-1 text-sm text-muted">{text}</p>
//       <Link href={href} className={buttonClass("outline", "md", "mt-5")}>{cta}</Link>
//     </div>
//   );
// }

// function Skeleton() {
//   return (
//     <div className="space-y-3 p-4">
//       {[0, 1, 2].map((i) => <div key={i} className="flex gap-3"><div className="h-16 w-12 animate-pulse rounded-sm bg-line" /><div className="flex-1 space-y-2 py-1"><div className="h-3 w-3/4 animate-pulse rounded bg-line" /><div className="h-3 w-1/3 animate-pulse rounded bg-line" /></div></div>)}
//     </div>
//   );
// }

// function Thumb({ src, alt }: { src?: string | null; alt: string }) {
//   return (
//     <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-sm bg-line">
//       {src ? <Image src={src} alt={alt} fill unoptimized={isRemoteImageSource(src)} sizes="48px" className="object-cover" /> : <ComingSoonImage compact className="absolute inset-0" />}
//     </div>
//   );
// }

// const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "");

// export function WishlistMenu({ count }: { count: number }) {
//   const { data, isLoading, refetch } = useAccount();
//   const items = data?.wishlist ?? [];
//   return (
//     <Menu label="Wishlist" icon={<Heart className="h-5 w-5" />} count={count} onOpen={() => refetch()}>
//       {isLoading ? <Skeleton /> : items.length === 0 ? (
//         <EmptyDialog icon={<Heart className="h-7 w-7" />} title="Nothing liked yet" text="Tap the heart on any saree to save it here." href="/collections/sarees" cta="Start shopping" />
//       ) : (
//         <>
//           <p className="border-b border-line px-4 py-3 text-xs uppercase tracking-widest text-muted">Liked items ({items.length})</p>
//           <ul className="max-h-80 divide-y divide-line overflow-y-auto">
//             {items.map((p) => (
//               <li key={p.sku}><Link href={p.href} className="flex gap-3 px-4 py-3 hover:bg-olive/5"><Thumb src={p.image} alt={p.name} /><span className="min-w-0 text-sm"><span className="line-clamp-2 leading-snug">{p.name}</span><Price amount={p.price} mrp={p.mrp} size="sm" className="mt-1" /></span></Link></li>
//             ))}
//           </ul>
//           <Link href="/wishlist" className="block border-t border-line px-4 py-3 text-center text-xs uppercase tracking-widest text-maroon hover:bg-olive/5">View all</Link>
//         </>
//       )}
//     </Menu>
//   );
// }

// export function OrdersMenu() {
//   const { data, isLoading, refetch } = useAccount();
//   const orders = data?.orders ?? [];
//   return (
//     <Menu label="Orders" icon={<Package className="h-5 w-5" />} onOpen={() => refetch()}>
//       {isLoading ? <Skeleton /> : !data?.loggedIn ? (
//         <EmptyDialog icon={<Package className="h-7 w-7" />} title="Log in to see orders" text="Your past orders appear here automatically." href="/login?next=/account/orders" cta="Log in" />
//       ) : orders.length === 0 ? (
//         <EmptyDialog icon={<Package className="h-7 w-7" />} title="No orders yet" text="When you place an order it will show up here." href="/collections/sarees" cta="Start shopping" />
//       ) : (
//         <>
//           <p className="border-b border-line px-4 py-3 text-xs uppercase tracking-widest text-muted">Recent orders ({data.orderTotal})</p>
//           <ul className="max-h-80 divide-y divide-line overflow-y-auto">
//             {orders.map((o) => (
//               <li key={o.orderNo}><Link href={`/account/orders/${o.orderNo}`} className="flex gap-3 px-4 py-3 hover:bg-olive/5"><Thumb src={o.image} alt={o.name} /><span className="min-w-0 flex-1 text-sm"><span className="block truncate font-medium">{o.orderNo}</span><span className="block text-xs text-muted">{fmtDate(o.createdAt)} · {o.itemCount} item(s)</span><span className="mt-1 flex justify-between text-xs"><span className="text-olive">{o.status}</span><span>{formatINR(o.total)}</span></span></span></Link></li>
//             ))}
//           </ul>
//           <Link href="/account/orders" className="block border-t border-line px-4 py-3 text-center text-xs uppercase tracking-widest text-maroon hover:bg-olive/5">All orders</Link>
//         </>
//       )}
//     </Menu>
//   );
// }

// export function AccountMenu() {
//   const { data, isLoading, refetch } = useAccount();
//   const router = useRouter();
//   const qc = useQueryClient();
//   const c = data?.customer;
//   const row = "block px-4 py-2.5 text-sm hover:bg-olive/5";
//   return (
//     <Menu label="Account" icon={<User className="h-5 w-5" />} hiddenOnMobile onOpen={() => refetch()}>
//       {isLoading ? <Skeleton /> : !data?.loggedIn || !c ? (
//         <EmptyDialog icon={<LogIn className="h-7 w-7" />} title="Welcome back" text="Log in to see your liked items, orders and saved details." href="/login" cta="Log in" />
//       ) : (
//         <>
//           <div className="flex items-center gap-3 border-b border-line px-4 py-4">
//             <span className="flex h-11 w-11 items-center justify-center rounded-full bg-olive text-lg uppercase text-ivory">{c.name.trim().charAt(0) || "U"}</span>
//             <span className="min-w-0 text-sm"><span className="block truncate font-medium">{c.name}</span><span className="block truncate text-xs text-muted">{c.email ?? (c.mobile ? `+91 ${c.mobile}` : "")}</span>{c.loyaltyPoints > 0 && <span className="block text-xs text-olive">{c.loyaltyPoints} loyalty points</span>}</span>
//           </div>
//           <Link href="/account" className={row}>My account</Link>
//           <Link href="/account/orders" className={row}>Orders ({data.orderTotal})</Link>
//           <Link href="/wishlist" className={row}>Wishlist ({data.wishlist.length})</Link>
//           <Link href="/account/addresses" className={row}>Addresses</Link>
//           <button type="button" className={`${row} w-full border-t border-line text-left text-maroon`} onClick={async () => { await fetch("/api/v1/auth/logout", { method: "POST" }); qc.clear(); router.push("/"); router.refresh(); }}>Log out</button>
//         </>
//       )}
//     </Menu>
//   );
// }


////////////////////////////////////////////////////////////////////////////////////////////////

// FILE: src/components/layout/nav-dialogs.tsx   (NEW FILE)
// ADDED: WishlistMenu({count}), OrdersMenu(), AccountMenu() + helpers Menu, EmptyDialog, Skeleton, Thumb, fmtDate.
// FIX: guests see no liked items and no badge count; empty dialog asks them to log in.
// PURPOSE: navbar dialogs auto-filled from useAccount(); empty dialog with icon when no liked items / orders / not logged in.
"use client";
import { Heart, LogIn, Package, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAccount } from "@/hooks/useAccount";
import { buttonClass } from "@/components/ui/button";
import { ComingSoonImage } from "@/components/ui/coming-soon-image";
import { Price } from "@/components/ui/price";
import { formatINR, isRemoteImageSource } from "@/lib/utils";

/** Anchored dialog: opens under its icon, closes on outside click / Esc / page change. Refetches data each time it opens. */
function Menu({ label, icon, count, hiddenOnMobile, children, onOpen }: { label: string; icon: React.ReactNode; count?: number; hiddenOnMobile?: boolean; children: React.ReactNode; onOpen?: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const click = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", click);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", click); document.removeEventListener("keydown", key); };
  }, [open]);
  return (
    <div ref={ref} className={`relative ${hiddenOnMobile ? "hidden sm:block" : ""}`}>
      <button type="button" aria-label={label} aria-expanded={open} onClick={() => { setOpen((v) => !v); if (!open) onOpen?.(); }} className="relative rounded-full p-1.5 hover:bg-olive/10 sm:p-2">
        {icon}
        {!!count && count > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-maroon px-1 text-[10px] text-ivory">{count}</span>}
      </button>
      {open && (
        <div role="dialog" aria-label={label} className="absolute right-0 top-full z-[60] mt-2 w-[min(92vw,22rem)] rounded-sm border border-line bg-ivory shadow-2xl">
          {children}
        </div>
      )}
    </div>
  );
}

function EmptyDialog({ icon, title, text, href, cta }: { icon: React.ReactNode; title: string; text: string; href: string; cta: string }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-gold/60 bg-white text-olive">{icon}</span>
      <h3 className="mt-4 text-xl">{title}</h3>
      <p className="mt-1 text-sm text-muted">{text}</p>
      <Link href={href} className={buttonClass("outline", "md", "mt-5")}>{cta}</Link>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3 p-4">
      {[0, 1, 2].map((i) => <div key={i} className="flex gap-3"><div className="h-16 w-12 animate-pulse rounded-sm bg-line" /><div className="flex-1 space-y-2 py-1"><div className="h-3 w-3/4 animate-pulse rounded bg-line" /><div className="h-3 w-1/3 animate-pulse rounded bg-line" /></div></div>)}
    </div>
  );
}

function Thumb({ src, alt }: { src?: string | null; alt: string }) {
  return (
    <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-sm bg-line">
      {src ? <Image src={src} alt={alt} fill unoptimized={isRemoteImageSource(src)} sizes="48px" className="object-cover" /> : <ComingSoonImage compact className="absolute inset-0" />}
    </div>
  );
}

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "");

export function WishlistMenu({ count }: { count: number }) {
  const { data, isLoading, refetch } = useAccount();
  const items = data?.wishlist ?? [];
  return (
    <Menu label="Wishlist" icon={<Heart className="h-5 w-5" />} count={data?.loggedIn ? count : 0} onOpen={() => refetch()}>
      {isLoading ? <Skeleton /> : !data?.loggedIn ? (
        <EmptyDialog icon={<Heart className="h-7 w-7" />} title="Log in to see liked items" text="Your liked products appear here after you log in." href="/login?next=/wishlist" cta="Log in" />
      ) : items.length === 0 ? (
        <EmptyDialog icon={<Heart className="h-7 w-7" />} title="Nothing liked yet" text="Tap the heart on any saree to save it here." href="/collections/sarees" cta="Start shopping" />
      ) : (
        <>
          <p className="border-b border-line px-4 py-3 text-xs uppercase tracking-widest text-muted">Liked items ({items.length})</p>
          <ul className="max-h-80 divide-y divide-line overflow-y-auto">
            {items.map((p) => (
              <li key={p.sku}><Link href={p.href} className="flex gap-3 px-4 py-3 hover:bg-olive/5"><Thumb src={p.image} alt={p.name} /><span className="min-w-0 text-sm"><span className="line-clamp-2 leading-snug">{p.name}</span><Price amount={p.price} mrp={p.mrp} size="sm" className="mt-1" /></span></Link></li>
            ))}
          </ul>
          <Link href="/wishlist" className="block border-t border-line px-4 py-3 text-center text-xs uppercase tracking-widest text-maroon hover:bg-olive/5">View all</Link>
        </>
      )}
    </Menu>
  );
}

export function OrdersMenu() {
  const { data, isLoading, refetch } = useAccount();
  const orders = data?.orders ?? [];
  return (
    <Menu label="Orders" icon={<Package className="h-5 w-5" />} onOpen={() => refetch()}>
      {isLoading ? <Skeleton /> : !data?.loggedIn ? (
        <EmptyDialog icon={<Package className="h-7 w-7" />} title="Log in to see orders" text="Your past orders appear here automatically." href="/login?next=/account/orders" cta="Log in" />
      ) : orders.length === 0 ? (
        <EmptyDialog icon={<Package className="h-7 w-7" />} title="No orders yet" text="When you place an order it will show up here." href="/collections/sarees" cta="Start shopping" />
      ) : (
        <>
          <p className="border-b border-line px-4 py-3 text-xs uppercase tracking-widest text-muted">Recent orders ({data.orderTotal})</p>
          <ul className="max-h-80 divide-y divide-line overflow-y-auto">
            {orders.map((o) => (
              <li key={o.orderNo}><Link href={`/account/orders/${o.orderNo}`} className="flex gap-3 px-4 py-3 hover:bg-olive/5"><Thumb src={o.image} alt={o.name} /><span className="min-w-0 flex-1 text-sm"><span className="block truncate font-medium">{o.orderNo}</span><span className="block text-xs text-muted">{fmtDate(o.createdAt)} · {o.itemCount} item(s)</span><span className="mt-1 flex justify-between text-xs"><span className="text-olive">{o.status}</span><span>{formatINR(o.total)}</span></span></span></Link></li>
            ))}
          </ul>
          <Link href="/account/orders" className="block border-t border-line px-4 py-3 text-center text-xs uppercase tracking-widest text-maroon hover:bg-olive/5">All orders</Link>
        </>
      )}
    </Menu>
  );
}

export function AccountMenu() {
  const { data, isLoading, refetch } = useAccount();
  const router = useRouter();
  const qc = useQueryClient();
  const c = data?.customer;
  const row = "block px-4 py-2.5 text-sm hover:bg-olive/5";
  return (
    <Menu label="Account" icon={<User className="h-5 w-5" />} hiddenOnMobile onOpen={() => refetch()}>
      {isLoading ? <Skeleton /> : !data?.loggedIn || !c ? (
        <EmptyDialog icon={<LogIn className="h-7 w-7" />} title="Welcome back" text="Log in to see your liked items, orders and saved details." href="/login" cta="Log in" />
      ) : (
        <>
          <div className="flex items-center gap-3 border-b border-line px-4 py-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-olive text-lg uppercase text-ivory">{c.name.trim().charAt(0) || "U"}</span>
            <span className="min-w-0 text-sm"><span className="block truncate font-medium">{c.name}</span><span className="block truncate text-xs text-muted">{c.email ?? (c.mobile ? `+91 ${c.mobile}` : "")}</span>{c.loyaltyPoints > 0 && <span className="block text-xs text-olive">{c.loyaltyPoints} loyalty points</span>}</span>
          </div>
          <Link href="/account" className={row}>My account</Link>
          <Link href="/account/orders" className={row}>Orders ({data.orderTotal})</Link>
          <Link href="/wishlist" className={row}>Wishlist ({data.wishlist.length})</Link>
          <Link href="/account/addresses" className={row}>Addresses</Link>
          <button type="button" className={`${row} w-full border-t border-line text-left text-maroon`} onClick={async () => { await fetch("/api/v1/auth/logout", { method: "POST" }); qc.clear(); router.push("/"); router.refresh(); }}>Log out</button>
        </>
      )}
    </Menu>
  );
}
