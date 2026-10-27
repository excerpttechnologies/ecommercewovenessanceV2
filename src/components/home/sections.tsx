import Image from "next/image";
import Link from "next/link";
import { Award, Truck, ShieldCheck, RotateCcw, Star, Mail, Phone, CircleHelp, ArrowRight, ChevronRight, Clock, MapPin } from "lucide-react";
import type { BarcodeProduct, CategoryNode, ProductCard } from "@/domain/types";
import type { BannerDoc, TestimonialDoc } from "@/models/web/content.models";
import type { SiteSettings } from "@/repositories/web/site.repository";
import { AccentTitle, OrnateHeading, SectionHeading } from "@/components/ui/section-heading";
import { InstagramCarousel, TestimonialCarousel, type TestimonialCard } from "./carousels";
import { ProductRail } from "@/components/product/product-rail";
import { BarcodeProductGrid } from "@/components/product/barcode-product-grid";
import { ContactForm } from "@/components/account/contact-form";
import { WhatsAppIcon } from "@/components/layout/whatsapp-float";
import { NewsletterForm } from "./newsletter-form";
import { CategoryCircles, type CategoryCircle } from "./category-circles";
import { ChipScroller } from "./chip-scroller";
import { LeafSpray, Lotus, LotusDivider } from "@/components/ui/ornaments";
import { cn, isRemoteImageSource } from "@/lib/utils";
import { businessInfo, e164 } from "@/lib/business";
import { CATEGORY_SEO } from "@/lib/seo";
import { ERP_CATEGORY_TITLES } from "@/lib/barcode-image-series";

export const Wrap = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <section data-reveal className={`mx-auto max-w-site px-4 sm:px-6 ${className}`}>{children}</section>
);

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = { award: Award, truck: Truck, shield: ShieldCheck, return: RotateCcw, star: Star };

export function TrustBadges({ badges }: { badges: { title?: string | null; text?: string | null; icon?: string | null }[] }) {
  if (!badges.length) return null;
  return (
    <Wrap className="pt-10">
      <div className="grid grid-cols-1 gap-4 rounded-xl border border-line bg-white p-5 shadow-card min-[480px]:grid-cols-2 md:grid-cols-4 md:p-6">
        {badges.map((b, i) => {
          const Icon = ICONS[b.icon ?? ""] ?? Award;
          return (
            <div key={i} className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-maroon/10 text-maroon">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-olive">{b.title}</p>
                <p className="text-xs text-muted">{b.text}</p>
              </div>
            </div>
          );
        })}
      </div>
    </Wrap>
  );
}

export function CategoryTiles({ categories, title, subtitle }: { categories: (CategoryNode | CategoryCircle)[]; title?: string | null; subtitle?: string | null }) {
  const heading = !title || title.trim().toLowerCase() === "shop by category" ? "Shop by Category" : title;
  return (
    <section data-reveal className="relative overflow-hidden bg-[#fbf7f2]">
      <LeafSpray className="absolute -left-6 top-6 hidden h-64 w-56 text-brass/25 md:block" />
      <LeafSpray className="absolute -right-6 top-6 hidden h-64 w-56 -scale-x-100 text-brass/25 md:block" />
      <Wrap className="relative pb-5 pt-10 sm:pb-6 sm:pt-12">
        <div className="mb-8 text-center">
          <p className="font-display text-xl font-medium uppercase tracking-wide text-olive sm:text-[32px] sm:leading-tight">{subtitle ?? "Celebrate every occasion in style"}</p>
          <LotusDivider className="mt-3" />
          <h2 className="-mt-1 font-script text-[34px] font-bold text-maroon sm:text-5xl">{heading}</h2>
        </div>
        <CategoryCircles items={categories.map((c) => ("href" in c ? c : { id: c.id, name: c.name, href: `/collections/${c.slug}`, image: c.image }))} />
        <LotusDivider className="mt-6" />
      </Wrap>
    </section>
  );
}

