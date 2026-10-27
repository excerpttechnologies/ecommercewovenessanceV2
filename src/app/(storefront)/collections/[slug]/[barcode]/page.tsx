import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { cache } from "react";
import { ArrowRight } from "lucide-react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { BarcodeProductGrid } from "@/components/product/barcode-product-grid";
import { BarcodeProductDetail } from "@/components/product/barcode-product-detail";
import { getSettings } from "@/lib/site-data";
import { JsonLd } from "@/components/seo/json-ld";
import { ERP_CATEGORY_TITLES, getBarcodeImageCatalog, type StorefrontCategoryGroup } from "@/lib/barcode-image-series";
import { barcodeProductPath } from "@/lib/paths";
import {
  DEFAULT_OG_IMAGE,
  OG_DEFAULTS,
  absoluteUrl,
  barcodeProductDescription,
  barcodeProductFacts,
  barcodeProductJsonLd,
  barcodeProductTitle,
  breadcrumbJsonLd,
  publicImage,
} from "@/lib/seo";

type Params = Promise<{ slug: string; barcode: string }>;

const isGroup = (slug: string): slug is StorefrontCategoryGroup => slug in ERP_CATEGORY_TITLES;

/** One ERP product by barcode within its storefront category; cached so metadata and page share the query. */
const loadProduct = cache(async (group: StorefrontCategoryGroup, barcode: string) => {
  const result = await getBarcodeImageCatalog(group, 1, { barcode }, 1);
  return result.items[0] ?? null;
});

async function resolve(params: Params) {
  const { slug, barcode: rawBarcode } = await params;
  if (!isGroup(slug)) return null;
  let barcode = rawBarcode;
  try {
    barcode = decodeURIComponent(rawBarcode);
  } catch {
    // already decoded, or a literal "%" in the barcode
  }
  barcode = barcode.trim();
  if (!barcode) return null;
  const item = await loadProduct(slug, barcode);
  return item ? { group: slug, item, categoryTitle: ERP_CATEGORY_TITLES[slug] } : null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const r = await resolve(params).catch(() => null);
  if (!r) return { title: "Product not found", robots: { index: false, follow: true } };
  const { group, item, categoryTitle } = r;
  const title = barcodeProductTitle(item, categoryTitle);
  const description = barcodeProductDescription(item, categoryTitle);
  const path = barcodeProductPath(group, item.barcode);
  const image = publicImage(item.image) ?? absoluteUrl(DEFAULT_OG_IMAGE);
  const { sellingPrice, inStock, name } = barcodeProductFacts(item);
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { ...OG_DEFAULTS, url: path, title, description, images: [{ url: image, alt: name }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
    other: sellingPrice > 0
      ? {
          "product:price:amount": String(sellingPrice),
          "product:price:currency": "INR",
          "product:availability": inStock ? "in stock" : "out of stock",
          "product:brand": "Woven Essence",
          "product:retailer_item_id": item.barcode,
        }
      : {},
  };
}

export default async function BarcodeProductPage({ params }: { params: Params }) {
  const r = await resolve(params);
  if (!r) notFound();
  const { group, item, categoryTitle } = r;
  const { name } = barcodeProductFacts(item);
  // One query gives both the related row and Previous / Next (newest-first, as on the collection page).
  const [firstPage, settings] = await Promise.all([
    getBarcodeImageCatalog(group, 1, {}, 48).then((res) => res.items).catch(() => []),
    getSettings().catch(() => null),
  ]);
  const index = firstPage.findIndex((other) => other.barcode === item.barcode);
  const neighbour = (other?: (typeof firstPage)[number]) => (other ? { href: barcodeProductPath(group, other.barcode), name: barcodeProductFacts(other).name } : null);
  const related = firstPage.filter((other) => other.barcode !== item.barcode).slice(0, 8);
  return (
    <div className="mx-auto max-w-site px-4 py-6 sm:px-6">
      <JsonLd
        nodes={[
          barcodeProductJsonLd(item, group, categoryTitle),
          breadcrumbJsonLd([{ name: categoryTitle, path: `/collections/${group}` }, { name, path: barcodeProductPath(group, item.barcode) }]),
        ]}
      />
      <Breadcrumbs items={[{ label: categoryTitle, href: `/collections/${group}` }, { label: name }]} />
      <div className="mt-4">
        <BarcodeProductDetail
          item={item}
          categoryTitle={categoryTitle}
          categoryHref={`/collections/${group}`}
          previous={index > 0 ? neighbour(firstPage[index - 1]) : null}
          next={index >= 0 ? neighbour(firstPage[index + 1]) : null}
          freeShippingAbove={settings?.commerce?.freeShippingAbove}
          codEnabled={settings?.commerce?.codEnabled !== false}
        />
      </div>
      {related.length > 0 && (
        <section className="mt-14" aria-labelledby="related-heading">
          <div className="mb-5 flex items-end justify-between gap-4">
            <h2 id="related-heading" className="font-display text-3xl font-semibold tracking-tight">More {categoryTitle.toLowerCase()}</h2>
            <Link href={`/collections/${group}`} className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-maroon hover:text-gold">
              View all <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          <BarcodeProductGrid items={related} collectionSlug={group} />
        </section>
      )}
    </div>
  );
}
