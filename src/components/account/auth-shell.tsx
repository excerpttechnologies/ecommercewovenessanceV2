import Link from "next/link";
import { ArrowRight, Crown, Heart, Package, ShieldCheck } from "lucide-react";
import { AccentTitle } from "@/components/ui/section-heading";

const PERKS = [
  [Crown, "Exclusive collections", "Access the latest saree arrivals first"],
  [ShieldCheck, "Easy & secure shopping", "Safe payments and a quick checkout"],
  [Package, "Track orders", "Follow your saree from store to door"],
  [Heart, "Wishlist & offers", "Save favourites and get store offers"],
] as const;

/** Two-panel frame shared by the customer log-in and registration pages. */
export function AuthShell({ title, subtitle, intro, switchTo, children }: {
  title: string;
  subtitle: string;
  /** Left-panel line under "Welcome to Woven Essence". */
  intro?: string;
  switchTo: { prompt: string; label: string; href: string };
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[radial-gradient(ellipse_at_top,rgba(219,26,114,0.06),transparent_60%)]">
      <div className="mx-auto max-w-site px-4 py-8 sm:px-6 lg:py-12">
        <div className="grid overflow-hidden rounded-2xl bg-white shadow-[0_30px_70px_-40px_rgba(122,18,56,0.55)] ring-1 ring-black/[0.04] lg:grid-cols-[1.05fr_1fr]">
          {/* Brand panel: portrait photo with the copy laid over its soft left side */}
          <aside className="relative hidden min-h-[640px] overflow-hidden bg-[#f6dfe2] bg-[url('/auth-portrait.webp')] bg-cover bg-[position:70%_20%] lg:block">
            <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-[#f8e6e8] via-[#f8e6e8]/85 to-transparent" />
            <div className="relative flex h-full max-w-[62%] flex-col justify-between p-10 xl:p-12">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.35em] text-maroon">Woven Essence</p>
                <span aria-hidden className="mt-3 block h-0.5 w-12 bg-maroon" />
                <p className="mt-8 font-display text-[38px] leading-[1.1] text-olive xl:text-[42px]">Welcome to<span className="block whitespace-nowrap text-maroon">Woven Essence</span></p>
                <p className="mt-4 text-[15px] leading-relaxed text-ink/75">{intro ?? "Discover timeless sarees crafted with tradition and elegance. Sign in to explore our collections and enjoy a seamless shopping experience."}</p>
                <ul className="mt-8 space-y-5">
                  {PERKS.map(([Icon, perk, detail]) => (
                    <li key={perk} className="flex items-center gap-3.5">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/80 text-maroon shadow-[0_6px_16px_-8px_rgba(122,18,56,0.5)] ring-1 ring-maroon/10"><Icon className="h-[18px] w-[18px]" /></span>
                      <span><span className="block text-[15px] font-medium text-olive">{perk}</span><span className="text-[13px] text-ink/65">{detail}</span></span>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="mt-10 text-center font-display text-xs uppercase leading-relaxed tracking-[0.4em] text-brass">Tradition<span className="block">in every thread</span></p>
            </div>
          </aside>

          {/* Form panel */}
          <section className="relative px-5 py-8 sm:px-10 sm:py-10 lg:px-12 lg:py-12">
            {/* Phones: a slim photo strip keeps the brand feel without pushing the form down */}
            <div aria-hidden className="-mx-5 -mt-8 mb-6 h-32 bg-[url('/auth-portrait.webp')] bg-cover bg-[position:70%_22%] sm:-mx-10 sm:-mt-10 lg:hidden" />
            <div className="mx-auto max-w-md">
              <h1 className="font-display text-[34px] font-medium leading-tight sm:text-[40px]"><AccentTitle title={title} /></h1>
              <p className="mt-2 text-sm text-muted">{subtitle}</p>
              <span aria-hidden className="mt-4 block h-0.5 w-12 rounded-full bg-maroon" />
              {children}
              <div className="mt-6 flex items-center gap-4 text-xs text-muted" aria-hidden>
                <span className="h-px flex-1 bg-line" /> OR <span className="h-px flex-1 bg-line" />
              </div>
              <p className="mt-4 text-center text-sm text-ink/75">
                {switchTo.prompt}{" "}
                <Link href={switchTo.href} className="group inline-flex items-center gap-1 font-semibold text-maroon underline underline-offset-4">
                  {switchTo.label} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </p>
              <p className="mt-6 flex gap-3 rounded-xl bg-maroon/[0.05] p-4 text-sm text-muted">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-maroon" />
                <span><b className="block font-semibold text-olive">We value your privacy.</b>Your details are stored on our own server and never sold.</span>
              </p>
              <p className="mt-5 text-center text-xs text-muted">
                Woven Essence staff should use the <Link href="/admin/login" className="underline underline-offset-4 hover:text-maroon">admin sign-in</Link>.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
