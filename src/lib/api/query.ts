import { z } from "zod";
import { FILTER_KEYS, SORT_KEYS, type BarcodeListParams, type ProductListParams } from "@/domain/types";

const bool = z.enum(["true", "false", "1", "0"]).transform((v) => v === "true" || v === "1");

export const ProductListQuery = z.object({
  category: z.string().max(120).optional(),
  q: z.string().max(100).optional(),
  sort: z.enum(SORT_KEYS).default("featured"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(96).default(24),
  priceMin: z.coerce.number().min(0).optional(),
  priceMax: z.coerce.number().min(0).optional(),
  discountMin: z.coerce.number().min(0).max(100).optional(),
  inStock: bool.optional(),
  newArrivals: bool.optional(),
  tags: z.array(z.string()).optional(),
  skus: z.array(z.string()).optional(),
  fabric: z.array(z.string()).optional(),
  weave: z.array(z.string()).optional(),
  craft: z.array(z.string()).optional(),
  occasion: z.array(z.string()).optional(),
  color: z.array(z.string()).optional(),
  motif: z.array(z.string()).optional(),
  border: z.array(z.string()).optional(),
});

const MULTI = [...FILTER_KEYS, "tags", "skus"] as const;
const SINGLE = ["category", "q", "sort", "page", "limit", "priceMin", "priceMax", "discountMin", "inStock", "newArrivals"] as const;

/**
 * URL query -> ProductListParams. Multi-value keys accept both
 * ?fabric=A&fabric=B and ?fabric=A,B (the storefront filter sidebar uses the latter).
 */
export function parseProductListParams(
  sp: URLSearchParams,
): { ok: true; params: ProductListParams } | { ok: false; error: z.ZodError } {
  const raw: Record<string, unknown> = {};
  for (const key of MULTI) {
    const values = sp
      .getAll(key)
      .flatMap((v) => v.split(","))
      .map((v) => v.trim())
      .filter(Boolean);
    if (values.length) raw[key] = values;
  }
  for (const key of SINGLE) {
    const v = sp.get(key);
    if (v != null && v !== "") raw[key] = v;
  }
  const parsed = ProductListQuery.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error };
  const { fabric, weave, craft, occasion, color, motif, border, ...rest } = parsed.data;
  const filters: ProductListParams["filters"] = {};
  for (const [k, v] of Object.entries({ fabric, weave, craft, occasion, color, motif, border })) {
    if (v?.length) filters[k as keyof typeof filters] = v;
  }
  return { ok: true, params: { ...rest, filters } };
}

/** Admin Products (RetailERP barcodeLabel) list query. Filter values are matched exactly. */
export const BarcodeListQuery = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.string().trim().max(40).optional(),
  group: z.string().trim().max(64).optional(),
  business: z.string().trim().max(64).optional(),
  uomType: z.string().trim().max(20).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(96).default(40),
});

export function parseBarcodeListParams(sp: URLSearchParams): { ok: true; params: BarcodeListParams } | { ok: false; error: z.ZodError } {
  const raw: Record<string, string> = {};
  for (const key of Object.keys(BarcodeListQuery.shape)) {
    const v = sp.get(key);
    if (v != null && v.trim() !== "") raw[key] = v;
  }
  const parsed = BarcodeListQuery.safeParse(raw);
  return parsed.success ? { ok: true, params: parsed.data } : { ok: false, error: parsed.error };
}
