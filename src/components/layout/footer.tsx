import Link from "next/link";
import { BadgeCheck, ChevronRight, Clock, CreditCard, Facebook, Headphones, Instagram, Mail, MapPin, Phone, Truck, Youtube } from "lucide-react";
import { Logo } from "@/components/Logo";
import { businessInfo } from "@/lib/business";
import { getCategoryTree, getFooterPages, getSettings } from "@/lib/site-data";
import { NewsletterForm } from "@/components/home/newsletter-form";
import { LeafSpray, Lotus } from "@/components/ui/ornaments";
import { BackToTop } from "./back-to-top";

const socialClass = "flex h-12 w-12 items-center justify-center rounded-full border border-olive/15 bg-white/50 text-olive max-md:border-white/40 max-md:bg-white/15 max-md:text-white backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-maroon hover:bg-maroon hover:text-white hover:shadow-[0_10px_20px_-10px_rgba(219,26,114,0.8)]";

export async function Footer() {
  const [settings, pages, categories] = await Promise.all([getSettings(), getFooterPages().catch(() => []), getCategoryTree().catch(() => [])]);
  const { address, phone, email, hours, instagram } = businessInfo(settings);
  const policies = pages.filter((p) => p.type === "policy");
  const info = pages.filter((p) => p.type === "page" || p.type === "faq");
  const onlinePayments = settings.commerce?.razorpayEnabled === true;
  const codEnabled = settings.commerce?.codEnabled !== false;
  const freeAbove = settings.commerce?.freeShippingAbove;
  const features = [
    { Icon: Truck, title: "Free Shipping", text: freeAbove ? `Above ₹${freeAbove.toLocaleString("en-IN")}` : "On all orders" },
    { Icon: BadgeCheck, title: "Authentic", text: "Products" },
    { Icon: CreditCard, title: "Secure", text: "Payments" },
    { Icon: Headphones, title: "Dedicated", text: "Support" },
  ];

  return (
    <footer className="mt-16">
      {/* Background photo (public/footer-bg.jpg) over a matching gradient, so the footer still looks right without it. */}
      <div className="relative overflow-hidden bg-[linear-gradient(115deg,#fbe3ea_0%,#fdf4ef_35%,#fbf3ec_65%,#f7dfe6_100%)]">
        <div aria-hidden className="absolute inset-0 bg-[url('/footer-bg.jpg')] bg-cover bg-right-bottom opacity-95" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-white/45 via-white/25 to-transparent" />
        {/* Phones: the photo sits right behind the text, so a plum layer keeps the white text readable. */}
        <div aria-hidden className="absolute inset-0 bg-[#4a0f2b]/75 md:hidden" />
        <LeafSpray className="absolute -left-10 bottom-0 hidden h-72 w-60 text-brass/30 md:block" />
        <LeafSpray className="absolute bottom-0 left-[28%] hidden h-48 w-44 -scale-x-100 text-brass/25 lg:block" />

        <div className="relative mx-auto grid max-w-site gap-10 px-4 pb-14 pt-16 sm:px-6 lg:pr-40 xl:pr-44 md:grid-cols-2 lg:grid-cols-[1.15fr_0.8fr_1fr_1.6fr] lg:gap-0">
          <div className="lg:pr-8">
            <Logo settings={settings} height={84} className="inline-block max-md:rounded-xl max-md:bg-white/90 max-md:p-2" />
            <p className="mt-6 max-w-sm text-[15px] leading-relaxed text-ink/75 max-md:font-semibold max-md:text-white">{settings.seo?.defaultDescription ?? "Handloom sarees and fabrics from Temple Fabrics, Bengaluru — woven with tradition, delivered anywhere."}</p>
            <address className="mt-6 space-y-3 text-sm not-italic text-ink/80 max-md:font-semibold max-md:text-white">
              <ContactRow Icon={MapPin}>{address}</ContactRow>
              <ContactRow Icon={Phone}><a href="tel:+919916311500" className="hover:text-maroon">{phone}</a></ContactRow>
              <ContactRow Icon={Mail}><a href={`mailto:${email}`} className="hover:text-maroon">{email}</a></ContactRow>
              <ContactRow Icon={Clock}>{hours}</ContactRow>
            </address>
            <div className="mt-7 flex gap-3">
              {instagram && <a href={instagram} aria-label="Instagram @templefabrics" target="_blank" rel="noreferrer" className={socialClass}><Instagram className="h-5 w-5" /></a>}
              {settings.social?.facebook && <a href={settings.social.facebook} aria-label="Facebook" target="_blank" rel="noreferrer" className={socialClass}><Facebook className="h-5 w-5" /></a>}
              {settings.social?.youtube && <a href={settings.social.youtube} aria-label="YouTube" target="_blank" rel="noreferrer" className={socialClass}><Youtube className="h-5 w-5" /></a>}
            </div>
          </div>
          <FooterCol title="Quick Links" links={[{ label: "Home", href: "/" }, ...categories.map((c) => ({ label: c.name, href: `/collections/${c.slug}` })), { label: "New Arrivals", href: "/collections/new-arrivals" }, { label: "All Collections", href: "/collections" }, { label: "Wishlist", href: "/wishlist" }]} />
          <FooterCol title="Customer Service" links={dedupe([{ label: "Track Order", href: "/track-order" }, { label: "My Account", href: "/account" }, { label: "Store Locator", href: "/stores" }, { label: "Contact Us", href: "/contact" }, ...info.map((p) => ({ label: p.title, href: `/pages/${p.slug}` })), ...policies.map((p) => ({ label: p.title, href: `/pages/${p.slug}` }))])} />
          <div className="md:col-span-2 lg:col-span-1 lg:border-l lg:border-olive/10 lg:pl-8 xl:pl-10">
            <FooterHeading>Newsletter</FooterHeading>
            <p className="mb-5 max-w-md text-[15px] leading-relaxed text-ink/75 max-md:font-semibold max-md:text-white">Subscribe to hear about new weaves, festive edits and offers first.</p>
            <div className="max-w-md"><NewsletterForm compact /></div>
            <ul className="mt-6 grid max-w-md grid-cols-2 gap-y-5 sm:grid-cols-4">
              {features.map(({ Icon, title, text }, i) => (
                <li key={title} className={`group flex flex-col items-center px-2 text-center ${i > 0 ? "sm:border-l sm:border-olive/10" : ""}`}>
                  <Icon className="h-7 w-7 text-maroon transition-transform max-md:text-[#f7a8c8] duration-300 group-hover:-translate-y-1" strokeWidth={1.5} />
                  <p className="mt-2 text-sm font-semibold leading-tight text-olive max-md:text-white">{title}</p>
                  <p className="mt-0.5 text-xs leading-tight text-ink/70 max-md:font-medium max-md:text-white/85">{text}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-[#4a0f2b] text-white/90">
        <div className="mx-auto flex max-w-site flex-col items-center justify-between gap-5 px-4 py-6 sm:px-6 lg:flex-row">
          <p className="text-sm">© {new Date().getFullYear()} {settings.legalName}. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-2.5" aria-label="Payment methods">
            {onlinePayments && <PaymentBadges />}
            {codEnabled && <span className="flex h-9 items-center rounded-md bg-white px-3 text-xs font-bold text-[#4a0f2b]">Cash on Delivery</span>}
          </div>
          <div className="flex items-center gap-5">
            <Lotus className="h-7 w-10 text-[#e8c27a]" />
            <span className="h-8 w-px bg-[#e8c27a]/60" />
            <p className="font-display text-base text-[#e8c27a]">Tradition <span className="mx-1.5 opacity-70">|</span> Weaves <span className="mx-1.5 opacity-70">|</span> You</p>
            <BackToTop />
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-6 whitespace-nowrap font-display text-2xl font-medium text-olive max-md:text-white xl:text-[26px]">
      {children}
      <span aria-hidden className="mt-3 block h-0.5 w-10 bg-brass" />
    </p>
  );
}

function ContactRow({ Icon, children }: { Icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <p className="group flex items-start gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-maroon/10 text-maroon transition-colors max-md:bg-white/15 max-md:text-white group-hover:bg-maroon group-hover:text-white">
        <Icon className="h-4 w-4" />
      </span>
      <span className="pt-1.5">{children}</span>
    </p>
  );
}

/** Card networks and UPI accepted through Razorpay, drawn as simple badges. */
function PaymentBadges() {
  const base = "flex h-9 min-w-[3.75rem] items-center justify-center rounded-md px-2.5 text-[13px] font-extrabold italic tracking-tight shadow-sm";
  const badge = `${base} bg-white`;
  return (
    <>
      <span className={`${badge} text-[#3b3b3b]`}>UPI<span className="ml-0.5 text-[#f47920]">›</span></span>
      <span className={`${badge} text-[#1a1f71]`}>VISA</span>
      <span className={badge} aria-label="Mastercard">
        <span className="h-5 w-5 rounded-full bg-[#eb001b]" />
        <span className="-ml-2 h-5 w-5 rounded-full bg-[#f79e1b] mix-blend-multiply" />
      </span>
      <span className={`${badge} text-[#1b3f8b]`}>RuPay<span className="ml-0.5 text-[#f47920]">›</span></span>
      <span className={`${base} bg-[#1f72cd] not-italic text-white`}>AMEX</span>
    </>
  );
}

/** CMS pages can repeat a built-in link ("Contact us"); keep the first of each label. */
function dedupe(links: { label: string; href: string }[]) {
  const seen = new Set<string>();
  return links.filter((l) => {
    const key = l.label.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function FooterCol({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div className="lg:border-l lg:border-olive/10 lg:px-8 xl:px-10">
      <FooterHeading>{title}</FooterHeading>
      <ul className="space-y-3 text-[15px]">
        {links.map((l) => (
          <li key={l.href + l.label}>
            <Link href={l.href} className="group inline-flex items-center gap-2.5 text-ink/80 transition-colors hover:text-maroon max-md:font-semibold max-md:text-white max-md:hover:text-[#f7a8c8]">
              <ChevronRight className="h-4 w-4 text-olive/50 transition-transform max-md:text-white/70 duration-200 group-hover:translate-x-1 group-hover:text-maroon" />
              <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-left-bottom bg-no-repeat transition-[background-size] duration-300 group-hover:bg-[length:100%_1px]">{l.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
