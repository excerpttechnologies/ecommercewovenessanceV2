import Link from "next/link";
import { Check, ShieldCheck } from "lucide-react";

const PERKS = [
  ["Exclusive collections", "Access the latest saree arrivals first"],
  ["Easy & secure shopping", "Safe payments and a quick checkout"],
  ["Track orders", "Follow your saree from store to door"],
  ["Wishlist & offers", "Save favourites and get store offers"],
] as const;

/** Two-column frame shared by the customer log-in and registration pages. */
export function AuthShell({ title, subtitle, switchTo, children }: {
  title: string;
  subtitle: string;
  switchTo: { prompt: string; label: string; href: string };
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto grid max-w-site px-4 py-10 sm:px-6 lg:grid-cols-2 lg:py-16">
      <aside className="hidden flex-col justify-center rounded-l-sm bg-gold/10 px-12 py-16 lg:flex">
        <p className="text-xs uppercase tracking-[0.25em] text-gold">Woven Essence</p>
        <p className="mt-4 font-heading text-5xl leading-tight text-olive">Welcome to<span className="block text-maroon">Woven Essence</span></p>
        <p className="mt-6 max-w-md text-muted">Sign in to explore our collections and enjoy a seamless shopping experience.</p>
        <ul className="mt-10 space-y-6">
          {PERKS.map(([perk, detail]) => (
            <li key={perk} className="flex items-center gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gold/40 bg-white/70 text-gold"><Check className="h-4 w-4" /></span>
              <span><span className="block text-ink">{perk}</span><span className="text-sm text-muted">{detail}</span></span>
            </li>
          ))}
        </ul>
      </aside>
      <section className="lg:rounded-r-sm lg:border lg:border-l-0 lg:border-line lg:bg-white/50 lg:px-14 lg:py-16">
        <div className="mx-auto max-w-md">
          <div className="we-rule">
            <h1 className="text-4xl">{title}</h1>
            <p className="mt-2 text-sm text-muted">{subtitle}</p>
          </div>
          {children}
          <p className="mt-8 text-center text-sm text-muted">
            {switchTo.prompt}{" "}
            <Link href={switchTo.href} className="font-medium text-maroon underline decoration-gold underline-offset-4">{switchTo.label}</Link>
          </p>
          <p className="mt-8 flex gap-3 rounded-sm border border-line bg-gold/5 p-4 text-sm text-muted">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
            <span><b className="font-medium text-ink">We value your privacy.</b> Your details are stored on our own server and never sold.</span>
          </p>
          <p className="mt-6 text-center text-xs text-muted">
            Woven Essence staff should use the <Link href="/admin/login" className="underline underline-offset-4 hover:text-olive">admin sign-in</Link>.
          </p>
        </div>
      </section>
    </div>
  );
}
