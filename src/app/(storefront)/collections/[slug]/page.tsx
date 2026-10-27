import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import type { ProductListParams } from "@/domain/types";
import { parseProductListParams } from "@/lib/api/query";
import { getMasterData, getSite } from "@/repositories";
import { collectionToListParams } from "@/repositories/web/site.repository";
import { Listing } from "@/components/listing/listing";
import { BarcodeCollectionFilters, BarcodeFilterSidebar } from "@/components/listing/barcode-collection-filters";
import { BarcodeProductGrid } from "@/components/product/barcode-product-grid";
import { Pagination } from "@/components/listing/toolbar";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { CollectionBanner } from "@/components/listing/collection-banner";
import { BarcodeSortSelect, ViewToggle } from "@/components/listing/barcode-toolbar";
import { BARCODE_SORTS } from "@/domain/types";
import { JsonLd } from "@/components/seo/json-ld";
import { barcodeProductPath } from "@/lib/paths";
import { CATEGORY_SEO, DEFAULT_OG_IMAGE, OG_DEFAULTS, absoluteUrl, barcodeProductFacts, breadcrumbJsonLd, itemListJsonLd, publicImage } from "@/lib/seo";
import { ERP_CATEGORY_TITLES, getBarcodeImageCatalog, getBarcodeImageFilterOptions, getBarcodeImageSeries, type StorefrontCategoryGroup } from "@/lib/barcode-image-series";

type SP = Record<string, string | string[] | undefined>;
const toSearchParams = (sp: SP) => {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) (Array.isArray(v) ? v : v ? [v] : []).forEach((x) => u.append(k, x));
  return u;
};
const firstParam = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

const ERP_PAGE_SIZE = 48;
const ERP_GROUP_BANNERS: Partial<Record<StorefrontCategoryGroup, string>> = {
  sarees: "/hero-red-silk.png",
  fabrics: "/category-fabrics-navy.webp",
  "plain-fabrics": "/category-plain-fabrics-blue.webp",
  dupatta: "/category-dupatta-red-green.webp",
};

function erpGroupForSlug(slug: string): StorefrontCategoryGroup | null {
  if (slug === "sarees" || slug === "fabrics" || slug === "plain-fabrics" || slug === "dupatta" || slug === "simple") return slug;
  return null;
}

async function resolve(slug: string) {
  const master = getMasterData();
  if (slug === "new-arrivals") return { kind: "special" as const, title: "New Arrivals", description: "Fresh off the loom this month.", base: { newArrivals: true, sort: "newest" } as ProductListParams };
  const category = await master.categories.getBySlug(slug);
  if (category) {
    const parent = category.parentId ? await master.categories.getById(category.parentId) : null;
    return { kind: "category" as const, category, parent, base: { category: slug } as ProductListParams };
  }
  const collection = await getSite().collectionBySlug(slug);
  if (collection) return { kind: "collection" as const, collection, base: collectionToListParams(collection) };
  return null;
}

/** URL keys that narrow or reorder a listing; such views point their canonical at the plain collection. */
const NARROWING_KEYS = ["group", "business", "status", "uomType", "subgroup", "weave", "fabric", "craft", "occasion", "color", "q", "sort", "view", "priceMin", "priceMax", "inStock", "discountMin"];

function pageNumber(sp: SP): number {
  const raw = firstParam(sp.page);
  const n = raw && /^\d+$/.test(raw) ? Number(raw) : 1;
  return Number.isSafeInteger(n) ? Math.max(1, n) : 1;
}

/**
 * Canonical + robots for a listing URL: page 2+ is its own canonical page; filtered, sorted or searched
 * views are noindex,follow with the plain collection as canonical, so they never compete with it.
 */
function listingIndexing(slug: string, sp: SP, title: string, description: string, image?: string): Metadata {
  const page = pageNumber(sp);
  const narrowed = NARROWING_KEYS.some((k) => firstParam(sp[k]));
  const canonical = page > 1 && !narrowed ? `/collections/${slug}?page=${page}` : `/collections/${slug}`;
  const pagedTitle = page > 1 ? `${title} – Page ${page}` : title;
  return {
    title: pagedTitle,
    description,
    alternates: { canonical },
    robots: narrowed ? { index: false, follow: true } : undefined,
    openGraph: { ...OG_DEFAULTS, url: canonical, title: pagedTitle, description, ...(image ? { images: [{ url: image, alt: title }] } : {}) },
    twitter: { card: "summary_large_image", title: pagedTitle, description, ...(image ? { images: [image] } : {}) },
  };
}

