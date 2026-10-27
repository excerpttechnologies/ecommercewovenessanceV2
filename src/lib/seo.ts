import type { Metadata } from "next";
import type { BarcodeProduct } from "@/domain/types";
import type { SiteSettings } from "@/repositories/web/site.repository";
import { env } from "@/lib/env";
import { businessInfo, e164 } from "@/lib/business";
import { barcodeProductPath } from "@/lib/paths";
import type { StorefrontCategoryGroup } from "@/lib/barcode-image-series";

/* ------------------------------------------------------------------ */
/* Site-wide copy                                                       */
/* ------------------------------------------------------------------ */

export const SITE_NAME = "Woven Essence";
export const BRAND = "Woven Essence by Temple Fabrics";
export const DEFAULT_TITLE = "Woven Essence by Temple Fabrics | Handloom Silk Sarees, Fabrics & Dupattas";
export const DEFAULT_DESCRIPTION =
  "Handloom silk sarees – Kanchipuram, Banarasi & Patola – plus fabrics and dupattas from Temple Fabrics, Jayanagar, Bengaluru. Delivered across India.";
export const DEFAULT_KEYWORDS = [
  "handloom sarees",
  "silk sarees online",
  "Kanchipuram silk sarees",
  "Banarasi sarees",
  "Patola sarees",
  "saree fabrics",
  "dupattas",
  "Temple Fabrics",
  "Woven Essence",
  "saree shop Bengaluru",
  "Jayanagar saree store",
];
/** 1200×630 social preview (public/og-image.jpg). */
export const DEFAULT_OG_IMAGE = "/og-image.jpg";

/** Open Graph fields every page should carry; a page-level openGraph replaces the root one, so pages spread this in. */
export const OG_DEFAULTS = { siteName: BRAND, locale: "en_IN", type: "website" as const };

/** Copy for each ERP storefront category: <title>, meta description, page intro and the longer SEO text. */
export const CATEGORY_SEO: Record<StorefrontCategoryGroup, { title: string; description: string; intro: string; about: string[]; keywords: string[] }> = {
  sarees: {
    title: "Handloom Silk Sarees Online – Kanchipuram, Banarasi & Patola",
    description: "Shop handloom silk sarees online – Kanchipuram, Banarasi, Patola, cotton and fancy sarees for weddings, festivals and every day. Temple Fabrics, Bengaluru.",
    intro: "Explore our handpicked sarees in timeless designs, crafted for every occasion.",
    about: [
      "Every saree at Woven Essence is chosen at our Temple Fabrics store in Jayanagar, Bengaluru. You'll find rich Kanchipuram and Banarasi silks for weddings and receptions, lighter cotton and Kerala kasavu sarees for festivals and daily wear, and fancy sarees for parties.",
      "Use the fabric, weave, craft, occasion and colour filters to narrow the collection, and open any saree to see its barcode, details and price before adding it to your bag.",
    ],
    keywords: ["sarees online", "silk sarees", "Kanchipuram sarees", "Banarasi sarees", "wedding sarees", "cotton sarees"],
  },
  fabrics: {
    title: "Saree & Dress Fabrics Online – Silk, Banarasi & Cotton",
    description: "Buy silk, Banarasi, brocade and cotton fabrics by the metre from Temple Fabrics, Bengaluru – for blouses, lehengas, dresses and custom outfits.",
    intro: "Explore our handpicked fabrics in rich weaves and colours, ready for blouses, lehengas and custom outfits.",
    about: [
      "Our fabric collection brings the weaves of our saree counters to the metre: Banarasi brocades, pure and art silks, chanderi and cotton fabrics chosen at Temple Fabrics, Jayanagar.",
      "Filter by fabric, weave and colour to find a match for a blouse or a complete outfit, then check the details and price on each piece.",
    ],
    keywords: ["fabrics online", "silk fabric", "Banarasi fabric", "blouse fabric", "brocade fabric"],
  },
  "plain-fabrics": {
    title: "Plain Silk & Cotton Fabrics Online – Blouse & Lining Fabrics",
    description: "Plain silk, chanderi and cotton fabrics in solid colours for blouses, linings and contrast borders. Shop online from Temple Fabrics, Bengaluru.",
    intro: "Solid-colour silks, chanderis and cottons for blouses, linings and contrast pairings.",
    about: [
      "Plain fabrics from Temple Fabrics make it easy to pair a blouse with a saree or to stitch an outfit in a single shade. Browse plain silks, chanderi and cottons in a wide range of colours.",
      "Filter by fabric and colour to find the right shade, and check each piece's details before ordering.",
    ],
    keywords: ["plain fabric", "plain silk fabric", "blouse fabric", "lining fabric", "chanderi fabric"],
  },
  dupatta: {
    title: "Silk & Banarasi Dupattas Online – Festive & Wedding Dupattas",
    description: "Silk, Banarasi, chanderi and organza dupattas for festive and wedding outfits. Shop online from Woven Essence by Temple Fabrics, Bengaluru.",
    intro: "Silk, Banarasi and organza dupattas to complete festive and wedding looks.",
    about: [
      "Our dupattas are chosen to finish an outfit: woven Banarasi and silk dupattas for weddings, and lighter chanderi and organza pieces for festive and everyday wear.",
      "Filter by fabric, occasion and colour, and open any dupatta for its details and price.",
    ],
    keywords: ["dupattas online", "silk dupatta", "Banarasi dupatta", "wedding dupatta", "organza dupatta"],
  },
  simple: {
    title: "Everyday Sarees & Fabrics – Simple Collection",
    description: "Easy everyday sarees and fabrics at friendly prices – the Simple collection from Woven Essence by Temple Fabrics, Bengaluru.",
    intro: "Easy, everyday pieces in comfortable fabrics and friendly prices.",
    about: [
      "The Simple collection gathers easy everyday pieces from Temple Fabrics, Jayanagar – comfortable fabrics and uncomplicated designs for regular wear.",
      "Use the filters to browse by fabric and colour, and open any piece for its details and price.",
    ],
    keywords: ["everyday sarees", "daily wear sarees", "simple sarees", "fabrics online"],
  },
};