/** Occasion-style mosaic: a tall feature tile on the left, the rest in a 2×2 grid beside it. */
export function FeaturedCollections({ collections, title, subtitle }: {
  collections: { id: string; slug: string; name: string; description?: string | null; image?: string | null }[];
  title?: string | null;
  subtitle?: string | null;
}) {
  if (!collections.length) return null;
  const mosaic = collections.length >= 3;
  return (
    <Wrap className="py-12">
      <SectionHeading title={title ?? "Curated collections"} subtitle={subtitle ?? undefined} href="/collections" />
      <div className={cn("grid gap-4", mosaic ? "grid-cols-2 md:grid-cols-[1.25fr_1fr_1fr] md:grid-rows-2" : "grid-cols-2")}>
        {collections.map((c, i) => (
          <Link
            key={c.id}
            href={`/collections/${c.slug}`}
            className={cn("group relative block min-h-[180px] overflow-hidden rounded-xl bg-line", mosaic && i === 0 && "col-span-2 aspect-[4/3] md:col-span-1 md:row-span-2 md:aspect-auto", mosaic && i > 0 && "aspect-[4/3] md:aspect-[16/10]")}
          >
            {c.image && <Image src={c.image} alt={c.name} fill unoptimized={isRemoteImageSource(c.image)} sizes={i === 0 ? "(min-width: 768px) 40vw, 100vw" : "(min-width: 768px) 30vw, 50vw"} className="object-cover object-top transition-transform duration-700 group-hover:scale-105" />}
            <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/75 via-black/15 to-transparent p-4 text-white sm:p-5">
              <p className={cn("font-heading font-semibold leading-tight", i === 0 && mosaic ? "text-xl sm:text-2xl" : "text-base sm:text-lg")}>{c.name}</p>
              {c.description && <p className="mt-0.5 line-clamp-1 text-xs text-white/85 sm:text-sm">{c.description}</p>}
            </div>
          </Link>
        ))}
      </div>
    </Wrap>
  );
}

export function ProductSection({ title, subtitle, href, items }: { title?: string | null; subtitle?: string | null; href?: string; items: ProductCard[] }) {
  if (!items.length) return null;
  return (
    <Wrap className="py-12">
      <SectionHeading title={title ?? "Products"} subtitle={subtitle ?? undefined} href={href} />
      <ProductRail items={items} />
    </Wrap>
  );
}

/** ERP products of one storefront category, with the same cards as its collection page. */
export function ErpProductSection({ title, subtitle, collectionSlug, items }: { title: string; subtitle?: string | null; collectionSlug: string; items: BarcodeProduct[] }) {
  if (!items.length) return null;
  return (
    <Wrap className="relative py-10">
      <div className="relative mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-4xl font-semibold tracking-tight text-olive sm:text-5xl">{title}</h2>
          <span aria-hidden className="mt-2 block h-1 w-16 rounded-full bg-gradient-to-r from-maroon to-maroon/30" />
          {subtitle && <p className="mt-3 max-w-xl text-sm text-muted">{subtitle}</p>}
        </div>
        <Link href={`/collections/${collectionSlug}`} className="group inline-flex shrink-0 items-center gap-2 text-base font-semibold text-maroon hover:text-gold">
          View All <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
      <div className="relative"><BarcodeProductGrid items={items} collectionSlug={collectionSlug} wide /></div>
    </Wrap>
  );
}

export function ErpImageGallery({ title, items }: { title: string; items: BarcodeProduct[] }) {
  if (!items.length) return null;
  return (
    <Wrap className="py-10">
      <SectionHeading title={title} align="center" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => (
          <article key={item.id} className="overflow-hidden rounded-xl border border-line bg-white shadow-card">
            <div className="relative aspect-[3/4] bg-line">
              {item.image && (
                <Image
                  src={item.image}
                  alt={getErpProductDescription(item)}
                  fill
                  unoptimized
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                  className="object-cover"
                />
              )}
            </div>
            <div className="space-y-1 p-3">
              {item.printDescription && <p className="text-sm font-medium text-ink">{item.printDescription}</p>}
            </div>
          </article>
        ))}
      </div>
    </Wrap>
  );
}

