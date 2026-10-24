"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { PageHeader, Pager, Stat, Table } from "@/components/admin/table";
import { api } from "@/hooks/api";

interface ReviewedProduct {
  _id: string;
  itemCode: string;
  productName: string;
  averageRating: number;
  totalReviews: number;
  verifiedPurchaseReviews: number;
}

interface ReviewSummary {
  totalItems: number;
  reviewsEnabledItems: number;
  productsWithReviews: number;
  totalReviews: number;
  verifiedPurchaseReviews: number;
  averageRating: number;
}

export default function ReviewsPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const query = new URLSearchParams({
    page: String(page),
    limit: "50",
    ...(debouncedSearch ? { q: debouncedSearch } : {}),
  });
  const reviews = useQuery({
    queryKey: ["admin", "reviews", query.toString()],
    queryFn: () => api<ReviewedProduct[]>(`/api/v1/admin/reviews?${query.toString()}`),
  });
  const summary = reviews.data?.meta?.summary as ReviewSummary | undefined;
  const metadata = reviews.data?.meta as { pages?: number } | undefined;

  return (
    <div>
      <PageHeader title="Reviews" />
      <p className="mb-4 rounded-sm border border-line bg-ivory/60 p-3 text-xs text-muted">
        Live product review summaries from RetailERP. RetailERP does not provide individual customer review records.
      </p>
      {reviews.isError && (
        <p role="alert" className="mb-4 rounded-sm border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          Could not load review data from RetailERP: {(reviews.error as Error).message}
        </p>
      )}
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="ERP items" value={summary?.totalItems ?? (reviews.isLoading ? "…" : "—")} />
        <Stat label="Reviews enabled" value={summary?.reviewsEnabledItems ?? (reviews.isLoading ? "…" : "—")} />
        <Stat label="Products with reviews" value={summary?.productsWithReviews ?? (reviews.isLoading ? "…" : "—")} />
        <Stat label="Reviews recorded" value={summary?.totalReviews ?? (reviews.isLoading ? "…" : "—")} />
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        <Input
          aria-label="Search ERP review summaries"
          placeholder="Search item code or product..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="min-w-[240px] flex-1"
        />
      </div>
      <Table
        rows={reviews.data?.data ?? []}
        loading={reviews.isLoading}
        loadingText="Loading live ERP review data..."
        empty={summary?.totalReviews
          ? "No reviewed products match this search."
          : "RetailERP currently has no individual product reviews recorded."}
        columns={[
          { key: "itemCode", label: "Item code", className: "font-mono text-xs" },
          { key: "productName", label: "Product" },
          { key: "averageRating", label: "Average rating", render: (product) => product.totalReviews ? `${product.averageRating.toFixed(1)} / 5` : "—" },
          { key: "totalReviews", label: "Reviews" },
          { key: "verifiedPurchaseReviews", label: "Verified purchases" },
        ]}
      />
      <Pager page={page} pages={metadata?.pages ?? 1} onChange={setPage} />
      {summary && (
        <p className="mt-3 text-xs text-muted">
          {summary.verifiedPurchaseReviews.toLocaleString("en-IN")} verified purchases
          {summary.totalReviews > 0 && ` · average rating ${summary.averageRating.toFixed(1)} / 5`}
        </p>
      )}
    </div>
  );
}
