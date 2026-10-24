"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { ProductCard } from "@/domain/types";
import { api, ApiError } from "@/hooks/api";
import { formatMoney } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Field, Input, Textarea } from "@/components/ui/input";
import { ProductThumb } from "@/components/admin/product-thumb";
import { PageHeader, Pager, Table } from "@/components/admin/table";

type DescriptionRow = ProductCard & { _id: string };

export default function DescriptionsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<DescriptionRow | null>(null);
  const [cardTitle, setCardTitle] = useState("");
  const [cardDescription, setCardDescription] = useState("");
  const [priceOverride, setPriceOverride] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const query = new URLSearchParams({ page: String(page), limit: "30", ...(debouncedSearch ? { q: debouncedSearch } : {}) });
  const list = useQuery({
    queryKey: ["admin", "descriptions", query.toString()],
    queryFn: () => api<DescriptionRow[]>(`/api/v1/admin/descriptions?${query.toString()}`),
    placeholderData: keepPreviousData,
  });
  const meta = list.data?.meta as { pages?: number; total?: number } | undefined;
  const save = useMutation({
    mutationFn: () => api("/api/v1/admin/descriptions", {
      method: "PATCH",
      json: {
        sku: editing!.sku,
        cardTitle,
        cardDescription,
        ...(priceOverride !== originalPrice
          ? { priceOverride: priceOverride.trim() ? Number(priceOverride) : null }
          : {}),
      },
    }),
    onSuccess: () => {
      setEditing(null);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "descriptions"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (cause) => setError(cause instanceof ApiError ? cause.message : "Could not save the product description."),
  });

  function openEditor(row: DescriptionRow) {
    setEditing(row);
    setCardTitle(row.web?.cardTitle ?? row.name);
    setCardDescription(row.web?.cardDescription ?? [row.fabric, row.color].filter(Boolean).join(" · "));
    const currentPrice = String(row.web?.priceOverride ?? row.pricing.sellingPrice);
    setPriceOverride(currentPrice);
    setOriginalPrice(currentPrice);
    setError(null);
  }

  return (
    <div>
      <PageHeader title="Descriptions" subtitle="Edit the product title, description and price shown on the storefront.">
        {meta?.total != null && <span className="text-xs text-muted">{meta.total.toLocaleString("en-IN")} products</span>}
      </PageHeader>
      <div className="mb-3">
        <Input aria-label="Search products" placeholder="Search products…" value={search} onChange={(event) => setSearch(event.target.value)} className="max-w-xs" />
      </div>
      {list.isError ? (
        <div role="alert" className="rounded-sm border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Could not load products. Please refresh and try again.
        </div>
      ) : (
        <div aria-busy={list.isPlaceholderData}>
          <Table<DescriptionRow>
            rows={(list.data?.data ?? []).map((row) => ({ ...row, _id: row.id }))}
            columns={[
              { key: "image", label: "", render: (row) => <ProductThumb src={row.images[0]} alt={row.name} sizes="36px" className="h-12 w-9" /> },
              { key: "name", label: "ERP product", render: (row) => <><span className="font-medium">{row.name}</span><span className="block text-xs text-muted">{row.sku}</span></> },
              { key: "cardTitle", label: "Storefront title", render: (row) => row.web?.cardTitle || row.name },
              { key: "cardDescription", label: "Storefront description", render: (row) => row.web?.cardDescription || [row.fabric, row.color].filter(Boolean).join(" · ") || "—" },
              { key: "price", label: "Storefront price", render: (row) => formatMoney(row.pricing.sellingPrice) },
              { key: "edit", label: "", render: (row) => <Button size="sm" variant="outline" onClick={() => openEditor(row)}>Edit</Button> },
            ]}
            loading={list.isLoading}
            loadingText="Loading products…"
            empty="No products found."
            onRowClick={openEditor}
          />
          <Pager page={page} pages={meta?.pages ?? 1} onChange={setPage} />
        </div>
      )}

      <Drawer open={!!editing} onClose={() => setEditing(null)} title="Edit storefront description" className="max-w-xl">
        {editing && (
          <form className="space-y-4 p-5" onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
            <div>
              <p className="font-medium">{editing.name}</p>
              <p className="text-xs text-muted">SKU {editing.sku}</p>
            </div>
            <Field label="Title below image" hint="Clear the field to use the ERP product name.">
              <Input maxLength={120} value={cardTitle} onChange={(event) => setCardTitle(event.target.value)} />
            </Field>
            <Field label="Description below title" hint="Clear the field to use the product fabric and colour.">
              <Textarea maxLength={240} value={cardDescription} onChange={(event) => setCardDescription(event.target.value)} />
            </Field>
            <Field label="Storefront price (₹)" hint="This price is used across the storefront and checkout. Clear it to restore the ERP price.">
              <Input
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                value={priceOverride}
                onChange={(event) => setPriceOverride(event.target.value)}
              />
            </Field>
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            <Button type="submit" loading={save.isPending}>Save changes</Button>
          </form>
        )}
      </Drawer>
    </div>
  );
}
