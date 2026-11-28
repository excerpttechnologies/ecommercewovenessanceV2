import { Suspense } from "react";
import { CollectionBanner } from "./collection-banner";
import type { BarcodeProduct, ProductListParams } from "@/domain/types";
import { getMasterData } from "@/repositories";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Empty } from "@/components/ui/empty";
import { ErpImageGallery } from "@/components/home/sections";
import { ProductGrid } from "@/components/product/product-grid";
import { FacetSidebar } from "./facet-sidebar";
import { RelatedSearchProducts } from "./related-search-products";
import { Pagination, SortSelect } from "./toolbar";
import { isBarcodeLike, normalizeBarcode } from "@/lib/barcode-search";
import { isProductCodeSearch } from "@/lib/related-search";

interface Props {
  title: string;
  description?: string | null;
  banner?: string | null;
  breadcrumbs: { label: string; href?: string }[];
  params: ProductListParams;
  erpItems?: BarcodeProduct[];
  showFilters?: boolean;
  showRelatedForSearch?: boolean;
  /** Fixed params (category/collection rules) merged under URL params for facet counting. */
  children?: React.ReactNode;
}

/** Shared listing shell used by category, curated collection, new-arrivals and search pages. */
export async function Listing({ title, description, banner, breadcrumbs, params, erpItems = [], showFilters = true, showRelatedForSearch = false, children }: Props) {
  const master = getMasterData();
  const availableParams = { ...params, inStock: true };
  const [result, facets] = await Promise.all([
    master.products.list(availableParams),
    showFilters ? master.products.facets(availableParams) : Promise.resolve(null),
  ]);
  const query = params.q?.trim() ?? "";
  const isCodeSearch = showRelatedForSearch && isProductCodeSearch(query, result.items);
  const relatedItems = isCodeSearch
    ? await master.products.relatedForSearch(query, result.items, 24).catch(() => [])
    : [];
  const excludeSkus = result.items.map((item) => item.sku);
  const emptyTitle = isBarcodeLike(params.q)
    ? "No product found for this barcode."
    : showFilters
      ? "Nothing matches those filters"
      : "No products found";
  const emptyText = isBarcodeLike(params.q)
    ? "Please check the barcode number and try again."
    : showFilters
      ? "Try clearing a filter or two."
      : "Try searching with a different item code, product name, or keyword.";

  const content = (
    <div className={showFilters ? "min-w-0 flex-1" : "mt-8 min-w-0"}>
      <div className="mb-5 flex items-center justify-between gap-4 border-b border-line pb-3">
        <p className="text-sm text-muted"><span className="font-medium text-ink">{result.total}</span> {result.total === 1 ? "product" : "products"}</p>
        <Suspense><SortSelect /></Suspense>
      </div>
      {result.items.length ? (
        <ProductGrid items={result.items} cols={4} priorityCount={4} />
      ) : (
        <Empty title={emptyTitle} text={emptyText} />
      )}
      <Suspense><Pagination page={result.page} pages={result.pages} /></Suspense>
    </div>
  );

  return (
    <div className="mx-auto max-w-site px-4 py-6 sm:px-6">
      <Breadcrumbs items={breadcrumbs} />
      <CollectionBanner title={title} description={description} image={banner} />
      {children}
      <ErpImageGallery title={`${title} - ERP collection`} items={erpItems} />
      {showFilters && facets ? (
        <div className="mt-8 flex flex-col gap-6 lg:flex-row lg:gap-8">
          <Suspense>
            <FacetSidebar facets={facets} />
          </Suspense>
          {content}
        </div>
      ) : (
        content
      )}
      {isCodeSearch && (
        <RelatedSearchProducts
          key={normalizeBarcode(query)}
          query={query}
          excludeSkus={excludeSkus}
          initialItems={relatedItems}
        />
      )}
    </div>
  );
}
