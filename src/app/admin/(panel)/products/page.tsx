"use client";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { BarcodeFacets, BarcodeProduct, FacetOption } from "@/domain/types";
import { api } from "@/hooks/api";
import { formatINR } from "@/lib/utils";
import { inferProductType, normalizeProductType } from "@/lib/admin/product-type";
import { getProductClassificationOptions, type ClassificationField } from "@/lib/admin/product-classification-options";
import type { ErpEcommerceCatalog } from "@/lib/admin/erp-ecommerce-catalog";
import { PageHeader, Pager, Table } from "@/components/admin/table";
import { ProductThumb } from "@/components/admin/product-thumb";
import { ClassificationPicker } from "@/components/admin/classification-picker";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Field, Input, Select, Textarea } from "@/components/ui/input";

type Row = BarcodeProduct & {
  _id: string;
  erpEcommerce: ErpEcommerceCatalog | null;
  web: {
    slug: string;
    seoTitle?: string;
    seoDescription?: string;
    productName?: string;
    itemName?: string;
    barcodeName?: string;
    productType?: string;
    itemType?: string;
    weaveDescription?: string;
    fabricDescription?: string;
    craftDescription?: string;
    occasionDescription?: string;
    colorDescription?: string;
    groupNameOverride?: string;
    supplierCodeOverride?: string;
    supplierNameOverride?: string;
    printDescriptionOverride?: string;
    ecommOffPercent?: number;
    barcodePriceOverride?: number;
    barcodeQtyOverride?: number;
    barcodeStatusOverride?: string;
    isFeatured?: boolean;
    isActive?: boolean;
    salesCount?: number;
  } | null;
};
type Filters = { status: string; group: string; business: string; uomType: string };
type ProductEditValues = { productName: string; itemName: string; isActive: boolean; isFeatured: boolean; productType: string; weaveDescription: string; fabricDescription: string; craftDescription: string; occasionDescription: string; colorDescription: string; printDescription: string; ecommOffPercent: string; price: string; quantity: string; status: string; slug: string; seoTitle: string; seoDescription: string };

const NO_FILTERS: Filters = { status: "", group: "", business: "", uomType: "" };
const PRODUCT_TYPES = ["SAREES", "FABRICS", "PLAIN FABRICS", "DUPATTA", "NEW ARRIVALS"] as const;
const STATUS_TONE: Record<string, BadgeTone> = { IN_STOCK: "green", IN_TRANSIT: "blue", SOLD: "muted", HISTORY: "muted", VOID: "red" };
const statusLabel = (s: string) => s.toLowerCase().replace(/_/g, " ");
const effectivePrice = (row: Row) => row.web?.barcodePriceOverride ?? row.erpEcommerce?.barcodePriceOverride ?? row.price;
const effectiveQty = (row: Row) => row.web?.barcodeQtyOverride ?? row.erpEcommerce?.barcodeQtyOverride ?? row.qty;
const effectiveStatus = (row: Row) => row.web?.barcodeStatusOverride ?? row.erpEcommerce?.barcodeStatusOverride ?? row.status;
function FilterSelect({ label, value, options, onChange, format = (s) => s }: { label: string; value: string; options?: FacetOption[]; onChange: (v: string) => void; format?: (s: string) => string }) {
  if (!options?.length) return null;
  return (
    <Select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className="w-auto max-w-[14rem]">
      <option value="">{label}: all</option>
      {options.map((o) => <option key={o.value} value={o.value}>{format(o.label)} ({o.count.toLocaleString("en-IN")})</option>)}
    </Select>
  );
}

function formatErpValue(value: unknown): string {
  if (value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value, null, 2);
}