function getErpProductDescription(item: BarcodeProduct): string {
  return item.printDescription?.trim() ?? "";
}

/** Soft pink line-art backdrop shared by the chip, review and Instagram sections. */
function PetalBackdrop({ children, className, band = true }: { children: React.ReactNode; className?: string; band?: boolean }) {
  return (
    <section className={cn("relative overflow-hidden", className)}>
      <LeafSpray className="absolute -left-8 top-6 hidden h-60 w-52 text-maroon/[0.14] md:block" />
      <LeafSpray className="absolute -right-8 top-2 hidden h-60 w-52 -scale-x-100 text-maroon/[0.14] md:block" />
      {band && <div aria-hidden className="pointer-events-none absolute inset-x-0 top-1/3 h-40 bg-[radial-gradient(ellipse_at_0%_50%,rgba(219,26,114,0.05),transparent_45%),radial-gradient(ellipse_at_100%_50%,rgba(219,26,114,0.05),transparent_45%)]" />}
      {children}
    </section>
  );
}

/**
 * "Shop by occasion" / "Shop by fabric" pills. Each pill leads with a fabric photo when one is given,
 * otherwise a pink lotus badge.
 */
export function ChipStrip({ title, subtitle, items }: { title?: string | null; subtitle?: string | null; items: { label: string; href: string; image?: string }[] }) {
  if (!items.length) return null;
  return (
    <PetalBackdrop>
      <Wrap className="relative py-6">
        <OrnateHeading title={title ?? ""} subtitle={subtitle ?? undefined} className="mb-4" />
        <ChipScroller items={items} />
      </Wrap>
    </PetalBackdrop>
  );
}