/* ------------------------------------------------------------------ */
/* URLs                                                                 */
/* ------------------------------------------------------------------ */

export const siteUrl = () => env.NEXT_PUBLIC_SITE_URL;

/** "/collections/sarees" → "https://www.wovenessence.in/collections/sarees"; absolute URLs pass through. */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${siteUrl()}${path.startsWith("/") ? "" : "/"}${path}`;
}

/** Only real http(s) or site-relative image URLs belong in JSON-LD and the sitemap (never data: URIs). */
export function publicImage(src?: string | null): string | undefined {
  if (!src) return undefined;
  if (src.startsWith("/")) return absoluteUrl(src);
  return /^https?:\/\//i.test(src) ? src : undefined;
}

export { barcodeProductPath } from "@/lib/paths";

/* ------------------------------------------------------------------ */
/* ERP product helpers                                                  */
/* ------------------------------------------------------------------ */

export function barcodeProductFacts(item: BarcodeProduct) {
  const price = item.price ?? 0;
  const sellingPrice = item.offerPrice && item.offerPrice < price ? item.offerPrice : price;
  const name = item.ecommerce?.displayName || item.itemName || item.name;
  const detail = [item.ecommerce?.description, item.printDescription].find((d) => d && d.trim() && d !== name)?.trim();
  const inStock = item.status === "IN_STOCK" && !(item.qty != null && item.qty <= 0);
  return { price, sellingPrice, name, detail, inStock };
}

const titleCaseWords = (s: string) => (s === s.toUpperCase() ? s.toLowerCase().replace(/(^|[\s(/-])([a-z])/g, (_m, lead: string, letter: string) => lead + letter.toUpperCase()) : s);

/** "15-SA-PURE – Silk by Kadyal (Faux Border…) | Sarees" style page title for an ERP product. */
export function barcodeProductTitle(item: BarcodeProduct, categoryTitle: string): string {
  const { name, detail } = barcodeProductFacts(item);
  const lead = detail ? `${name} – ${titleCaseWords(detail)}` : name;
  return `${lead.length > 70 ? `${lead.slice(0, 67).trimEnd()}…` : lead} | ${categoryTitle}`;
}

export function barcodeProductDescription(item: BarcodeProduct, categoryTitle: string): string {
  const { name, detail, sellingPrice, inStock } = barcodeProductFacts(item);
  const attrs = Object.entries(item.ecommerce?.attributes ?? {}).filter(([, v]) => Boolean(v)).map(([k, v]) => `${k === "color" ? "Colour" : k.charAt(0).toUpperCase() + k.slice(1)}: ${v}`);
  const parts = [
    `${name}${detail ? ` – ${titleCaseWords(detail)}` : ""}.`,
    attrs.length ? `${attrs.join(", ")}.` : "",
    sellingPrice > 0 ? `₹${sellingPrice.toLocaleString("en-IN")}${inStock ? "" : " (currently unavailable)"}.` : "",
    `Shop ${categoryTitle.toLowerCase()} online at Woven Essence by Temple Fabrics, Bengaluru.`,
  ];
  const text = parts.filter(Boolean).join(" ");
  return text.length > 160 ? `${text.slice(0, 157).trimEnd()}…` : text;
}

/* ------------------------------------------------------------------ */
/* JSON-LD                                                              */
/* ------------------------------------------------------------------ */

type Json = Record<string, unknown>;

const STORE_ID = () => `${siteUrl()}/#store`;
const WEBSITE_ID = () => `${siteUrl()}/#website`;

/** "…, Jayanagar, Bengaluru, Karnataka 560011" → PostalAddress parts. */
function postalAddress(address: string): Json {
  const postalCode = address.match(/\b(\d{6})\b/)?.[1];
  const street = address
    .replace(/,?\s*(Bengaluru|Bangalore)\b.*$/i, "")
    .replace(/,?\s*Karnataka\b.*$/i, "")
    .trim();
  return {
    "@type": "PostalAddress",
    streetAddress: street || address,
    addressLocality: "Bengaluru",
    addressRegion: "Karnataka",
    ...(postalCode ? { postalCode } : {}),
    addressCountry: "IN",
  };
}

