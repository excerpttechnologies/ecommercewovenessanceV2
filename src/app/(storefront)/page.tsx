import type { Metadata } from "next";
import type { CategoryNode } from "@/domain/types";
import { getMasterData, getSite } from "@/repositories";
import { collectionToListParams } from "@/repositories/web/site.repository";
import { getSettings } from "@/lib/site-data";
import { ERP_CATEGORY_TITLES, getErpFilterChips, getErpHomeSections, type StorefrontCategoryGroup } from "@/lib/barcode-image-series";
import { HeroCarousel } from "@/components/home/hero-carousel";
import { CuratedCollections } from "@/components/home/curated-collections";
import { CategoryTiles, ChipStrip, ErpProductSection, HelpJump, HomeSeoContent, InstagramStrip, LifestyleBanners, Newsletter, ProductSection, SupportPanel, Testimonials, TrustBadges } from "@/components/home/sections";
import { JsonLd } from "@/components/seo/json-ld";
import { DEFAULT_DESCRIPTION, DEFAULT_KEYWORDS, DEFAULT_OG_IMAGE, DEFAULT_TITLE, OG_DEFAULTS, absoluteUrl, itemListJsonLd, publicImage, storeJsonLd, websiteJsonLd } from "@/lib/seo";

const CURATED_ORDER: StorefrontCategoryGroup[] = ["sarees", "fabrics", "plain-fabrics", "dupatta", "simple"];
const CURATED_COVERS: Partial<Record<StorefrontCategoryGroup, string>> = {
  sarees: "/curated/sarees.webp",
  fabrics: "/curated/fabrics.webp",
  "plain-fabrics": "/curated/plain-fabrics.webp",
  dupatta: "/curated/dupatta.webp",
  simple: "/curated/simple.webp",
};
/** Seeded hero photos that have been retired; banners still pointing at them show the new photo. */
const HERO_IMAGE_REPLACEMENTS: Record<string, { src: string; alt: string }> = {
  "/hero-sarees-courtyard.png": { src: "/hero-golden-heritage.webp", alt: "Woman in a teal and purple Kanchipuram silk saree in a sunlit room" },
};

/** Phone/tablet versions (subject centred, so the narrower crop keeps her in frame), keyed by desktop image. */
const HERO_MOBILE_IMAGES: Record<string, string> = {
  "/hero-pink-silk.png": "/hero-green-silk-mobile.webp",
  "/hero-golden-heritage.webp": "/hero-teal-silk-mobile.webp",
};

const DEFAULT_INSTAGRAM ="https://www.instagram.com/templefabrics";
const INSTAGRAM_FALLBACK = [1, 2, 3, 4, 5, 6].map((n) => `/instagram/tile-${n}.webp`);

/** "https://www.instagram.com/templefabrics?igsh=…" → "@templefabrics" (query string and trailing slash ignored). */
function instagramHandle(url: string): string | undefined {
  try {
    const name = new URL(url).pathname.split("/").filter(Boolean)[0];
    return name ? `@${name}` : undefined;
  } catch {
    return undefined;
  }
}

/** Fabric pill photos for the common weaves; other fabrics get the lotus badge. */
const FABRIC_THUMBS: [RegExp, string][] = [
  [/banaras/i, "/thumbs/fabric-banarasi.webp"],
  [/plain.*chanderi/i, "/thumbs/fabric-plain-chanderi.webp"],
  [/chanderi/i, "/thumbs/fabric-chanderi.webp"],
  [/gadwal/i, "/thumbs/fabric-gadwal.webp"],
  [/cotton|linen|kasavu/i, "/thumbs/fabric-cotton.webp"],
];
const fabricThumb = (label: string) => FABRIC_THUMBS.find(([rx]) => rx.test(label))?.[1];

const CURATED_TAGLINES:Partial<Record<StorefrontCategoryGroup, string>> = { sarees: "Timeless elegance for every occasion" };

export const metadata: Metadata = {
  // `absolute` skips the "| Woven Essence" template: the brand already leads this title.
  title: { absolute: DEFAULT_TITLE },
  description: DEFAULT_DESCRIPTION,
  keywords: DEFAULT_KEYWORDS,
  alternates: { canonical: "/" },
  openGraph: { ...OG_DEFAULTS, url: "/", title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION, images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: "Woven Essence by Temple Fabrics – handloom silk sarees" }] },
};

const fallbackHeroSlides = [
  {
    id: "default-bridal-silk",
    title: "Made for Celebrations",
    subtitle: "Handwoven silk, with details to treasure.",
    ctaLabel: "Explore sarees",
    ctaHref: "/collections/sarees",
    desktop: "/hero-red-silk.png",
    alt: "Bride wearing a red silk saree in a traditional setting",
  },
  {
    id: "default-pink-silk",
    title: "A Tradition to Treasure",
    subtitle: "Beautiful handwoven sarees for every celebration.",
    ctaLabel: "Shop sarees",
    ctaHref: "/collections/sarees",
    desktop: "/hero-pink-silk.png",
    mobile: "/hero-green-silk-mobile.webp",
    alt: "Woman wearing a green silk saree with a red and gold zari border",
  },
  {
    id: "default-gold-silk",
    title: "A Golden Celebration",
    subtitle: "Radiant silk sarees, woven for unforgettable moments.",
    ctaLabel: "Shop sarees",
    ctaHref: "/collections/sarees",
    desktop: "/hero-gold-silk.png",
    alt: "Woman wearing a gold silk saree against a red backdrop",
  },
];

