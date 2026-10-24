import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getCustomerSession } from "@/lib/auth";
import { LogoutButton } from "@/components/account/logout-button";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await getCustomerSession();
  if (!session) {
    const path = (await headers()).get("x-pathname") ?? "/account";
    redirect(`/login?next=${encodeURIComponent(path)}`);
  }
  const nav = [{ href: "/account", label: "Overview" }, { href: "/account/orders", label: "Orders" }, { href: "/account/addresses", label: "Addresses" }, { href: "/wishlist", label: "Wishlist" }];
  return (
    <div className="mx-auto max-w-site px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="we-rule text-4xl">My account</h1><p className="mt-3 text-sm text-muted">{[session.name, session.email ?? (session.mobile && `+91 ${session.mobile}`)].filter(Boolean).join(" · ")}</p></div>
        <LogoutButton />
      </div>
      <div className="mt-8 grid gap-8 md:grid-cols-[200px_1fr]">
        <nav className="flex gap-2 overflow-x-auto md:flex-col">
          {nav.map((n) => <Link key={n.href} href={n.href} className="whitespace-nowrap rounded-sm border border-line px-4 py-2 text-xs uppercase tracking-widest text-olive hover:border-gold">{n.label}</Link>)}
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