/** "Mon–Sat, 10:30 am – 8:30 pm" → OpeningHoursSpecification; anything else is left out. */
function openingHours(hours: string): Json | undefined {
  const m = hours.match(/(mon|tue|wed|thu|fri|sat|sun)\w*\s*[–-]\s*(mon|tue|wed|thu|fri|sat|sun)\w*.*?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\s*[–-]\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  if (!m) return undefined;
  const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const idx = (d: string) => ["mon", "tue", "wed", "thu", "fri", "sat", "sun"].indexOf(d.toLowerCase());
  const [from, to] = [idx(m[1]), idx(m[2])];
  if (from < 0 || to < from) return undefined;
  const time = (h: string, min: string | undefined, ap: string) => {
    let hour = Number(h) % 12;
    if (ap.toLowerCase() === "pm") hour += 12;
    return `${String(hour).padStart(2, "0")}:${min ?? "00"}`;
  };
  return {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: DAYS.slice(from, to + 1),
    opens: time(m[3], m[4], m[5]),
    closes: time(m[6], m[7], m[8]),
  };
}

/** The store as a ClothingStore (a LocalBusiness and an Organization), referenced by @id elsewhere. */
export function storeJsonLd(settings: SiteSettings): Json {
  const info = businessInfo(settings);
  const hours = openingHours(info.hours);
  return {
    "@type": "ClothingStore",
    "@id": STORE_ID(),
    name: BRAND,
    alternateName: [SITE_NAME, "Temple Fabrics"],
    url: siteUrl(),
    logo: absoluteUrl("/logo-trim.png"),
    image: [absoluteUrl(DEFAULT_OG_IMAGE), absoluteUrl("/logo-trim.png")],
    description: settings.seo?.defaultDescription || DEFAULT_DESCRIPTION,
    telephone: e164(info.phone),
    email: info.email,
    address: postalAddress(info.address),
    ...(hours ? { openingHoursSpecification: [hours] } : {}),
    priceRange: "₹₹",
    currenciesAccepted: "INR",
    areaServed: { "@type": "Country", name: "India" },
    sameAs: [info.instagram, info.facebook, info.youtube].filter(Boolean),
  };
}

export function websiteJsonLd(): Json {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID(),
    url: siteUrl(),
    name: SITE_NAME,
    alternateName: BRAND,
    inLanguage: "en-IN",
    publisher: { "@id": STORE_ID() },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${siteUrl()}/search?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]): Json {
  return {
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Home", path: "/" }, ...items].map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: absoluteUrl(it.path),
    })),
  };
}

export function itemListJsonLd(items: { name: string; path: string; image?: string }[]): Json {
  return {
    "@type": "ItemList",
    numberOfItems: items.length,
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: absoluteUrl(it.path),
      name: it.name,
      ...(it.image ? { image: it.image } : {}),
    })),
  };
}

/** Product + Offer for an ERP barcode product. No ratings are emitted: the site has none to report. */
export function barcodeProductJsonLd(item: BarcodeProduct, group: string, categoryTitle: string): Json {
  const { name, sellingPrice, inStock } = barcodeProductFacts(item);
  const url = absoluteUrl(barcodeProductPath(group, item.barcode));
  const image = publicImage(item.image);
  const attrs = item.ecommerce?.attributes ?? {};
  return {
    "@type": "Product",
    "@id": `${url}#product`,
    name,
    description: barcodeProductDescription(item, categoryTitle),
    sku: item.barcode,
    ...(item.itemCode && item.itemCode !== item.barcode ? { mpn: item.itemCode } : {}),
    ...(image ? { image: [image] } : {}),
    brand: { "@type": "Brand", name: SITE_NAME },
    category: categoryTitle,
    ...(attrs.color ? { color: attrs.color } : {}),
    ...(attrs.fabric ? { material: attrs.fabric } : {}),
    url,
    ...(sellingPrice > 0
      ? {
          offers: {
            "@type": "Offer",
            url,
            priceCurrency: "INR",
            price: sellingPrice,
            availability: inStock ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
            itemCondition: "https://schema.org/NewCondition",
            seller: { "@id": STORE_ID() },
          },
        }
      : {}),
  };
}

/** One <script type="application/ld+json"> holding a @graph, with "<" escaped so text can't close the tag. */
export function jsonLdScript(nodes: Json[]): string {
  return JSON.stringify({ "@context": "https://schema.org", "@graph": nodes }).replace(/</g, "\\u003c");
}

/* ------------------------------------------------------------------ */
/* Page metadata                                                        */
/* ------------------------------------------------------------------ */

/** Title, description, canonical, Open Graph and Twitter card for a simple page, from one set of copy. */
export function pageMetadata({ title, description, path, image = DEFAULT_OG_IMAGE }: { title: string; description: string; path: string; image?: string }): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { ...OG_DEFAULTS, url: path, title: `${title} | ${SITE_NAME}`, description, images: [{ url: image, alt: title }] },
    twitter: { card: "summary_large_image", title: `${title} | ${SITE_NAME}`, description, images: [image] },
  };
}