const defaultCategories: CategoryNode[] = [
  { id: "default-sarees", name: "Sarees", slug: "sarees", image: "https://wovenessence.in/images/col-bridal.jpg", sortOrder: 0, isActive: true, children: [] },
  { id: "default-fabrics", name: "Fabrics", slug: "fabrics", image: "https://wovenessence.in/images/col-banarasi.jpg", sortOrder: 1, isActive: true, children: [] },
  { id: "default-plain-fabrics", name: "Plain Fabrics", slug: "plain-fabrics", image: "https://wovenessence.in/images/col-5000.jpg", sortOrder: 2, isActive: true, children: [] },
  { id: "default-dupatta", name: "Dupatta", slug: "dupatta", image: "https://wovenessence.in/images/col-yanai.jpg", sortOrder: 3, isActive: true, children: [] },
];

const categoryImageOverrides: Record<string, string> = {
  sarees: "/categories/sarees.webp",
  fabrics: "/categories/fabrics.webp",
  "plain-fabrics": "/categories/plain-fabrics.webp",
  dupatta: "/categories/dupatta.webp",
};

const extraCategoryCircles = [
  { id: "circle-simple", name: "Simple", href: "/collections/simple", image: "/categories/simple.webp" },
  { id: "circle-new", name: "New Arrivals", href: "/collections/sarees?sort=newest", image: "/categories/new-arrivals.webp" },
  { id: "circle-best", name: "Best Sellers", href: "/collections/sarees", image: "/categories/best-sellers.webp" },
];

