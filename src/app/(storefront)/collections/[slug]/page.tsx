import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import type { ProductListParams } from "@/domain/types";
import { parseProductListParams } from "@/lib/api/query";
import { getMasterData, getSite } from "@/repositories";
import { collectionToListParams } from "@/repositories/web/site.repository";
import { Listing } from "@/components/listing/listing";
import { BarcodeCollectionFilters } from "@/components/listing/barcode-collection-filters";
import { BarcodeProductGrid } from "@/components/product/barcode-product-grid";
import { Pagination } from "@/components/listing/toolbar";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ERP_CATEGORY_TITLES, getBarcodeImageCatalog, getBarcodeImageFilterOptions, getBarcodeImageSeries, type StorefrontCategoryGroup } from "@/lib/barcode-image-series";

type SP = Record<string, string | string[] | undefined>;
const toSearchParams = (sp: SP) => {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) (Array.isArray(v) ? v : v ? [v] : []).forEach((x) => u.append(k, x));
  return u;
};
const firstParam = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

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

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const erpGroup = erpGroupForSlug(slug);
  if (erpGroup) {
    const title = ERP_CATEGORY_TITLES[erpGroup];
    return { title, description: `Browse ${title.toLowerCase()} with images from RetailERP.` };
  }
  const r = await resolve(slug);
  if (!r) return {};
  if (r.kind === "category") return { title: r.category.name, description: `Shop ${r.category.name.toLowerCase()} from Woven Essence.` };
  if (r.kind === "collection") return { title: r.collection.seoTitle ?? r.collection.name, description: r.collection.seoDescription ?? r.collection.description ?? undefined };
  return { title: r.title, description: r.description };
}

export default async function CollectionPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<SP> }) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const erpGroup = erpGroupForSlug(slug);
  if (erpGroup) {
    const selectedBarcode = firstParam(sp.barcode)?.trim();
    const detailView = Boolean(selectedBarcode);
    const rawPage = Array.isArray(sp.page) ? sp.page[0] : sp.page;
    const parsedPage = rawPage && /^\d+$/.test(rawPage) ? Number(rawPage) : 1;
    const page = Number.isSafeInteger(parsedPage) ? Math.max(1, parsedPage) : 1;
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
      ...(selectedBarcode ? { barcode: selectedBarcode } : {}),
    };
    const title = ERP_CATEGORY_TITLES[erpGroup];
    let result;
    let facets;
    try {
      [result, facets] = await Promise.all([
        getBarcodeImageCatalog(erpGroup, page, filters),
        detailView ? Promise.resolve(null) : getBarcodeImageFilterOptions(erpGroup),
      ]);
    } catch {
      return (
        <div className="mx-auto max-w-site px-4 py-6 sm:px-6">
          <Breadcrumbs items={[{ label: title }]} />
          <h1 className="we-rule mt-4 text-4xl">All {title}</h1>
          <p role="alert" className="mt-6 text-sm text-muted">We couldn&apos;t load this category. Please try again.</p>
          <Link href={`/collections/${slug}`} className="mt-4 inline-flex h-10 items-center border border-line px-5 text-xs uppercase tracking-widest hover:border-olive">Try again</Link>
        </div>
      );
    }
    const pageCount = Math.max(result.pages, 1);
    return (
      <div className="mx-auto max-w-site px-4 py-6 sm:px-6">
        <Breadcrumbs items={detailView ? [{ label: title, href: `/collections/${slug}` }, { label: selectedBarcode! }] : [{ label: title }]} />
        <div className="mt-4">
          <h1 className="we-rule text-4xl">{detailView ? title : `All ${title}`}</h1>
          {!detailView && <p className="mt-3 max-w-2xl text-sm text-muted">Products, images and item descriptions are loaded from RetailERP.</p>}
        </div>
        {!detailView && <Suspense><BarcodeCollectionFilters facets={facets!} /></Suspense>}
        {result.items.length ? (
          <BarcodeProductGrid items={result.items} collectionSlug={!detailView ? slug : undefined} detailView={detailView} />
        ) : (
          <p className="py-12 text-center text-sm text-muted">No products are available in this category.</p>
        )}
        {!detailView && <p className="text-center text-xs uppercase tracking-widest text-muted">Showing {result.items.length} ERP products · Page {result.page} of {pageCount}</p>}
        {!detailView && <Suspense><Pagination page={result.page} pages={result.pages} /></Suspense>}
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
              <Link key={s.id} href={`/collections/${s.slug}`} className={`rounded-full border px-4 py-1.5 text-xs uppercase tracking-widest ${s.slug === r.category.slug ? "border-olive bg-olive text-ivory" : "border-line text-olive hover:border-gold"}`}>{s.name}</Link>
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
