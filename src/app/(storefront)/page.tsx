import type { Metadata } from "next";
import type { CategoryNode } from "@/domain/types";
import { getMasterData, getSite } from "@/repositories";
import { collectionToListParams } from "@/repositories/web/site.repository";
import { getSettings } from "@/lib/site-data";
import { getErpFilterChips, getErpHomeSections } from "@/lib/barcode-image-series";
import { HeroCarousel } from "@/components/home/hero-carousel";
import { CategoryTiles, ChipStrip, ErpProductSection, FeaturedCollections, HelpJump, InstagramStrip, LifestyleBanners, Newsletter, ProductSection, SupportPanel, Testimonials, TrustBadges } from "@/components/home/sections";

export const metadata: Metadata = { title: "Handloom Sarees & Fabrics" };

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
    alt: "Woman wearing a pink and gold silk saree",
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
  sarees: "/category-sarees-cream.webp",
  fabrics: "/category-fabrics-navy.webp",
  "plain-fabrics": "/category-plain-fabrics-blue.webp",
  dupatta: "/category-dupatta-red-green.webp",
};

const defaultFeaturedCollections = [
  {
    id: "default-yanai",
    name: "Yanai Motif Sarees",
    slug: "yanai-motif-sarees",
    description: "Traditional Kanchipuram sarees with the elephant motif.",
    image: "/curated-saree-black-floral.webp",
  },
  {
    id: "default-bridal",
    name: "Bridal Kanchipuram",
    slug: "bridal-kanchipuram",
    description: "Rich Kanchipuram silks for wedding celebrations.",
    image: "/curated-saree-orange-temple.webp",
  },
  {
    id: "default-banarasi",
    name: "Festive Banarasi",
    slug: "festive-banarasi",
    description: "Banarasi weaves in festive colours.",
    image: "/curated-saree-orange-classic.webp",
  },
  {
    id: "default-under-5000",
    name: "Under ₹5,000",
    slug: "under-5000",
    description: "Everyday handlooms under ₹5,000.",
    image: "/curated-saree-rose.webp",
  },
  {
    id: "default-saree-edit",
    name: "The Saree Edit",
    slug: "sarees",
    description: "Discover handwoven sarees for every occasion.",
    image: "/curated-saree-teal.webp",
  },
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
      return {
        id: String(banner._id),
        title: banner.title,
        subtitle: banner.subtitle,
        ctaLabel: banner.ctaLabel,
        ctaHref: banner.ctaHref,
        desktop: image?.desktop ?? "",
        mobile: image?.mobile,
        alt: image?.alt,
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
          // The ERP category pages, never the demo category tree.
          return (
            <CategoryTiles
              key={s.key}
              categories={defaultCategories.map((category) => ({
                ...category,
                image: categoryImageOverrides[category.slug] ?? category.image,
              }))}
              title={s.title}
              subtitle={s.subtitle}
            />
          );
        }
        case "featuredCollections": {
          // Only ERP categories that have published products; the curated images are kept.
          const erpSections = await getErpHomeSections(limit);
          if (!erpSections.length) return null;
          return (
            <FeaturedCollections
              key={s.key}
              collections={erpSections.slice(0, 5).map((section, index) => ({
                id: `erp-${section.group}`,
                name: section.title,
                slug: section.group,
                description: `${section.total} ${section.total === 1 ? "piece" : "pieces"} available`,
                image: defaultFeaturedCollections[index].image,
              }))}
              title={s.title}
              subtitle={s.subtitle}
            />
          );
        }
        case "newArrivals": {
          // Newest published ERP products, one row per storefront category.
          const erpSections = await getErpHomeSections(limit);
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
          const chips = await getErpFilterChips("occasion");
          return <ChipStrip key={s.key} title={s.title ?? "Shop by occasion"} subtitle={s.subtitle} items={chips.slice(0, 8)} />;
        }
        case "fabrics": {
          const chips = await getErpFilterChips("fabric");
          return <ChipStrip key={s.key} title={s.title ?? "Shop by fabric"} subtitle={s.subtitle} items={chips.slice(0, 12)} />;
        }
        case "lifestyle":
          return <LifestyleBanners key={s.key} banners={await site.banners("lifestyle")} />;
        case "testimonials":
          return <Testimonials key={s.key} items={await site.testimonials()} title={s.title} />;
        case "instagram": {
          const images = (await getErpHomeSections(limit)).flatMap((section) => section.items.flatMap((item) => (item.image ? [item.image] : []))).slice(0, 6);
          return <InstagramStrip key={s.key} handle={settings.social?.instagram ? "@" + settings.social.instagram.split("/").filter(Boolean).pop() : undefined} images={images} />;
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
      {!homepageSections.some((section) => section.key === "hero") && hero}
      {rendered}
      {!supportSection && <SupportPanel title="How can we help?" contact={homeContact} settings={settings} whatsappNumber={settings.whatsappNumber} />}
      <HelpJump />
    </>
  );
}