export default function ProductsPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [editing, setEditing] = useState<Row | null>(null);
  const [productName, setProductName] = useState("");
  const [itemName, setItemName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [productType, setProductType] = useState("");
  const [weaveDescription, setWeaveDescription] = useState("");
  const [fabricDescription, setFabricDescription] = useState("");
  const [craftDescription, setCraftDescription] = useState("");
  const [occasionDescription, setOccasionDescription] = useState("");
  const [colorDescription, setColorDescription] = useState("");
  const [printDescription, setPrintDescription] = useState("");
  const [ecommOffPercent, setEcommOffPercent] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [status, setStatus] = useState("");
  const [slug, setSlug] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [erpFetchToast, setErpFetchToast] = useState(false);
  const [initialEditValues, setInitialEditValues] = useState<ProductEditValues>({
    productName: "",
    itemName: "",
    isActive: true,
    isFeatured: false,
    productType: "",
    weaveDescription: "",
    fabricDescription: "",
    craftDescription: "",
    occasionDescription: "",
    colorDescription: "",
    printDescription: "",
    ecommOffPercent: "",
    price: "",
    quantity: "",
    status: "",
    slug: "",
    seoTitle: "",
    seoDescription: "",
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQ(q.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (!erpFetchToast) return;
    const timer = setTimeout(() => setErpFetchToast(false), 4000);
    return () => clearTimeout(timer);
  }, [erpFetchToast]);

  const qs = new URLSearchParams({ page: String(page), limit: "40", ...(debouncedQ ? { q: debouncedQ } : {}), ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) }).toString();
  const list = useQuery({ queryKey: ["admin", "products", qs], queryFn: () => api<Row[]>(`/api/v1/admin/products?${qs}`), placeholderData: keepPreviousData });
  const facets = useQuery({ queryKey: ["admin", "products", "facets"], queryFn: () => api<BarcodeFacets>("/api/v1/admin/products/facets"), staleTime: 60_000 });
  const classificationOptionsKey = ["admin", "product-classification-options", productType];
  const classificationOptions = useQuery({
    queryKey: classificationOptionsKey,
    queryFn: async () => (await api<Partial<Record<ClassificationField, string[]>>>(`/api/v1/admin/product-classification-options?productType=${encodeURIComponent(productType)}`)).data,
    enabled: !!productType,
  });
  const meta = list.data?.meta as { pages?: number; total?: number; skipped?: number } | undefined;
  const f = facets.data?.data;
  const setFilter = (k: keyof Filters) => (v: string) => { setFilters((s) => ({ ...s, [k]: v })); setPage(1); };
  const filtered = !!debouncedQ || Object.values(filters).some(Boolean);
  const stale = list.isPlaceholderData; // previous rows shown while the new query loads
  const optionsFor = (field: ClassificationField) => {
    return classificationOptions.data?.[field] ?? getProductClassificationOptions(productType, field);
  };
  const addClassificationOption = async (field: ClassificationField, value: string) => {
    const { data } = await api<{ productType: string; field: ClassificationField; value: string }>(
      "/api/v1/admin/product-classification-options",
      { method: "POST", json: { productType, field, value } },
    );
    qc.setQueryData<Partial<Record<ClassificationField, string[]>>>(classificationOptionsKey, (current) => {
      const existing = current?.[field] ?? [];
      return {
        ...current,
        [field]: existing.some((option) => option.toLocaleLowerCase() === data.value.toLocaleLowerCase())
          ? existing
          : [...existing, data.value],
      };
    });
  };
  const deleteClassificationOption = async (field: ClassificationField, value: string) => {
    await api("/api/v1/admin/product-classification-options", {
      method: "DELETE",
      json: { productType, field, value },
    });
    qc.setQueryData<Partial<Record<ClassificationField, string[]>>>(classificationOptionsKey, (current) => ({
      ...current,
      [field]: (current?.[field] ?? []).filter((option) => option.toLocaleLowerCase() !== value.toLocaleLowerCase()),
    }));
  };

  // A narrower search can leave the current page past the end; go back to the last real page.
  useEffect(() => {
    if (!stale && meta?.pages && page > meta.pages) setPage(meta.pages);
  }, [stale, meta?.pages, page]);

  const save = useMutation({
    mutationFn: () => api("/api/v1/admin/products", {
      method: "PATCH",
      json: {
        sku: editing!.barcode,
        ...(productName !== initialEditValues.productName ? { productName: productName.trim() || null } : {}),
        ...(itemName !== initialEditValues.itemName ? { itemName: itemName.trim() || null } : {}),
        ...(isActive !== initialEditValues.isActive ? { isActive } : {}),
        ...(isFeatured !== initialEditValues.isFeatured ? { isFeatured } : {}),
        ...(productType !== initialEditValues.productType ? { productType: productType || null } : {}),
        ...(weaveDescription !== initialEditValues.weaveDescription ? { weaveDescription: weaveDescription.trim() || null } : {}),
        ...(fabricDescription !== initialEditValues.fabricDescription ? { fabricDescription: fabricDescription.trim() || null } : {}),
        ...(craftDescription !== initialEditValues.craftDescription ? { craftDescription: craftDescription.trim() || null } : {}),
        ...(occasionDescription !== initialEditValues.occasionDescription ? { occasionDescription: occasionDescription.trim() || null } : {}),
        ...(colorDescription !== initialEditValues.colorDescription ? { colorDescription: colorDescription.trim() || null } : {}),
        ...(printDescription !== initialEditValues.printDescription ? { printDescriptionOverride: printDescription.trim() || null } : {}),
        ...(ecommOffPercent !== initialEditValues.ecommOffPercent ? { ecommOffPercent: ecommOffPercent.trim() ? Number(ecommOffPercent) : null } : {}),
        ...(price !== initialEditValues.price ? { barcodePriceOverride: price.trim() ? Number(price) : null } : {}),
        ...(quantity !== initialEditValues.quantity ? { barcodeQtyOverride: quantity.trim() ? Number(quantity) : null } : {}),
        ...(status !== initialEditValues.status ? { barcodeStatusOverride: status || null } : {}),
        ...(slug !== initialEditValues.slug ? { slug: slug.trim() } : {}),
        ...(seoTitle !== initialEditValues.seoTitle ? { seoTitle: seoTitle.trim() } : {}),
        ...(seoDescription !== initialEditValues.seoDescription ? { seoDescription: seoDescription.trim() } : {}),
      },
    }),
    onSuccess: () => {
      setEditing(null);
      setError(null);
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
    },
    onError: (e) => setError((e as Error).message),
  });

  return (
    <div>
      <PageHeader title="Products" />
      {erpFetchToast && (
        <div role="status" aria-live="polite" className="fixed right-5 top-5 z-[70] rounded-sm border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 shadow-lg">
          E-commerce data fetched from ERP successfully.
        </div>
      )}
      <div className="mb-3 flex flex-wrap gap-2">
        <Input placeholder="Search barcode / item code / name…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <FilterSelect label="Status" value={filters.status} options={f?.status} onChange={setFilter("status")} format={statusLabel} />
        <FilterSelect label="Group" value={filters.group} options={f?.group} onChange={setFilter("group")} />
        <FilterSelect label="Business" value={filters.business} options={f?.business} onChange={setFilter("business")} />
        <FilterSelect label="UOM" value={filters.uomType} options={f?.uomType} onChange={setFilter("uomType")} />
        {filtered && <Button variant="ghost" size="sm" onClick={() => { setQ(""); setDebouncedQ(""); setFilters(NO_FILTERS); setPage(1); }}>Clear</Button>}
      </div>
      {list.isError ? (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-sm border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Unable to load products. Please try again.
          <Button variant="outline" size="sm" onClick={() => list.refetch()} loading={list.isFetching}>Retry</Button>
        </div>
      ) : (
        <div aria-busy={stale} className={stale ? "pointer-events-none opacity-60 transition-opacity" : "transition-opacity"}>
          {!!meta?.skipped && <p className="mb-2 text-xs text-amber-800">{meta.skipped} record(s) on this page could not be read and were skipped.</p>}
          <Table<Row>
            rows={(list.data?.data ?? []).map((r) => ({ ...r, _id: r.id }))}
            loading={list.isLoading}
            loadingText="Loading products..."
            empty="No barcode products found."
            columns={[
              { key: "img", label: "", render: (r) => <ProductThumb src={r.image} alt={r.name} issue={r.imageIssue} sizes="36px" className="h-12 w-9" /> },
              { key: "name", label: "Product", render: (r) => {
                const primaryName = r.web?.productName || r.web?.itemName || r.web?.barcodeName || r.erpEcommerce?.displayName || r.name;
                const secondaryName = r.web?.productName ? (r.web?.itemName || r.itemName) : r.web?.itemName && r.web?.barcodeName ? r.web.barcodeName : null;
                return <><span className="font-medium">{primaryName}</span>{secondaryName && <span className="block text-xs text-muted">{secondaryName}</span>}{(r.web?.groupNameOverride ?? r.group) && <span className="block text-xs text-muted">{r.web?.groupNameOverride ?? r.group}</span>}</>;
              } },
              { key: "code", label: "Item code", render: (r) => <>{r.itemCode && <span className="font-mono text-xs">{r.itemCode}</span>}{r.oldBarcode && <span className="block font-mono text-[11px] text-muted">old {r.oldBarcode}</span>}</> },
              { key: "qty", label: "Qty", render: (r) => {
                const qty = effectiveQty(r);
                return qty == null ? null : `${qty.toLocaleString("en-IN", { maximumFractionDigits: 3 })}${r.uom ? ` ${r.uom}` : ""}`;
              } },
              { key: "price", label: "Price", render: (r) => {
                const amount = effectivePrice(r);
                return <>{amount != null && formatINR(amount)}{r.offerPrice != null && r.offerPrice !== amount && <span className="block text-xs text-muted">offer {formatINR(r.offerPrice)}</span>}</>;
              } },
              { key: "status", label: "Status", render: (r) => {
                const value = effectiveStatus(r);
                return <>{value && <Badge tone={STATUS_TONE[value] ?? "muted"}>{statusLabel(value)}</Badge>}{r.business && <span className="mt-1 block text-[11px] text-muted">{r.business}</span>}</>;
              } },
              { key: "edit", label: "Action", render: (r) => <Button size="sm" variant="outline" onClick={() => {
                setError(null);
                setErpFetchToast(!!r.erpEcommerce);
                setEditing(r);
                const values = {
                  productName: r.web?.productName ?? r.erpEcommerce?.displayName ?? r.erpEcommerce?.productName ?? r.name,
                  itemName: r.web?.itemName ?? r.erpEcommerce?.itemName ?? r.itemName ?? "",
                  isActive: r.web?.isActive ?? r.erpEcommerce?.isPublished ?? (r.erpEcommerce?.visibility ? !["hidden", "inactive", "disabled"].includes(r.erpEcommerce.visibility.toLowerCase()) : true),
                  isFeatured: r.web?.isFeatured ?? r.erpEcommerce?.isFeatured ?? false,
                  productType: normalizeProductType(r.web?.productType || r.erpEcommerce?.productType || inferProductType(r)),
                  weaveDescription: r.web?.weaveDescription ?? r.erpEcommerce?.attributes.weave ?? "",
                  fabricDescription: r.web?.fabricDescription ?? r.erpEcommerce?.attributes.fabric ?? "",
                  craftDescription: r.web?.craftDescription ?? r.erpEcommerce?.attributes.craft ?? "",
                  occasionDescription: r.web?.occasionDescription ?? r.erpEcommerce?.attributes.occasion ?? "",
                  colorDescription: r.web?.colorDescription ?? r.erpEcommerce?.attributes.color ?? "",
                  printDescription: r.web?.printDescriptionOverride ?? r.erpEcommerce?.printDescription ?? r.erpEcommerce?.description ?? r.erpEcommerce?.shortDescription ?? r.printDescription ?? "",
                  ecommOffPercent: String(r.web?.ecommOffPercent ?? r.erpEcommerce?.ecommOffPercent ?? ""),
                  price: String(effectivePrice(r) ?? ""),
                  quantity: String(effectiveQty(r) ?? ""),
                  status: r.web?.barcodeStatusOverride ?? r.erpEcommerce?.barcodeStatusOverride ?? "",
                  slug: r.web?.slug ?? r.erpEcommerce?.slug ?? r.slug,
                  seoTitle: r.web?.seoTitle ?? r.erpEcommerce?.seo.title ?? "",
                  seoDescription: r.web?.seoDescription ?? r.erpEcommerce?.seo.description ?? "",
                };
                setInitialEditValues(values);
                setProductName(values.productName);
                setItemName(values.itemName);
                setIsActive(values.isActive);
                setIsFeatured(values.isFeatured);
                setProductType(values.productType);
                void qc.invalidateQueries({ queryKey: ["admin", "product-classification-options", values.productType] });
                setWeaveDescription(values.weaveDescription);
                setFabricDescription(values.fabricDescription);
                setCraftDescription(values.craftDescription);
                setOccasionDescription(values.occasionDescription);
                setColorDescription(values.colorDescription);
                setPrintDescription(values.printDescription);
                setEcommOffPercent(values.ecommOffPercent);
                setPrice(values.price);
                setQuantity(values.quantity);
                setStatus(values.status);
                setSlug(values.slug);
                setSeoTitle(values.seoTitle);
                setSeoDescription(values.seoDescription);
              }}>Edit</Button> },
            ]}
          />
          <Pager page={page} pages={meta?.pages ?? 1} onChange={setPage} />
        </div>
      )}
      <Drawer open={!!editing} onClose={() => setEditing(null)} title="Edit product" className="max-w-xl">
        {editing && (
          <form className="space-y-5 p-5" onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
            <div className="space-y-3">
              <ProductThumb src={editing.image} alt={editing.name} issue={editing.imageIssue} sizes="(max-width: 576px) 100vw, 544px" className="h-52 w-full" fit="contain" showFallbackMessage />
              <div className="min-w-0">
                <p className="font-medium">{editing.web?.productName || editing.web?.itemName || editing.web?.barcodeName || editing.erpEcommerce?.displayName || editing.name}</p>
                <p className="text-xs text-muted">RetailERP barcode {editing.barcode}</p>
              </div>
            </div>
            {editing.erpEcommerce?.raw && (
              <details className="rounded-sm border border-border bg-white">
                <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
                  All RetailERP ecommerceproduct data ({Object.keys(editing.erpEcommerce.raw).length} fields)
                </summary>
                <dl className="divide-y divide-border border-t border-border">
                  {Object.entries(editing.erpEcommerce.raw).map(([key, value]) => (
                    <div key={key} className="grid gap-1 px-3 py-2 sm:grid-cols-[minmax(9rem,0.7fr)_minmax(0,1.3fr)]">
                      <dt className="break-all text-xs font-medium text-muted">{key}</dt>
                      <dd className="min-w-0 whitespace-pre-wrap break-words font-mono text-xs">
                        {formatErpValue(value) || <span className="text-muted">(empty)</span>}
                      </dd>
                    </div>
                  ))}
                </dl>
              </details>
            )}
            <Field label="Display name">
              <Input maxLength={160} value={productName} onChange={(event) => setProductName(event.target.value)} />
            </Field>
            <Field label="Item name">
              <Input maxLength={160} value={itemName} onChange={(event) => setItemName(event.target.value)} />
            </Field>
            <Field label="Is active">
              <label className="flex h-10 items-center gap-2 text-sm">
                <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} className="h-4 w-4 accent-[var(--we-olive)]" />
                {isActive ? "Active on website" : "Inactive on website"}
              </label>
            </Field>
            <Field label="Featured">
              <label className="flex h-10 items-center gap-2 text-sm">
                <input type="checkbox" checked={isFeatured} onChange={(event) => setIsFeatured(event.target.checked)} className="h-4 w-4 accent-[var(--we-olive)]" />
                {isFeatured ? "Featured on website" : "Not featured"}
              </label>
            </Field>
            <Field label="Product type">
              <Select value={normalizeProductType(productType)} onChange={(event) => setProductType(normalizeProductType(event.target.value))}>
                {PRODUCT_TYPES.map((value) => <option key={value} value={value}>{value}</option>)}
              </Select>
            </Field>
            {classificationOptions.isError && <p role="alert" className="text-sm text-red-700">Could not load saved classification options. Please try again.</p>}
            {normalizeProductType(productType) === "SAREES" && (
              <>
                <Field label="By weave"><ClassificationPicker label="weave" options={optionsFor("By Weave")} value={weaveDescription} onChange={setWeaveDescription} onAddCustom={(value) => addClassificationOption("By Weave", value)} onDeleteOption={(value) => deleteClassificationOption("By Weave", value)} /></Field>
                <Field label="By fabric"><ClassificationPicker label="fabric" options={optionsFor("By Fabric")} value={fabricDescription} onChange={setFabricDescription} onAddCustom={(value) => addClassificationOption("By Fabric", value)} onDeleteOption={(value) => deleteClassificationOption("By Fabric", value)} /></Field>
                <Field label="By Craft"><ClassificationPicker label="craft" options={optionsFor("By Craft")} value={craftDescription} onChange={setCraftDescription} onAddCustom={(value) => addClassificationOption("By Craft", value)} onDeleteOption={(value) => deleteClassificationOption("By Craft", value)} /></Field>
                <Field label="By Occasion"><ClassificationPicker label="occasion" options={optionsFor("By Occasion")} value={occasionDescription} onChange={setOccasionDescription} onAddCustom={(value) => addClassificationOption("By Occasion", value)} onDeleteOption={(value) => deleteClassificationOption("By Occasion", value)} /></Field>
              </>
            )}
            {["FABRICS", "PLAIN FABRICS", "DUPATTA"].includes(productType) && (
              <>
                <Field label="By Fabric"><ClassificationPicker label="fabric" options={optionsFor("By Fabric")} value={fabricDescription} onChange={setFabricDescription} onAddCustom={(value) => addClassificationOption("By Fabric", value)} onDeleteOption={(value) => deleteClassificationOption("By Fabric", value)} /></Field>
                <Field label="By colour"><ClassificationPicker label="colour" options={optionsFor("By colour")} value={colorDescription} onChange={setColorDescription} onAddCustom={(value) => addClassificationOption("By colour", value)} onDeleteOption={(value) => deleteClassificationOption("By colour", value)} /></Field>
              </>
            )}
            <Field label="Item code">
              <Input value={editing.itemCode ?? ""} readOnly />
            </Field>
            {editing.erpEcommerce?.ecommItemCode && (
              <Field label="E-commerce item code">
                <Input value={editing.erpEcommerce.ecommItemCode} readOnly />
              </Field>
            )}
            <Field label="HSN code">
              <Input value={editing.hsnCode ?? ""} readOnly />
            </Field>
            <Field label="ECOMM OFF (%)">
              <Input type="number" min="0" max="100" step="0.01" inputMode="decimal" value={ecommOffPercent} onChange={(event) => setEcommOffPercent(event.target.value)} />
            </Field>
            <Field label="Price (₹)">
              <Input type="number" min="0" step="0.01" inputMode="decimal" value={price} onChange={(event) => setPrice(event.target.value)} />
            </Field>
            <Field label={`Quantity${editing.uom ? ` (${editing.uom})` : ""}`}>
              <Input type="number" min="0" step="0.001" inputMode="decimal" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
            </Field>
            <Field label="Status">
              <Select value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="">Use ERP status{editing.status ? ` (${statusLabel(editing.status)})` : ""}</option>
                {["IN_STOCK", "IN_TRANSIT", "SOLD", "HISTORY", "VOID"].map((value) => (
                  <option key={value} value={value}>{statusLabel(value)}</option>
                ))}
              </Select>
            </Field>
            <Field label="Print description">
              <Textarea maxLength={1000} value={printDescription} onChange={(event) => setPrintDescription(event.target.value)} />
            </Field>
            <Field label="URL slug">
              <Input maxLength={120} value={slug} onChange={(event) => setSlug(event.target.value)} />
            </Field>
            <Field label="SEO title">
              <Input maxLength={120} value={seoTitle} onChange={(event) => setSeoTitle(event.target.value)} />
            </Field>
            <Field label="SEO description">
              <Textarea maxLength={240} value={seoDescription} onChange={(event) => setSeoDescription(event.target.value)} />
            </Field>
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            <Button type="submit" loading={save.isPending}>Save changes</Button>
          </form>
        )}
      </Drawer>
    </div>
  );
}
