// [CHG-13] NEW FILE. WHY: shared layout (fact cards + numbered sections + contact card) for the 4 policy pages, so they are real UI code, not database text.
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export interface PolicySection { heading: string; text?: string; items?: string[] }
export interface PolicyFact { label: string; value: string }

/** Shared layout for the policy pages: quick-fact cards, numbered sections, contact card. */
export function PolicyLayout({ title, intro, facts, sections }: { title: string; intro: string; facts?: PolicyFact[]; sections: PolicySection[] }) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <Breadcrumbs items={[{ label: title }]} />
      <h1 className="we-rule mt-4 text-4xl">{title}</h1>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink/80">{intro}</p>

      {facts && (
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {facts.map((f) => (
            <div key={f.label} className="rounded-sm border border-olive/25 bg-olive/5 p-4">
              <p className="text-[11px] uppercase tracking-widest text-muted">{f.label}</p>
              <p className="mt-1 text-lg font-medium text-olive">{f.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 space-y-4">
        {sections.map((s, i) => (
          <section key={s.heading} className="rounded-sm border border-line bg-white p-5">
            <h2 className="flex items-center gap-3 text-xl">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-maroon text-xs text-white">{i + 1}</span>
              {s.heading}
            </h2>
            {s.text && <p className="mt-3 text-sm leading-relaxed text-ink/80">{s.text}</p>}
            {s.items && (
              <ul className="mt-3 space-y-2 text-sm text-ink/80">
                {s.items.map((it) => (
                  <li key={it} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />{it}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <section className="mt-8 rounded-sm border border-gold/40 bg-gold/10 p-5 text-sm">
        <h2 className="text-xl">Questions?</h2>
        <p className="mt-2 text-ink/80">Woven Essence (Temple Fabrics), 1st Floor 4T, Block 34, 27th Cross, 4th T Block East, Jayanagar, Bengaluru, Karnataka 560011</p>
        <p className="mt-1 text-ink/80">Phone <a href="tel:09916311500" className="text-maroon underline">099163 11500</a> · <a href="mailto:hello@wovenessence.in" className="text-maroon underline">hello@wovenessence.in</a> · Mon–Sat, 10:30 am – 8:30 pm</p>
        <p className="mt-3 text-xs text-muted">
          <Link href="/pages/privacy-policy" className="underline">Privacy</Link> · <Link href="/pages/terms" className="underline">Terms</Link> · <Link href="/pages/shipping-policy" className="underline">Shipping</Link> · <Link href="/pages/returns" className="underline">Returns &amp; refunds</Link>
        </p>
      </section>
    </div>
  );
}
