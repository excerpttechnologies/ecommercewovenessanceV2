import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { env } from "@/lib/env";
import { getMasterData } from "@/repositories";
import { getSettings } from "@/lib/site-data";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Price } from "@/components/ui/price";
import { AddToCart } from "@/components/product/add-to-cart";
import { Gallery } from "@/components/product/gallery";
import { PincodeCheck } from "@/components/product/pincode-check";
import { ProductRail } from "@/components/product/product-rail";
import { Reviews } from "@/components/product/reviews";
import { SectionHeading } from "@/components/ui/section-heading";
import { slugify } from "@/lib/utils";
import Link from "next/link";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ comingSoon?: string; name?: string }>;
};

export async function generateMetadata({ params, searchParams }: ProductPageProps): Promise<Metadata> {
  const p = await getMasterData().products.getBySlug((await params).slug);
  if (!p) {
    const query = await searchParams;
    if (query.comingSoon === "1" && query.name) return { title: `${query.name} — Coming Soon` };
    return {};
  }
  return {
    title: p.web?.seoTitle ?? p.name,
    description: p.web?.seoDescription ?? p.description.slice(0, 160),
    openGraph: { images: p.images.slice(0, 1), type: "website" },
    alternates: { canonical: `/products/${p.slug}` },
  };
}

export default async function ProductPage({ params, searchParams }: ProductPageProps) {
  const master = getMasterData();
  const product = await master.products.getBySlug((await params).slug);
  if (!product) {
    const query = await searchParams;
    if (query.comingSoon !== "1" || !query.name) notFound();
    return (
      <div className="mx-auto max-w-site px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-2xl rounded-sm border border-dashed border-line px-6 py-16 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-olive">Coming Soon</p>
          <h1 className="mt-3 text-3xl">{query.name}</h1>
          <p className="mt-3 text-sm text-muted">We’re preparing this product for you. Please check back soon.</p>
          <Link href="/collections/sarees" className="mt-6 inline-flex h-10 items-center border border-line px-5 text-xs uppercase tracking-widest hover:border-olive">
            Browse sarees
          </Link>
        </div>
      </div>
    );
  }
  const [settings, related, category] = await Promise.all([
    getSettings(),
    master.products.related(product, 8),
    master.categories.getBySlug(slugify(product.category)),
  ]);

  const attrs: [string, string | undefined][] = [
    ["Fabric", product.fabric],
    ["Weave", product.weave],
    ["Craft", product.craft],
    ["Colour", product.color],
    ["Motif / Pattern", product.motif],
    ["Border", product.border],
    ["Occasion", product.occasion.join(", ") || undefined],
    ["Blouse", product.blouseIncluded ? "Blouse piece included" : "Without blouse"],
    ["Length", product.dimensions.length ? `${product.dimensions.length} m` : undefined],
    ["Width", product.dimensions.width ? `${product.dimensions.width} inches` : undefined],
    ["Weight", product.dimensions.weight ? `${product.dimensions.weight} g` : undefined],
    ["HSN", product.pricing.hsnCode],
    ["SKU", product.sku],
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.sku,
    image: product.images,
    description: product.description,
    brand: { "@type": "Brand", name: settings.storeName },
    offers: {
      "@type": "Offer",
      url: `${env.NEXT_PUBLIC_SITE_URL}/products/${product.slug}`,
      priceCurrency: "INR",
      price: product.pricing.sellingPrice,
      availability: product.stock.qty > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };

  return (
    <div className="mx-auto max-w-site px-4 py-6 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Breadcrumbs items={[...(category ? [{ label: category.name, href: `/collections/${category.slug}` }] : []), { label: product.name }]} />
      <div className="mt-6 grid gap-10 lg:grid-cols-[1.1fr_1fr]">
        <Gallery images={product.images} alt={product.name} badge={product.isNewArrival ? "New" : undefined} />
        <div>
          <div className="flex flex-wrap gap-2">
            {product.fabric && <Badge tone="gold">{product.fabric}</Badge>}
            {product.stock.status === "low_stock" && <Badge tone="amber">Only {product.stock.qty} left</Badge>}
            {product.stock.status === "out_of_stock" && <Badge tone="red">Sold out</Badge>}
          </div>
          <h1 className="mt-3 text-3xl leading-tight sm:text-4xl">{product.name}</h1>
          <p className="mt-1 text-xs uppercase tracking-widest text-muted">SKU {product.sku}</p>
          <div className="mt-4">
            <Price amount={product.pricing.sellingPrice} mrp={product.pricing.mrp} size="lg" />
            <p className="mt-1 text-xs text-muted">Inclusive of {product.pricing.gstPercent}% GST · Free shipping above ₹{(settings.commerce?.freeShippingAbove ?? 4999).toLocaleString("en-IN")}</p>
          </div>
          {product.description && <p className="mt-5 text-sm leading-relaxed text-ink/85">{product.description}</p>}
          <div className="mt-6">
            <AddToCart product={product} whatsapp={settings.whatsappNumber} siteUrl={env.NEXT_PUBLIC_SITE_URL} />
          </div>
          <div className="mt-6 border-t border-line pt-5">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.2em] text-olive">Check delivery</p>
            <PincodeCheck />
          </div>
          <dl className="mt-6 grid grid-cols-[minmax(0,140px)_1fr] gap-x-4 gap-y-2 border-t border-line pt-5 text-sm">
            {attrs.filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-muted">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          {product.careInstructions && (
            <details className="mt-6 border-t border-line pt-4 text-sm">
              <summary className="cursor-pointer text-[11px] font-medium uppercase tracking-[0.2em] text-olive">Care instructions</summary>
              <p className="mt-2 text-ink/80">{product.careInstructions}</p>
            </details>
          )}
          {(settings.trustBadges ?? []).length > 0 && (
            <ul className="mt-6 grid grid-cols-2 gap-3 border-t border-line pt-5 text-xs text-muted">
              {settings.trustBadges!.slice(0, 4).map((b, i) => <li key={i}>✓ {b.title}</li>)}
            </ul>
          )}
        </div>
      </div>

      <Reviews sku={product.sku} />

      {related.length > 0 && (
        <section className="mt-16">
          <SectionHeading title="You may also like" href={category ? `/collections/${category.slug}` : undefined} />
          <ProductRail items={related} />
        </section>
      )}
    </div>
  );
}
