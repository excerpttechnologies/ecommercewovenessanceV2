import Image from "next/image";
import Link from "next/link";
import { Award, Truck, ShieldCheck, RotateCcw, Star, Mail, MessageCircle, Phone, CircleHelp } from "lucide-react";
import type { BarcodeProduct, CategoryNode, ProductCard } from "@/domain/types";
import type { BannerDoc, TestimonialDoc } from "@/models/web/content.models";
import type { SiteSettings } from "@/repositories/web/site.repository";
import { Logo } from "@/components/Logo";
import { SectionHeading } from "@/components/ui/section-heading";
import { ProductRail } from "@/components/product/product-rail";
import { BarcodeProductGrid } from "@/components/product/barcode-product-grid";
import { ContactForm } from "@/components/account/contact-form";
import { NewsletterForm } from "./newsletter-form";
import { isRemoteImageSource } from "@/lib/utils";

export const Wrap = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <section className={`mx-auto max-w-site px-4 sm:px-6 ${className}`}>{children}</section>
);

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = { award: Award, truck: Truck, shield: ShieldCheck, return: RotateCcw, star: Star };

export function TrustBadges({ badges }: { badges: { title?: string | null; text?: string | null; icon?: string | null }[] }) {
  if (!badges.length) return null;
  return (
    <div className="border-y border-line bg-white/50">
      <Wrap className="grid grid-cols-2 gap-6 py-6 md:grid-cols-4">
        {badges.map((b, i) => {
          const Icon = ICONS[b.icon ?? ""] ?? Award;
          return (
            <div key={i} className="flex items-center gap-3">
              <Icon className="h-6 w-6 shrink-0 text-gold" />
              <div>
                <p className="text-sm font-medium text-olive">{b.title}</p>
                <p className="text-xs text-muted">{b.text}</p>
              </div>
            </div>
          );
        })}
      </Wrap>
    </div>
  );
}