export function LifestyleBanners({ banners }: { banners: BannerDoc[] }) {
  if (!banners.length) return null;
  return (
    <Wrap className="py-8">
      <div className={`grid gap-6 ${banners.length > 1 ? "md:grid-cols-2" : ""}`}>
        {banners.map((b) => (
          <Link key={String(b._id)} href={b.ctaHref ?? "#"} className="group relative block overflow-hidden rounded-xl bg-line shadow-[0_18px_40px_-26px_rgba(122,18,56,0.6)]">
            <div className="relative aspect-[4/3] md:aspect-[16/9] lg:aspect-[16/7]">
              {b.image?.desktop && <Image src={b.image.desktop} alt={b.image.alt ?? b.title ?? ""} fill unoptimized={isRemoteImageSource(b.image.desktop)} sizes="(min-width: 768px) 50vw, 100vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />}
            </div>
            <div className="absolute inset-0 flex flex-col justify-center bg-gradient-to-r from-black/70 via-black/30 to-transparent p-7 text-white sm:px-10 sm:py-8">
              {b.subtitle && <p className="text-[11px] font-semibold uppercase tracking-wide text-white/90 sm:text-xs">{b.subtitle}</p>}
              {b.title && <p className="mt-2 font-display text-[26px] font-medium leading-tight lg:text-[32px]">{b.title}</p>}
              <div className="mt-3 flex w-64 max-w-full items-center gap-3 text-[#e8c27a]" aria-hidden>
                <span className="h-px flex-1 bg-current opacity-60" />
                <Lotus className="h-5 w-7" />
                <span className="h-px flex-1 bg-current opacity-60" />
              </div>
              {b.ctaLabel && (
                <span className="mt-4 inline-flex h-10 w-fit items-center gap-2 rounded-full bg-maroon px-5 text-[13px] font-semibold shadow-[0_10px_24px_-10px_rgba(219,26,114,0.9)] transition-all group-hover:bg-gold">
                  {b.ctaLabel} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </Wrap>
  );
}

export function Testimonials({ items, title, subtitle }: { items: TestimonialDoc[]; title?: string | null; subtitle?: string | null }) {
  if (!items.length) return null;
  const cards: TestimonialCard[] = items.map((t) => ({ id: String(t._id), name: t.name, city: t.city, rating: t.rating, text: t.text, image: t.image }));
  return (
    <PetalBackdrop className="bg-white/60" band={false}>
      <Wrap className="relative py-12">
        <OrnateHeading title={title ?? "From our customers"} subtitle={subtitle ?? "Real stories. Timeless love. From saree lovers across the world."} />
        <TestimonialCarousel items={cards} />
      </Wrap>
    </PetalBackdrop>
  );
}

export function InstagramStrip({ handle, href, images }: { handle?: string | null; href?: string; images: string[] }) {
  if (!images.length) return null;
  return (
    <Wrap className="pb-6 pt-12">
      <OrnateHeading
        title="On Instagram"
        subtitle={handle ? <>Follow <span className="font-medium text-ink">{handle}</span> for daily weaves, stories and more</> : undefined}
      />
      <InstagramCarousel images={images} href={href ?? "https://www.instagram.com/"} />
    </Wrap>
  );
}

export function Newsletter({ title, subtitle }: { title?: string | null; subtitle?: string | null }) {
  const heading = title ?? "Be the first to see new weaves";
  // "…see new weaves": the last two words take the light pink accent.
  const words = heading.trim().split(/\s+/);
  const accent = words.length > 3 ? words.splice(-2).join(" ") : "";
  return (
    <Wrap className="py-8">
      <div className="relative overflow-hidden rounded-2xl bg-[linear-gradient(90deg,#c41a5c_0%,#b21551_45%,#a01046_100%)] px-6 py-8 text-center text-white shadow-[0_24px_50px_-28px_rgba(160,16,70,0.9)] sm:px-12">
        <div aria-hidden className="absolute inset-y-0 left-0 hidden w-[34%] bg-[url('/newsletter/lotus.webp')] bg-cover bg-left md:block" />
        <div aria-hidden className="absolute inset-y-0 right-0 hidden w-[36%] bg-[url('/newsletter/silk.webp')] bg-cover bg-right md:block" />
        <div className="relative">
          <p className="flex items-center justify-center gap-3 text-[11px] font-medium uppercase tracking-[0.28em] text-white/90">
            <span className="h-px w-10 bg-white/50" /> Stay connected <span className="h-px w-10 bg-white/50" />
          </p>
          <h2 className="mt-2 font-display text-[28px] font-medium leading-tight text-white sm:text-4xl">
            {words.join(" ")} {accent && <span className="text-[#f7a8c8]">{accent}</span>}
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-white/90">{subtitle ?? "Fresh arrivals, festive edits and early access — a few times a month, never more."}</p>
          <div className="mx-auto mt-5 max-w-lg"><NewsletterForm variant="pill" /></div>
        </div>
      </div>
    </Wrap>
  );
}

const SEO_THUMBS: Partial<Record<keyof typeof CATEGORY_SEO, string>> = {
  sarees: "/curated/sarees.webp",
  fabrics: "/curated/fabrics.webp",
  "plain-fabrics": "/curated/plain-fabrics.webp",
  dupatta: "/curated/dupatta.webp",
  simple: "/curated/simple.webp",
};

function InfoIcon({ Icon }: { Icon: React.ComponentType<{ className?: string }> }) {
  return <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-maroon/10 text-maroon"><Icon className="h-4 w-4" /></span>;
}

/**
 * Written introduction to the shop for shoppers and search engines: who we are, what each collection
 * holds (with links), and how to visit the store.
 */
export function HomeSeoContent({ settings }: { settings: SiteSettings }) {
  const info = businessInfo(settings);
  const groups = Object.entries(CATEGORY_SEO) as [keyof typeof CATEGORY_SEO, (typeof CATEGORY_SEO)[keyof typeof CATEGORY_SEO]][];
  const freeAbove = settings.commerce?.freeShippingAbove;
  return (
    <Wrap className="py-8">
      <div className="relative grid gap-8 overflow-hidden rounded-2xl bg-[#fcf3f3] bg-[url('/blush-silk-bg.webp')] bg-cover bg-right p-5 shadow-[0_24px_50px_-34px_rgba(122,18,56,0.45)] ring-1 ring-black/[0.04] sm:p-8 lg:grid-cols-[1.1fr_1fr] lg:gap-10">
        <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-[#fdf6f5]/95 via-[#fdf6f5]/80 to-[#fdf6f5]/40" />
        <div className="relative min-w-0">
          <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-maroon">
            About Woven Essence <span className="h-px w-12 bg-maroon/50" />
          </p>
          <h2 className="mt-2 font-display text-[26px] font-medium leading-tight sm:text-[32px]">
            Handloom sarees, fabrics &amp; dupattas from <span className="text-maroon">Temple Fabrics, Bengaluru</span>
          </h2>
          <div className="mt-3 space-y-2.5 text-sm leading-relaxed text-ink/80">
            <p>
              Woven Essence is the online home of Temple Fabrics in Jayanagar, Bengaluru. We bring the sarees and fabrics from
              our store counters to you – rich Kanchipuram and Banarasi silks for weddings, Patola and handloom weaves for
              festivals, and easy cotton and kasavu sarees for every day.
            </p>
            <p>
              Every piece is listed with its own barcode and price straight from our store stock, so you can see exactly
              which piece you are choosing. Browse by fabric, weave, craft, occasion and colour, add favourites to your wishlist,
              and check out securely{freeAbove ? <> – with free shipping on orders above ₹{freeAbove.toLocaleString("en-IN")}</> : null}.
            </p>
          </div>
          <div className="mt-5 space-y-2.5 text-[13px] text-ink/80">
            <div className="grid gap-2.5 rounded-xl bg-white/80 p-3 ring-1 ring-black/[0.05] backdrop-blur-sm sm:grid-cols-2 sm:divide-x sm:divide-line">
              <p className="flex items-center gap-3"><InfoIcon Icon={Clock} /><span><b className="block font-semibold text-olive">Store hours</b>{info.hours}</span></p>
              <p className="flex items-center gap-3 sm:pl-3"><InfoIcon Icon={Phone} /><a href={`tel:${e164(info.phone)}`} className="font-semibold text-olive hover:text-maroon">{info.phone}</a></p>
            </div>
            <p className="flex items-center gap-3 rounded-xl bg-white/80 p-3 ring-1 ring-black/[0.05] backdrop-blur-sm"><InfoIcon Icon={MapPin} /><span><b className="block font-semibold text-olive">Visit us</b>{info.address}</span></p>
          </div>
        </div>
        <nav aria-label="Shop by collection" className="relative min-w-0">
          <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-maroon">
            Shop our collections <span className="h-px w-12 bg-maroon/50" />
          </p>
          <ul className="mt-3 space-y-2">
            {groups.map(([slug, copy]) => (
              <li key={slug}>
                <Link href={`/collections/${slug}`} className="group flex items-center gap-3 rounded-xl bg-white/90 p-2 pr-3 shadow-[0_8px_20px_-16px_rgba(122,18,56,0.5)] ring-1 ring-black/[0.04] backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:ring-maroon/30">
                  {SEO_THUMBS[slug] && (
                    <span className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-line">
                      <Image src={SEO_THUMBS[slug]!} alt="" fill sizes="64px" className="object-cover transition-transform duration-500 group-hover:scale-110" />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-base font-medium text-olive transition-colors group-hover:text-maroon">{ERP_CATEGORY_TITLES[slug]}</span>
                    <span className="line-clamp-2 block text-xs leading-snug text-muted">{copy.intro}</span>
                  </span>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-maroon/10 text-maroon transition-colors group-hover:bg-maroon group-hover:text-white"><ArrowRight className="h-4 w-4" /></span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </Wrap>
  );
}

export function SupportPanel({ title, subtitle, contact, whatsappNumber }:{ title?: string | null; subtitle?: string | null; contact?: SiteSettings["contact"]; settings?: Pick<SiteSettings, "storeName" | "legalName">; whatsappNumber?: string | null }) {
  const contactEmail = contact?.email || "hello@wovenessence.in";
  const contactHours = contact?.hours || "Mon–Sat, 10:30 am – 8:30 pm";
  const contactLinks = [
    contact?.phone ? { href: `tel:${contact.phone}`, label: contact.phone, hint: "Call us for quick support", Icon: Phone } : null,
    { href: `mailto:${contactEmail}`, label: contactEmail, hint: "Drop us an email anytime", Icon: Mail },
    whatsappNumber ? { href: `https://wa.me/${whatsappNumber}`, label: "Chat on WhatsApp", hint: "Get instant help", Icon: WhatsAppIcon } : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  return (
    <section id="support" className="scroll-mt-40 text-ink">
      <Wrap className="py-8">
        <div className="grid overflow-hidden rounded-2xl bg-white shadow-[0_24px_50px_-34px_rgba(122,18,56,0.45)] ring-1 ring-black/[0.04] md:grid-cols-[1fr_1fr]">
          {/* Info side: blush silk photo, soft white wash behind the text */}
          <div className="relative overflow-hidden bg-[#fcf3f3] bg-[url('/blush-silk-bg.webp')] bg-cover bg-right p-5 sm:p-7">
            <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-[#fdf6f5]/95 via-[#fdf6f5]/75 to-transparent" />
            <div className="relative max-w-sm">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-maroon">
                <span className="h-px w-6 bg-maroon/50" /> Here to help
              </p>
              <h2 className="mt-2 font-display text-[28px] font-medium leading-tight sm:text-[32px]"><AccentTitle title={title ?? "How can we help?"} /></h2>
              <p className="mt-2 text-[13px] leading-relaxed text-ink/75">{subtitle ?? "Questions about a saree, an order, or something not working? Send us a note and our team will get back to you."}</p>
              <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-xs text-ink/80 ring-1 ring-maroon/10 backdrop-blur-sm">
                <Clock className="h-3.5 w-3.5 text-maroon" /> {contactHours}
              </p>
              {contactLinks.length > 0 && (
                <div className="mt-4 flex flex-col gap-2">
                  {contactLinks.map(({ href, label, hint, Icon }) => (
                    <a
                      key={href}
                      href={href}
                      target={href.startsWith("https:") ? "_blank" : undefined}
                      rel={href.startsWith("https:") ? "noreferrer" : undefined}
                      className="group flex items-center gap-3 rounded-xl bg-white/90 p-2 pr-3 shadow-[0_8px_20px_-16px_rgba(122,18,56,0.5)] ring-1 ring-black/[0.04] backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:ring-maroon/30"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#f07aa5] to-maroon text-white"><Icon className="h-[18px] w-[18px]" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-olive">{label}</span>
                        <span className="block text-[11px] text-muted">{hint}</span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-maroon" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
          {/* Form side */}
          <div className="p-5 sm:p-7">
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-maroon">
              <span className="h-px w-6 bg-maroon/50" /> Send us a message
            </p>
            <p className="mt-2 font-display text-[26px] font-medium leading-tight text-olive sm:text-[30px]"><AccentTitle title="We'd love to hear from you" /></p>
            <p className="mb-4 mt-1 text-[13px] text-muted">Leave a mobile number or email so we can reply.</p>
            <ContactForm type="support" modern />
          </div>
        </div>
      </Wrap>
    </section>
  );
}

export function HelpJump() {
  return (
    <a href="#support" className="fixed bottom-5 right-20 z-40 inline-flex h-10 items-center gap-1.5 rounded-lg bg-maroon px-3.5 text-[13px] font-semibold text-white shadow-lift transition-colors hover:bg-gold" aria-label="Jump to help and support form">
      <CircleHelp className="h-4 w-4" />
      <span>Need help?</span>
    </a>
  );
}
