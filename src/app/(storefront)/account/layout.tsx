// import Link from "next/link";
// import { redirect } from "next/navigation";
// import { headers } from "next/headers";
// import { getCustomerSession } from "@/lib/auth";
// import { LogoutButton } from "@/components/account/logout-button";

// export default async function AccountLayout({ children }: { children: React.ReactNode }) {
//   const session = await getCustomerSession();
//   if (!session) {
//     const path = (await headers()).get("x-pathname") ?? "/account";
//     redirect(`/login?next=${encodeURIComponent(path)}`);
//   }
//   const nav = [{ href: "/account", label: "Overview" }, { href: "/account/orders", label: "Orders" }, { href: "/account/addresses", label: "Addresses" }, { href: "/wishlist", label: "Wishlist" }];
//   return (
//     <div className="mx-auto max-w-site px-4 py-8 sm:px-6">
//       <div className="flex flex-wrap items-end justify-between gap-4">
//         <div><h1 className="text-4xl font-bold">My account</h1><p className="mt-3 text-sm text-muted">{[session.name, session.email ?? (session.mobile && `+91 ${session.mobile}`)].filter(Boolean).join(" · ")}</p></div>
//         <LogoutButton />
//       </div>
//       <div className="mt-8 grid gap-8 md:grid-cols-[200px_1fr]">
//         <nav className="flex gap-2 overflow-x-auto md:flex-col">
//           {nav.map((n) => <Link key={n.href} href={n.href} className="whitespace-nowrap rounded-lg border border-line px-4 py-2 text-xs uppercase tracking-wider text-olive hover:border-gold">{n.label}</Link>)}
//         </nav>
//         <div className="min-w-0">{children}</div>
//       </div>
//     </div>
//   );
// }


////////////////////////////////////////////////////////////////////
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { Mail, Phone } from "lucide-react";
import { getCustomerSession } from "@/lib/auth";
import { LogoutButton } from "@/components/account/logout-button";
import { AccountNav } from "@/components/account/account-nav";
import { accountCard } from "@/components/account/account-card";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await getCustomerSession();
  if (!session) {
    const path = (await headers()).get("x-pathname") ?? "/account";
    redirect(`/login?next=${encodeURIComponent(path)}`);
  }
  return (
    <div className="mx-auto max-w-site px-4 py-6 sm:px-6 sm:py-8">
      <div className="grid gap-5 md:grid-cols-[260px_1fr] md:gap-6">
        {/* Profile, section links and log out in one sidebar card (stacked above the content on phones). */}
        <aside className={`${accountCard} min-w-0 self-start overflow-hidden md:sticky md:top-24`}>
          <div className="border-b border-line/70 px-5 pb-4 pt-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-maroon">My account</p>
            <h1 className="truncate font-display text-xl font-semibold text-[#8c1048]">Hello, {session.name || "there"}</h1>
            <div className="mt-3 space-y-1.5 text-xs text-ink/75">
              {session.email && <p className="flex min-w-0 items-center gap-2"><Mail className="h-3.5 w-3.5 shrink-0 text-maroon/70" /><span className="truncate" title={session.email}>{session.email}</span></p>}
              {session.mobile && <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 shrink-0 text-maroon/70" />+91 {session.mobile}</p>}
            </div>
          </div>
          <div className="p-2.5 md:p-2">
            <AccountNav />
          </div>
          <div className="border-t border-line/70 p-3">
            <LogoutButton />
          </div>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

