import { Suspense } from "react";
import { CollectionBanner } from "./collection-banner";
import type { BarcodeProduct, ProductListParams } from "@/domain/types";
import { getMasterData } from "@/repositories";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Empty } from "@/components/ui/empty";
import { ErpImageGallery } from "@/components/home/sections";
import { ProductGrid } from "@/components/product/product-grid";
import { FacetSidebar } from "./facet-sidebar";
import { Pagination, SortSelect } from "./toolbar";

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
      <CollectionBanner title={title} description={description} image={banner} />
      {children}
      <ErpImageGallery title={`${title} - ERP collection`} items={erpItems} />
      <div className="mt-8 flex flex-col gap-6 lg:flex-row lg:gap-8">
        <Suspense>
          <FacetSidebar facets={facets} />
        </Suspense>
        <div className="min-w-0 flex-1">
          <div className="mb-5 flex items-center justify-between gap-4 border-b border-line pb-3">
            <p className="text-sm text-muted"><span className="font-medium text-ink">{result.total}</span> {result.total === 1 ? "product" : "products"}</p>
            <Suspense><SortSelect /></Suspense>
          </div>
          {result.items.length ? <ProductGrid items={result.items} cols={4} priorityCount={4} /> : <Empty title="Nothing matches those filters" text="Try clearing a filter or two." />}
          <Suspense><Pagination page={result.page} pages={result.pages} /></Suspense>
        </div>
      </div>
    </div>
  );
}