export function CategoryTiles({ categories, title, subtitle }: { categories: CategoryNode[]; title?: string | null; subtitle?: string | null }) {
  return (
    <Wrap className="py-14">
      <SectionHeading title={title ?? "Shop by category"} subtitle={subtitle ?? undefined} align="center" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {categories.map((c, i) => (
          <Link key={c.id} href={`/collections/${c.slug}`} className={`group relative block overflow-hidden rounded-sm bg-line ${i === 0 ? "md:row-span-2" : ""}`}>
            <div className={`relative ${i === 0 ? "aspect-[3/4] md:aspect-[3/5]" : "aspect-[3/4] md:aspect-[4/3]"}`}>
              {c.image && <Image src={c.image} alt={c.name} fill unoptimized={isRemoteImageSource(c.image)} sizes="(min-width: 768px) 25vw, 50vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />}
            </div>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/70 to-transparent p-4">
              <p className="font-heading text-2xl text-ivory">{c.name}</p>
              {c.children.length > 0 && <p className="text-[11px] uppercase tracking-widest text-ivory/80">{c.children.slice(0, 3).map((x) => x.name).join(" · ")}</p>}
            </div>
          </Link>
        ))}
      </div>
    </Wrap>
  );
}

export function FeaturedCollections({ collections, title, subtitle }: {
  collections: { id: string; slug: string; name: string; description?: string | null; image?: string | null }[];
  title?: string | null;
  subtitle?: string | null;
}) {
  if (!collections.length) return null;
  return (
    <Wrap className="py-14">
      <SectionHeading title={title ?? "Curated collections"} subtitle={subtitle ?? undefined} href="/collections" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {collections.map((c) => (
          <Link key={c.id} href={`/collections/${c.slug}`} className="group relative block overflow-hidden rounded-sm bg-line">
            <div className="relative aspect-[3/4]">
              {c.image && <Image src={c.image} alt={c.name} fill unoptimized={isRemoteImageSource(c.image)} sizes="(min-width: 1280px) 20vw, (min-width: 768px) 33vw, 50vw" className="object-cover object-top transition-transform duration-700 group-hover:scale-105" />}
            </div>
            <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-ink/70 via-ink/10 to-transparent p-5 text-ivory">
              <p className="font-heading text-3xl">{c.name}</p>
              {c.description && <p className="mt-1 line-clamp-1 max-w-md text-xs text-ivory/85">{c.description}</p>}
              <span className="mt-3 w-fit border-b border-gold text-[11px] uppercase tracking-[0.2em] text-gold">Explore</span>
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
    <Wrap className="py-14">
      <SectionHeading title={title ?? "Products"} subtitle={subtitle ?? undefined} href={href} />
      <ProductRail items={items} />
    </Wrap>
  );
}

/** ERP products of one storefront category, with the same cards as its collection page. */
export function ErpProductSection({ title, subtitle, collectionSlug, items }: { title: string; subtitle?: string | null; collectionSlug: string; items: BarcodeProduct[] }) {
  if (!items.length) return null;
  return (
    <Wrap className="py-14">
      <SectionHeading title={title} subtitle={subtitle ?? undefined} href={`/collections/${collectionSlug}`} />
      <BarcodeProductGrid items={items} collectionSlug={collectionSlug} />
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
          <article key={item.id} className="overflow-hidden rounded-sm border border-line bg-white">
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
              {item.printDescription && <p className="text-sm text-ink">{item.printDescription}</p>}
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

export function ChipStrip({ title, subtitle, items }: { title?: string | null; subtitle?: string | null; items: { label: string; href: string; image?: string }[] }) {
  if (!items.length) return null;
  return (
    <Wrap className="py-14">
      <SectionHeading title={title ?? ""} subtitle={subtitle ?? undefined} align="center" />
      <div className="flex flex-wrap justify-center gap-3">
        {items.map((it) => (
          <Link key={it.href} href={it.href} className="group flex items-center gap-3 rounded-full border border-line bg-white/60 py-2 pl-2 pr-5 text-sm text-olive transition-colors hover:border-gold hover:bg-gold/5">
            <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full">{it.image && <Image src={it.image} alt="" fill unoptimized={isRemoteImageSource(it.image)} sizes="36px" className="object-cover" />}</span>
            {it.label}
          </Link>
        ))}
      </div>
    </Wrap>
  );
}

export function LifestyleBanners({ banners }: { banners: BannerDoc[] }) {
  if (!banners.length) return null;
  return (
    <Wrap className="py-8">
      <div className={`grid gap-4 ${banners.length > 1 ? "md:grid-cols-2" : ""}`}>
        {banners.map((b) => (
          <Link key={String(b._id)} href={b.ctaHref ?? "#"} className="group relative block overflow-hidden rounded-sm bg-line">
            <div className="relative aspect-[4/3] md:aspect-[16/9]">
              {b.image?.desktop && <Image src={b.image.desktop} alt={b.image.alt ?? b.title ?? ""} fill unoptimized={isRemoteImageSource(b.image.desktop)} sizes="(min-width: 768px) 50vw, 100vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />}
            </div>
            <div className="absolute inset-0 flex flex-col justify-center bg-ink/20 p-8 text-ivory">
              {b.subtitle && <p className="text-[11px] uppercase tracking-[0.3em] text-gold">{b.subtitle}</p>}
              {b.title && <p className="mt-1 font-heading text-3xl md:text-4xl">{b.title}</p>}
              {b.ctaLabel && <span className="mt-4 w-fit border-b border-ivory text-[11px] uppercase tracking-[0.2em]">{b.ctaLabel}</span>}
            </div>
          </Link>
        ))}
      </div>
    </Wrap>
  );
}

export function Testimonials({ items, title }: { items: TestimonialDoc[]; title?: string | null }) {
  if (!items.length) return null;
  return (
    <div className="bg-olive text-ivory">
      <Wrap className="py-16">
        <h2 className="mb-10 text-center font-heading text-3xl text-ivory sm:text-4xl">{title ?? "From our customers"}</h2>
        <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:px-0">
          {items.map((t) => (
            <figure key={String(t._id)} className="w-[80vw] shrink-0 snap-start rounded-sm border border-ivory/15 p-6 md:w-auto">
              <div className="mb-3 flex gap-0.5 text-gold">{Array.from({ length: t.rating ?? 5 }).map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-gold" />)}</div>
              <blockquote className="font-heading text-lg italic leading-relaxed">“{t.text}”</blockquote>
              <figcaption className="mt-4 text-[11px] uppercase tracking-widest text-ivory/70">{t.name}{t.city ? ` · ${t.city}` : ""}</figcaption>
            </figure>
          ))}
        </div>
      </Wrap>
    </div>
  );
}

export function InstagramStrip({ handle, images }: { handle?: string | null; images: string[] }) {
  if (!images.length) return null;
  return (
    <Wrap className="py-14">
      <SectionHeading title="On Instagram" subtitle={handle ? `Follow ${handle}` : undefined} align="center" />
      <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
        {images.map((src, i) => (
          <div key={i} className="relative aspect-square overflow-hidden rounded-sm bg-line"><Image src={src} alt="" fill unoptimized={isRemoteImageSource(src)} sizes="16vw" className="object-cover" /></div>
        ))}
      </div>
    </Wrap>
  );
}

export function Newsletter({ title, subtitle }: { title?: string | null; subtitle?: string | null }) {
  return (
    <div className="border-y border-line bg-white/50">
      <Wrap className="py-14 text-center">
        <h2 className="text-3xl">{title ?? "Be the first to see new weaves"}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">{subtitle ?? "Fresh arrivals, festive edits and early access — a few times a month, never more."}</p>
        <div className="mt-6"><NewsletterForm /></div>
      </Wrap>
    </div>
  );
}

export function SupportPanel({ title, subtitle, contact, settings, whatsappNumber }: { title?: string | null; subtitle?: string | null; contact?: SiteSettings["contact"]; settings?: Pick<SiteSettings, "storeName" | "legalName">; whatsappNumber?: string | null }) {
  const contactEmail = contact?.email || "hello@wovenessence.in";
  const contactHours = contact?.hours || "Mon–Sat, 10:30 am – 8:30 pm";
  const contactLinks = [
    contact?.phone ? { href: `tel:${contact.phone}`, label: contact.phone, Icon: Phone } : null,
    { href: `mailto:${contactEmail}`, label: contactEmail, Icon: Mail },
    whatsappNumber ? { href: `https://wa.me/${whatsappNumber}`, label: "Chat on WhatsApp", Icon: MessageCircle } : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  return (
    <section id="support" className="bg-ivory text-ink">
      <Wrap className="grid gap-8 py-14 md:grid-cols-[0.9fr_1.1fr] md:items-center md:gap-12">
        <div>
          {settings && <Logo settings={settings} height={44} className="mb-6 inline-block" />}
          <p className="text-[11px] uppercase tracking-[0.2em] text-gold">Here to help</p>
          <h2 className="mt-3 font-heading text-4xl text-olive">{title ?? "How can we help?"}</h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">{subtitle ?? "Questions about a saree, an order, or something not working? Send us a note and our team will get back to you."}</p>
          <p className="mt-5 text-xs text-muted">{contactHours}</p>
          {contactLinks.length > 0 && (
            <div className="mt-5 flex flex-col items-start gap-3">
              {contactLinks.map(({ href, label, Icon }) => <a key={href} href={href} target={href.startsWith("https:") ? "_blank" : undefined} rel={href.startsWith("https:") ? "noreferrer" : undefined} className="inline-flex items-center gap-2 text-sm text-olive hover:text-maroon"><Icon className="h-4 w-4" />{label}</a>)}
            </div>
          )}
        </div>
        <div className="text-ink"><ContactForm type="support" /></div>
      </Wrap>
    </section>
  );
}

export function HelpJump() {
  return (
    <a href="#support" className="fixed bottom-4 right-20 z-40 inline-flex h-12 items-center gap-2 rounded-full bg-maroon px-4 text-sm font-medium text-white shadow-lg transition-colors hover:bg-ink" aria-label="Jump to help and support form">
      <CircleHelp className="h-5 w-5" />
      <span>Need help?</span>
    </a>
  );
}
