import Link from "next/link";
import { Clock, Mail, Phone } from "lucide-react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { businessInfo, e164 } from "@/lib/business";
import { breadcrumbJsonLd } from "@/lib/seo";
import { getSettings } from "@/lib/site-data";

/** Shown on the policy pages; update when the wording below changes. */
export const POLICY_LAST_UPDATED = "13 November 2026";

/** Page shell for About Us and the policy pages: same container, breadcrumbs and prose as the CMS pages. */
export async function LegalPage({
  title,
  intro,
  path,
  showUpdated = true,
  children,
}: {
  title: string;
  intro: string;
  path: string;
  showUpdated?: boolean;
  children: React.ReactNode;
}) {
  const info = businessInfo(await getSettings());
  return (
    <div className="mx-auto max-w-site px-4 py-6 sm:px-6">
      <JsonLd nodes={[breadcrumbJsonLd([{ name: title, path }])]} />
      <Breadcrumbs items={[{ label: title }]} />
      <div className="mt-4 grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <article>
          <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">{intro}</p>
          {showUpdated && <p className="mt-2 text-xs text-muted">Last updated: {POLICY_LAST_UPDATED}</p>}
          <div className="prose-we mt-8 max-w-3xl">{children}</div>
        </article>

        <aside className="h-fit rounded-2xl border border-line/80 bg-white p-5 text-sm lg:sticky lg:top-28">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-maroon">Need help?</p>
          <p className="mt-2 leading-relaxed text-ink/80">
            Questions about an order, a return or a refund? Our team in Jayanagar, Bengaluru will help.
          </p>
          <ul className="mt-4 space-y-2.5 text-ink/80">
            <li className="flex items-start gap-2">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-maroon" />
              <a href={`tel:${e164(info.phone)}`} className="hover:text-maroon">{info.phone}</a>
            </li>
            <li className="flex items-start gap-2">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-maroon" />
              <a href={`mailto:${info.email}`} className="break-all hover:text-maroon">{info.email}</a>
            </li>
            <li className="flex items-start gap-2">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-maroon" />
              <span>{info.hours}</span>
            </li>
          </ul>
          <Link
            href="/contact"
            className="mt-5 inline-flex items-center rounded-full bg-maroon px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90"
          >
            Contact us
          </Link>
        </aside>
      </div>
    </div>
  );
}
