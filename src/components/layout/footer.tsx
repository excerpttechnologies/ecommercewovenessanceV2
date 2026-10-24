import Link from "next/link";
import { Instagram, Facebook, Youtube } from "lucide-react";
import { Logo } from "@/components/Logo";
import { getCategoryTree, getFooterPages, getSettings } from "@/lib/site-data";
import { NewsletterForm } from "@/components/home/newsletter-form";

const DEFAULT_ADDRESS = "1ST FLOOR 4T, BLOCK 34, 27th Cross, 4th T Block East, 4th Block, Jayanagar, Bengaluru, Karnataka 560011";
const DEFAULT_PHONE = "099163 11500";
const DEFAULT_EMAIL = "hello@wovenessence.in";
const DEFAULT_HOURS = "Mon–Sat, 10:30 am – 8:30 pm";
const DEFAULT_INSTAGRAM = "https://www.instagram.com/templefabrics?vrfl=eXoyOXo5MzQyamNu";

export async function Footer() {
  const [settings, pages, categories] = await Promise.all([getSettings(), getFooterPages().catch(() => []), getCategoryTree().catch(() => [])]);
  const address = settings.contact?.address === "Temple Fabrics, 12 Commercial Street, Shivaji Nagar, Bengaluru 560001"
    || settings.contact?.address === "1st & 2nd Floor, SRS Complex, 2611, 27th Main Rd, above Kushal's, 1st Sector, HSR Layout, Bengaluru, Karnataka 560102"
    ? DEFAULT_ADDRESS
    : settings.contact?.address || DEFAULT_ADDRESS;
  const phone = settings.contact?.phone === "+91 80 4000 0000"
    ? DEFAULT_PHONE
    : settings.contact?.phone || DEFAULT_PHONE;
  const email = settings.contact?.email || DEFAULT_EMAIL;
  const hours = settings.contact?.hours || DEFAULT_HOURS;
  const instagram = settings.social?.instagram === "https://instagram.com/wovenessence"
    ? DEFAULT_INSTAGRAM
    : settings.social?.instagram || DEFAULT_INSTAGRAM;
  const policies = pages.filter((p) => p.type === "policy");
  const info = pages.filter((p) => p.type === "page" || p.type === "faq");
  return (
    <footer className="mt-20 border-t border-line bg-white/40">
      <div className="mx-auto grid max-w-site gap-10 px-4 py-14 sm:px-6 md:grid-cols-12">
        <div className="md:col-span-4">
          <Logo settings={settings} height={44} />
          <p className="mt-4 max-w-xs text-sm text-muted">{settings.seo?.defaultDescription ?? "Handloom sarees and fabrics from Temple Fabrics, Bengaluru — woven with tradition, delivered anywhere."}</p>
          <address className="mt-5 space-y-1 text-sm not-italic text-muted">
            <p>{address}</p>
            <p><a href="tel:+919916311500" className="hover:text-olive">{phone}</a></p>
            <p><a href={`mailto:${email}`} className="hover:text-olive">{email}</a></p>
            <p>{hours}</p>
          </address>
          <div className="mt-5 flex gap-3 text-sm text-olive">
            {instagram && <a href={instagram} aria-label="Instagram @templefabrics" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:text-maroon"><Instagram className="h-5 w-5" />@templefabrics</a>}
            {settings.social?.facebook && <a href={settings.social.facebook} aria-label="Facebook" target="_blank" rel="noreferrer"><Facebook className="h-5 w-5" /></a>}
            {settings.social?.youtube && <a href={settings.social.youtube} aria-label="YouTube" target="_blank" rel="noreferrer"><Youtube className="h-5 w-5" /></a>}
          </div>
        </div>
        <FooterCol title="Shop" links={[...categories.map((c) => ({ label: c.name, href: `/collections/${c.slug}` })), { label: "New Arrivals", href: "/collections/new-arrivals" }, { label: "All collections", href: "/collections" }]} />
        <FooterCol title="Help" links={[{ label: "Track your order", href: "/track-order" }, { label: "Store locator", href: "/stores" }, { label: "Contact us", href: "/contact" }, ...info.map((p) => ({ label: p.title, href: `/pages/${p.slug}` }))]} />
        <FooterCol title="Policies" links={policies.map((p) => ({ label: p.title, href: `/pages/${p.slug}` }))} />
        <div className="md:col-span-2">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.22em] text-gold">Newsletter</p>
          <p className="mb-3 text-sm text-muted">New weaves, first.</p>
          <NewsletterForm compact />
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-site flex-col items-center justify-between gap-2 px-4 py-4 text-[11px] uppercase tracking-widest text-muted sm:flex-row sm:px-6">
          <p>© {new Date().getFullYear()} {settings.legalName}. All rights reserved.</p>
          <p className="font-heading text-sm normal-case italic tracking-normal text-gold">{settings.tagline}</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div className="md:col-span-2">
      <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.22em] text-gold">{title}</p>
      <ul className="space-y-2 text-sm">
        {links.map((l) => (
          <li key={l.href + l.label}><Link href={l.href} className="text-ink/80 hover:text-maroon">{l.label}</Link></li>
        ))}
      </ul>
    </div>
  );
}
