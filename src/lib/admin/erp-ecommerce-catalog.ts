import { Types, type Connection } from "mongoose";
import { toObjectIdOrString } from "@/lib/db";
import { ERP_BARCODE_COLLECTIONS } from "@/lib/erp-mapping";

export interface ErpEcommerceCatalog {
  id: string;
  raw?: Record<string, unknown>;
  displayName?: string;
  ecommItemCode?: string;
  productName?: string;
  itemName?: string;
  shortDescription?: string;
  description?: string;
  printDescription?: string;
  barcodePriceOverride?: number;
  barcodeQtyOverride?: number;
  barcodeStatusOverride?: string;
  ecommOffPercent?: number;
  productType?: string;
  isFeatured?: boolean;
  isPublished?: boolean;
  image?: string;
  slug?: string;
  status?: string;
  attributes: {
    weave?: string;
    fabric?: string;
    craft?: string;
    occasion?: string;
    color?: string;
  };
  seo: {
    title?: string;
    description?: string;
  };
  visibility?: string;
}

export interface ErpEcommerceReference {
  id: string;
  itemId?: string;
  businessId?: string;
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function jsonValue(value: unknown): unknown {
  if (value == null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(jsonValue);
  if (typeof value === "object") {
    const bson = value as { _bsontype?: unknown; toHexString?: () => string };
    if (typeof bson.toHexString === "function") return bson.toHexString();
    if (typeof bson._bsontype === "string") return String(value);
    return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, jsonValue(nested)]));
  }
  return String(value);
}

function jsonRecord(value: Record<string, unknown>): Record<string, unknown> {
  return jsonValue(value) as Record<string, unknown>;
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function number(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function classificationNames(value: unknown, names: ReadonlyMap<string, string>): string | undefined {
  const values = Array.isArray(value) ? value : value == null ? [] : [value];
  const resolved = values
    .map((item) => String(item))
    .map((id) => names.get(id) ?? id)
    .filter(Boolean);
  return resolved.length ? resolved.join(", ") : undefined;
}

export function erpEcommerceKey(itemId?: string, businessId?: string): string | undefined {
  return itemId && businessId ? `${itemId}:${businessId}` : undefined;
}

export function mapErpEcommerceCatalog(
  value: unknown,
  names: ReadonlyMap<string, string> = new Map(),
  includeRaw = false,
): ErpEcommerceCatalog {
  const source = record(value);
  const attributes = record(source.attributes);
  const seo = record(source.seo);
  const displayName = text(source.displayName);
  const visibility = text(source.visibility) ?? text(source.status)
    ?? (source.isPublished === false ? "hidden" : undefined);
  return {
    id: String(source._id ?? ""),
    ...(includeRaw ? { raw: jsonRecord(source) } : {}),
    displayName,
    ecommItemCode: text(source.ecommItemCode),
    productName: displayName ?? text(source.productName),
    itemName: text(source.ecommerceItemName),
    shortDescription: text(source.shortDescription),
    description: text(source.description),
    printDescription: text(source.printDescriptionOverride) ?? text(source.description) ?? text(source.shortDescription),
    barcodePriceOverride: number(source.barcodePriceOverride),
    barcodeQtyOverride: number(source.barcodeQtyOverride),
    barcodeStatusOverride: text(source.barcodeStatusOverride),
    ecommOffPercent: number(source.ecommOffPercent),
    productType: text(source.productType),
    isFeatured: typeof source.isFeatured === "boolean" ? source.isFeatured : undefined,
    isPublished: typeof source.isPublished === "boolean" ? source.isPublished : undefined,
    image: text(source.image),
    slug: text(source.slug),
    status: text(source.status),
    attributes: {
      weave: text(source.weaveDescription) ?? text(attributes.weave) ?? classificationNames(source.byWeave, names),
      fabric: text(source.fabricDescription) ?? text(attributes.fabric) ?? classificationNames(source.byFabric, names),
      craft: text(source.craftDescription) ?? text(attributes.work) ?? classificationNames(source.byCraft, names),
      occasion: text(source.occasionDescription) ?? text(attributes.occasion) ?? classificationNames(source.byOccasion, names),
      color: text(source.colourDescription) ?? text(source.colorDescription)
        ?? text(attributes.color) ?? text(attributes.colorFamily) ?? classificationNames(source.byColour, names),
    },
    seo: {
      title: text(source.seoTitle) ?? text(seo.title),
      description: text(source.seoDescription) ?? text(seo.description),
    },
    visibility,
  };
}

function idCandidates(value: string): unknown[] {
  const converted = toObjectIdOrString(value);
  return converted === value ? [value] : [value, converted];
}

export async function loadErpEcommerceCatalogs(
  connection: Connection,
  references: readonly ErpEcommerceReference[],
): Promise<Map<string, ErpEcommerceCatalog>> {
  if (!connection.db) throw new Error("RetailERP database connection is not ready");
  const uniqueReferences = new Map<string, ErpEcommerceReference>();
  for (const reference of references) {
    const key = erpEcommerceKey(reference.itemId, reference.businessId);
    if (key) uniqueReferences.set(key, reference);
  }
  const directLabelIds = [...new Set(references.map((reference) => reference.id).filter(Boolean))];
  if (!uniqueReferences.size && !directLabelIds.length) return new Map();

  const query: Record<string, unknown>[] = [...uniqueReferences.values()].map(({ itemId, businessId }) => ({
    itemId: { $in: idCandidates(itemId!) },
    businessId: { $in: idCandidates(businessId!) },
  }));
  if (directLabelIds.length) {
    query.push({ erpDocumentId: { $in: directLabelIds.flatMap(idCandidates) } });
  }
  const records = await connection.db.collection(ERP_BARCODE_COLLECTIONS.ecommerceProducts)
    .find({ $or: query })
    .sort({ updatedAt: -1 })
    .toArray();

  const optionIds = [...new Set(records.flatMap((row) =>
    ["byWeave", "byFabric", "byCraft", "byOccasion", "byColour"]
      .flatMap((field) => Array.isArray(row[field]) ? row[field].map(String) : []),
  ))];
  const optionObjectIds = optionIds
    .filter((id) => Types.ObjectId.isValid(id))
    .map((id) => new Types.ObjectId(id));
  const options = optionObjectIds.length
    ? await connection.db.collection(ERP_BARCODE_COLLECTIONS.productClassificationOptions)
      .find({ _id: { $in: optionObjectIds } }, { projection: { _id: 1, name: 1 } })
      .toArray()
    : [];
  const names = new Map(options.map((option) => [String(option._id), String(option.name)]));
  const catalogs = new Map<string, ErpEcommerceCatalog>();
  for (const row of records) {
    const key = erpEcommerceKey(String(row.itemId ?? ""), String(row.businessId ?? ""));
    if (key && !catalogs.has(key)) catalogs.set(key, mapErpEcommerceCatalog(row, names, true));
    if (row.erpDocumentId != null) {
      const labelKey = `label:${String(row.erpDocumentId)}`;
      if (!catalogs.has(labelKey)) catalogs.set(labelKey, mapErpEcommerceCatalog(row, names, true));
    }
  }
  return catalogs;
}