export async function generateMetadata({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<SP> }): Promise<Metadata> {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const erpGroup = erpGroupForSlug(slug);
  if (erpGroup) {
    // Legacy ?barcode= links redirect to the product's own page, which carries the product metadata.
    if (firstParam(sp.barcode)?.trim()) return { robots: { index: false, follow: true } };
    const copy = CATEGORY_SEO[erpGroup];
    return { ...listingIndexing(slug, sp, copy.title, copy.description, ERP_GROUP_BANNERS[erpGroup] ?? DEFAULT_OG_IMAGE), keywords: copy.keywords };
  }
  const r = await resolve(slug);
  if (!r) return {};
  if (r.kind === "category") return listingIndexing(slug, sp, r.category.name, `Shop ${r.category.name.toLowerCase()} online at Woven Essence by Temple Fabrics, Bengaluru.`, r.category.image ?? undefined);
  if (r.kind === "collection") return listingIndexing(slug, sp, r.collection.seoTitle ?? r.collection.name, r.collection.seoDescription ?? r.collection.description ?? `Shop ${r.collection.name} at Woven Essence by Temple Fabrics, Bengaluru.`, r.collection.banner?.desktop ?? undefined);
  return listingIndexing(slug, sp, r.title, r.description);
}

export default async function CollectionPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<SP> }) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const erpGroup = erpGroupForSlug(slug);
  if (erpGroup) {
    // Old ?barcode= detail links now live at /collections/<slug>/<barcode>.
    const selectedBarcode = firstParam(sp.barcode)?.trim();
    if (selectedBarcode) permanentRedirect(barcodeProductPath(slug, selectedBarcode));
    const page = pageNumber(sp);
    const filters = {
      group: firstParam(sp.group),
      business: firstParam(sp.business),
      status: firstParam(sp.status),
      uomType: firstParam(sp.uomType),
      subgroup: firstParam(sp.subgroup),
      weave: firstParam(sp.weave),
      fabric: firstParam(sp.fabric),
      craft: firstParam(sp.craft),
      occasion: firstParam(sp.occasion),
      color: firstParam(sp.color),
      q: firstParam(sp.q),
      sort: BARCODE_SORTS.find((s) => s === firstParam(sp.sort)),
    };
    const title = ERP_CATEGORY_TITLES[erpGroup];
    const copy = CATEGORY_SEO[erpGroup];
    let result;
    let facets;
    try {
      [result, facets] = await Promise.all([
        getBarcodeImageCatalog(erpGroup, page, filters, ERP_PAGE_SIZE),
        getBarcodeImageFilterOptions(erpGroup),
      ]);
    } catch {
      return (
        <div className="mx-auto max-w-site px-4 py-6 sm:px-6">
          <Breadcrumbs items={[{ label: title }]} />
          <CollectionBanner title={title} image={ERP_GROUP_BANNERS[erpGroup]} />
          <p role="alert" className="mt-6 text-sm text-muted">We couldn&apos;t load this category. Please try again.</p>
          <Link href={`/collections/${slug}`} className="mt-4 inline-flex h-10 items-center rounded-md border border-line px-5 text-sm font-semibold hover:border-maroon hover:text-maroon">Try again</Link>
        </div>
      );
    }
    const first = result.items.length ? (result.page - 1) * ERP_PAGE_SIZE + 1 : 0;
    const last = result.items.length ? first + result.items.length - 1 : 0;
    const layout = firstParam(sp.view) === "list" ? "list" : "grid";
    const pageUrl = absoluteUrl(page > 1 ? `/collections/${slug}?page=${page}` : `/collections/${slug}`);
    return (
      <div className="bg-[#fbf7f2]">
        <JsonLd
          nodes={[
            {
              "@type": "CollectionPage",
              "@id": `${pageUrl}#webpage`,
              url: pageUrl,
              name: `${copy.title} | Woven Essence`,
              description: copy.description,
              inLanguage: "en-IN",
              isPartOf: { "@id": `${absoluteUrl("/")}#website` },
              breadcrumb: breadcrumbJsonLd([{ name: title, path: `/collections/${slug}` }]),
              ...(result.items.length
                ? {
                    mainEntity: itemListJsonLd(result.items.map((item) => ({
                      name: barcodeProductFacts(item).name,
                      path: barcodeProductPath(slug, item.barcode),
                      image: publicImage(item.image),
                    }))),
                  }
                : {}),
            },
          ]}
        />
        <div className="mx-auto max-w-site px-4 pb-6 pt-5 sm:px-6">
          <Breadcrumbs items={[{ label: title }]} />
          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start lg:gap-10">
            <div>
              <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-brass">
                Our Collection <span className="h-px w-12 bg-brass/60" />
              </p>
              <h1 className="mt-2 font-display text-5xl font-semibold leading-none tracking-tight sm:text-6xl">{title}</h1>
              <p className="mt-3 max-w-xl font-display text-base text-ink/75 sm:text-lg">{copy.intro}</p>
            </div>
            <div className="flex min-w-0 flex-col gap-4 lg:max-w-[820px] lg:items-end">
              <Suspense><BarcodeCollectionFilters facets={facets!} /></Suspense>
              <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                <p className="mr-auto text-sm text-muted lg:mr-3">
                  {result.total ? <>Showing {first}–{last} of {result.total} products</> : "No products"}
                </p>
                <Suspense><BarcodeSortSelect /></Suspense>
                <Suspense><ViewToggle /></Suspense>
              </div>
            </div>
          </div>
          {/* Desktop: filter column on the left, products on the right. Below lg the drawer takes over. */}
          <div className="mt-8 lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start lg:gap-7 xl:grid-cols-[260px_minmax(0,1fr)]">
            <Suspense><BarcodeFilterSidebar facets={facets!} /></Suspense>
            <div className="min-w-0">
            {result.items.length ? (
              <BarcodeProductGrid items={result.items} collectionSlug={slug} layout={layout} />
            ) : (
              <p className="py-12 text-center text-sm text-muted">No products match these filters.</p>
            )}
            <Suspense><Pagination page={result.page} pages={result.pages} /></Suspense>
            </div>
          </div>
          {page === 1 && (
            <section className="mt-12 rounded-xl border border-line bg-white/70 p-6 sm:p-8">
              <h2 className="font-display text-2xl font-medium">About our {title.toLowerCase()}</h2>
              <div className="mt-3 max-w-3xl space-y-3 text-[15px] leading-relaxed text-ink/80">
                {copy.about.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
            </section>
          )}
        </div>
      </div>
    );
  }
  const r = await resolve(slug);
  if (!r) notFound();
  const parsed = parseProductListParams(toSearchParams(sp));
  const urlParams = parsed.ok ? parsed.params : {};
  // Fixed params win over URL params so a curated collection can't be widened by the URL.
  const listParams: ProductListParams = { ...urlParams, ...r.base, filters: { ...(urlParams.filters ?? {}), ...(r.base.filters ?? {}) } };

  if (r.kind === "category") {
    const rootCategory = r.parent ?? r.category;
    const rootName = rootCategory.name.trim().toLowerCase();
    const barcodeGroup = /^sarees?$/.test(rootName)
      ? "sarees"
      : /^fabrics?$/.test(rootName)
        ? "fabrics"
        : null;
    const erpItems = barcodeGroup
      ? (await getBarcodeImageSeries(barcodeGroup)).flatMap((series) => series.items)
      : [];
    const tree = await getMasterData().categories.tree();
    const node = tree.find((t) => t.slug === (r.parent?.slug ?? r.category.slug));
    const subs = node?.children ?? [];
    return (
      <Listing title={r.category.name} breadcrumbs={[...(r.parent ? [{ label: r.parent.name, href: `/collections/${r.parent.slug}` }] : []), { label: r.category.name }]} params={listParams} erpItems={erpItems}>
        {subs.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {subs.map((s) => (
              <Link key={s.id} href={`/collections/${s.slug}`} className={`rounded-full border px-4 py-1.5 text-sm font-medium ${s.slug === r.category.slug ? "border-maroon bg-maroon text-white" : "border-line bg-white text-olive hover:border-maroon hover:text-maroon"}`}>{s.name}</Link>
            ))}
          </div>
        )}
      </Listing>
    );
  }
  if (r.kind === "collection") {
    return <Listing title={r.collection.name} description={r.collection.description} banner={r.collection.banner?.desktop} breadcrumbs={[{ label: "Collections", href: "/collections" }, { label: r.collection.name }]} params={listParams} />;
  }
  return <Listing title={r.title} description={r.description} breadcrumbs={[{ label: r.title }]} params={listParams} />;
}
