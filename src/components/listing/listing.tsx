import { Suspense } from "react";
import Image from "next/image";
import type { BarcodeProduct, ProductListParams } from "@/domain/types";
import { getMasterData } from "@/repositories";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Empty } from "@/components/ui/empty";
import { ErpImageGallery } from "@/components/home/sections";
import { ProductGrid } from "@/components/product/product-grid";
import { FacetSidebar } from "./facet-sidebar";
import { Pagination, SortSelect } from "./toolbar";
import { isRemoteImageSource } from "@/lib/utils";

interface Props {
  title: string;
  description?: string | null;
  banner?: string | null;
  breadcrumbs: { label: string; href?: string }[];
  params: ProductListParams;
  erpItems?: BarcodeProduct[];
  /** Fixed params (category/collection rules) merged under URL params for facet counting. */
  children?: React.ReactNode;
}

/** Shared listing shell used by category, curated collection, new-arrivals and search pages. */
export async function Listing({ title, description, banner, breadcrumbs, params, erpItems = [], children }: Props) {
  const master = getMasterData();
  const [result, facets] = await Promise.all([master.products.list(params), master.products.facets(params)]);
  return (
    <div className="mx-auto max-w-site px-4 py-6 sm:px-6">
      <Breadcrumbs items={breadcrumbs} />
      {banner ? (
        <div className="relative mt-4 aspect-[3/1] overflow-hidden rounded-sm bg-line sm:aspect-[16/4]">
          <Image src={banner} alt={title} fill priority unoptimized={isRemoteImageSource(banner)} sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 flex flex-col justify-center bg-ink/30 px-8 text-ivory">
            <h1 className="font-heading text-4xl text-ivory sm:text-5xl">{title}</h1>
            {description && <p className="mt-2 max-w-lg text-sm text-ivory/85">{description}</p>}
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <h1 className="we-rule text-4xl">{title}</h1>
          {description && <p className="mt-3 max-w-2xl text-sm text-muted">{description}</p>}
        </div>
      )}
      {children}
      <ErpImageGallery title={`${title} - ERP collection`} items={erpItems} />
      <div className="mt-8 flex gap-8">
        <Suspense>
          <FacetSidebar facets={facets} />
        </Suspense>
        <div className="min-w-0 flex-1">
          <div className="mb-5 flex items-center justify-between gap-4">
            <p className="text-xs uppercase tracking-widest text-muted">{result.total} {result.total === 1 ? "product" : "products"}</p>
            <Suspense><SortSelect /></Suspense>
          </div>
          {result.items.length ? <ProductGrid items={result.items} cols={4} priorityCount={4} /> : <Empty title="Nothing matches those filters" text="Try clearing a filter or two." />}
          <Suspense><Pagination page={result.page} pages={result.pages} /></Suspense>
        </div>
      </div>
    </div>
  );
}