/** Home page is assembled from admin-orderable homepage sections. */
export default async function Home() {
  const site = getSite();
  const master = getMasterData();
  const [settings, sections, supportSection, heroBanners] = await Promise.all([
    getSettings(),
    site.homepageSections(),
    site.homepageSection("support"),
    site.banners("hero"),
  ]);
  const homepageSections = (sections.length
    ? sections
    : [
        { key: "categories", title: "Shop by category", subtitle: null, config: {} },
        { key: "featuredCollections", title: "Curated collections", subtitle: null, config: {} },
      ]);
  const homeContact = { ...settings.contact, phone: "099163 11500" };
  const configuredHeroSlides = heroBanners
    .filter((banner) => banner.image?.desktop?.trim())
    .map((banner) => {
      const image = banner.image;
      const replacement = HERO_IMAGE_REPLACEMENTS[image?.desktop ?? ""];
      const desktop = replacement?.src ?? image?.desktop ?? "";
      return {
        id: String(banner._id),
        title: banner.title,
        subtitle: banner.subtitle,
        ctaLabel: banner.ctaLabel,
        ctaHref: banner.ctaHref,
        desktop,
        mobile: HERO_MOBILE_IMAGES[desktop] ?? (replacement ? undefined : image?.mobile),
        alt: replacement?.alt ?? image?.alt,
        align: banner.align,
      };
    });
  const hero = (
    <HeroCarousel
      slides={configuredHeroSlides.length ? configuredHeroSlides : fallbackHeroSlides}
    />
  );
  const rendered = await Promise.all(
    homepageSections.map(async (s) => {
      const cfg = (s.config ?? {}) as Record<string, unknown>;
      const limit = Number(cfg.limit ?? 8);
      switch (s.key) {
        case "hero": {
          return <div key={s.key}>{hero}</div>;
        }
        case "trust":
          return <TrustBadges key={s.key} badges={settings.trustBadges ?? []} />;
        case "categories": {
          // The ERP category pages, never the demo category tree, plus quick links into them.
          const festive = (await getErpFilterChips("occasion").catch(() => [])).find((chip) => /festive/i.test(chip.label));
          return (
            <CategoryTiles
              key={s.key}
              categories={[
                ...defaultCategories.map((category) => ({
                  id: category.id,
                  name: category.name,
                  href: `/collections/${category.slug}`,
                  image: categoryImageOverrides[category.slug] ?? category.image,
                })),
                ...extraCategoryCircles,
                { id: "circle-festive", name: "Festive Collection", href: festive?.href ?? "/collections/sarees", image: "/categories/festive.webp" },
              ]}
              title={s.title}
              subtitle={s.subtitle}
            />
          );
        }
        case "featuredCollections": {
          // ERP categories with published products, with live piece counts.
          // If RetailERP cannot be read, every category is shown with its cover only.
          const erpSections = await getErpHomeSections(limit).catch(() => []);
          const tiles = (erpSections.length ? erpSections.map((section) => section.group) : CURATED_ORDER)
            .filter((group) => CURATED_COVERS[group])
            .sort((a, b) => CURATED_ORDER.indexOf(a) - CURATED_ORDER.indexOf(b))
            .map((group) => {
              const section = erpSections.find((x) => x.group === group);
              return {
                slug: group,
                title: ERP_CATEGORY_TITLES[group],
                tagline: CURATED_TAGLINES[group],
                count: section?.total,
                image: CURATED_COVERS[group]!,
              };
            });
          return <CuratedCollections key={s.key} tiles={tiles} title={s.title} subtitle={s.subtitle} />;
        }
        case "newArrivals": {
          // Newest published ERP products, one row per storefront category.
          // Rounded up to a multiple of five so desktop rows (five cards) come out full.
          const erpSections = await getErpHomeSections(Math.ceil(limit / 5) * 5);
          return (
            <div key={s.key}>
              {erpSections.map((section, index) => (
                <ErpProductSection
                  key={section.group}
                  title={index === 0 && s.title ? `${s.title} · ${section.title}` : section.title}
                  subtitle={index === 0 ? s.subtitle : undefined}
                  collectionSlug={section.group}
                  items={section.items}
                />
              ))}
            </div>
          );
        }
        case "bestSellers": {
          const r = await master.products.list({ sort: "best_selling", limit });
          return <ProductSection key={s.key} title={s.title ?? "Best sellers"} subtitle={s.subtitle} href="/collections/sarees?sort=best_selling" items={r.items} />;
        }
        case "collection": {
          const col = cfg.slug ? await site.collectionBySlug(String(cfg.slug)) : null;
          if (!col) return null;
          const r = await master.products.list({ ...collectionToListParams(col), limit });
          return <ProductSection key={s.key + col.slug} title={s.title ?? col.name} subtitle={s.subtitle ?? col.description} href={`/collections/${col.slug}`} items={r.items} />;
        }
        case "occasions": {
          const chips = await getErpFilterChips("occasion").catch(() => []);
          return <ChipStrip key={s.key} title={s.title ?? "Shop by occasion"} subtitle={s.subtitle} items={chips.slice(0, 8)} />;
        }
        case "fabrics": {
          const chips = await getErpFilterChips("fabric").catch(() => []);
          return <ChipStrip key={s.key} title={s.title ?? "Shop by fabric"} subtitle={s.subtitle} items={chips.slice(0, 12).map((chip) => ({ ...chip, image: fabricThumb(chip.label) }))} />;
        }
        case "lifestyle":
          return <LifestyleBanners key={s.key} banners={await site.banners("lifestyle")} />;
        case "testimonials":
          return <Testimonials key={s.key} items={await site.testimonials()} title={s.title} subtitle={s.subtitle} />;
        case "instagram": {
          const erpImages = (await getErpHomeSections(limit).catch(() => [])).flatMap((section) => section.items.flatMap((item) => (item.image ? [item.image] : []))).slice(0, 12);
          const instagram = settings.social?.instagram || DEFAULT_INSTAGRAM;
          return <InstagramStrip key={s.key} handle={instagramHandle(instagram)} href={instagram} images={erpImages.length >= 6 ? erpImages : INSTAGRAM_FALLBACK} />;
        }
        case "newsletter":
          return <Newsletter key={s.key} title={s.title} subtitle={s.subtitle} />;
        case "support":
          return <SupportPanel key={s.key} title={s.title} subtitle={s.subtitle} contact={homeContact} settings={settings} whatsappNumber={settings.whatsappNumber} />;
        default:
          return null;
      }
    }),
  );

  return (
    <>
      <JsonLd
        nodes={[
          storeJsonLd(settings),
          websiteJsonLd(),
          {
            "@type": "WebPage",
            "@id": `${absoluteUrl("/")}#webpage`,
            url: absoluteUrl("/"),
            name: DEFAULT_TITLE,
            description: settings.seo?.defaultDescription || DEFAULT_DESCRIPTION,
            inLanguage: "en-IN",
            isPartOf: { "@id": `${absoluteUrl("/")}#website` },
            about: { "@id": `${absoluteUrl("/")}#store` },
            primaryImageOfPage: absoluteUrl(DEFAULT_OG_IMAGE),
            mainEntity: {
              ...itemListJsonLd(CURATED_ORDER.map((group) => ({ name: ERP_CATEGORY_TITLES[group], path: `/collections/${group}`, image: publicImage(CURATED_COVERS[group]) }))),
              name: "Shop by collection",
            },
          },
        ]}
      />
      {!homepageSections.some((section) => section.key === "hero") && hero}
      {rendered}
      <HomeSeoContent settings={settings} />
      {!supportSection && <SupportPanel title="How can we help?" contact={homeContact} settings={settings} whatsappNumber={settings.whatsappNumber} />}
      <HelpJump />
    </>
  );
}
