/* eslint-disable @typescript-eslint/no-explicit-any */
import { Types, type Connection, type FilterQuery, type Model, type PipelineStage } from "mongoose";
import { toObjectIdOrString } from "@/lib/db";
import {
  BARCODE_JOINED,
  BARCODE_LABEL_FIELDS as B,
  BARCODE_SEARCH_FIELDS,
  BUSINESS_FIELDS,
  ERP_BARCODE_COLLECTIONS,
  PRODUCT_GROUP_FIELDS,
  SUPPLIER_FIELDS,
  mapBarcodeLabel,
} from "@/lib/erp-mapping";
import { barcodeImageUrl } from "@/lib/erp-images";
import { escapeRegex } from "@/lib/utils";
import { BarcodeLabelModel } from "@/models/erp/barcode-label.model";
import type { AnyDoc } from "@/models/_util";
import type { BarcodeFacets, BarcodeListParams, BarcodeProduct, FacetOption, Paginated } from "@/domain/types";
import type { BarcodeLabelRepository } from "../types";

const MAX_LIMIT = 96;
type ErpId = string | Types.ObjectId;
type EcommerceClassification = "weave" | "fabric" | "craft" | "occasion" | "color";

const ECOMMERCE_CLASSIFICATIONS: Record<EcommerceClassification, { ids: string; text: string; nested: string }> = {
  weave: { ids: "byWeave", text: "weaveDescription", nested: "weave" },
  fabric: { ids: "byFabric", text: "fabricDescription", nested: "fabric" },
  craft: { ids: "byCraft", text: "craftDescription", nested: "work" },
  occasion: { ids: "byOccasion", text: "occasionDescription", nested: "occasion" },
  color: { ids: "byColour", text: "colourDescription", nested: "color" },
};

function stringValues(value: unknown): string[] {
  const values = Array.isArray(value) ? value : value == null ? [] : [value];
  return values.flatMap((item) => {
    if (typeof item === "string" && item.trim()) return [item.trim()];
    if (typeof item === "number") return [String(item)];
    if (item && typeof item === "object" && typeof (item as { toHexString?: unknown }).toHexString === "function") {
      return [(item as Types.ObjectId).toHexString()];
    }
    return [];
  });
}

function ecommerceClassificationValues(product: AnyDoc, field: EcommerceClassification): string[] {
  const config = ECOMMERCE_CLASSIFICATIONS[field];
  const attributes = product.attributes && typeof product.attributes === "object"
    ? product.attributes as Record<string, unknown>
    : {};
  return [...new Set([
    ...stringValues(product[config.ids]),
    ...stringValues(product[config.text]),
    ...stringValues(attributes[config.nested]),
  ])];
}

/** Live on the storefront: the ERP's "Is Published" tick alone decides (Is Active / Active Status are not used). */
function activeEcommerceMatch(productTypes: string[]): Record<string, unknown> {
  return {
    productType: { $in: productTypes },
    isPublished: true,
  };
}

/** Barcodes the ERP product-eccom form saved on the record (`barcode`, plus any extra in `barcodes`). */
function savedBarcodes(product: AnyDoc): string[] {
  const values = [product.barcode, ...(Array.isArray(product.barcodes) ? product.barcodes : [])];
  return [...new Set(values.map((value) => (typeof value === "string" || typeof value === "number" ? String(value).trim() : "")).filter(Boolean))];
}

/** Only the fields the mapper reads leave the database. */
const PROJECTION: Record<string, 1> = Object.fromEntries(
  Object.values(B)
    .filter((p) => p !== "_id")
    .map((p) => [p, 1]),
);

/** $lookup by a hex-string id held in `localField` (the ERP stores these refs as strings). */
function lookupName(from: string, localField: string, nameField: string, as: string): PipelineStage[] {
  return [
    {
      $lookup: {
        from,
        let: { ref: `$${localField}` },
        pipeline: [
          { $match: { $expr: { $eq: ["$_id", { $convert: { input: "$$ref", to: "objectId", onError: null, onNull: null } }] } } },
          { $project: { _id: 0, n: `$${nameField}` } },
          { $limit: 1 },
        ],
        as,
      },
    },
    { $set: { [as]: { $first: `$${as}.n` } } },
  ];
}

const JOIN_STAGES: PipelineStage[] = [
  ...lookupName(ERP_BARCODE_COLLECTIONS.productGroups, B.groupId, PRODUCT_GROUP_FIELDS.name, BARCODE_JOINED.groupName),
  ...lookupName(ERP_BARCODE_COLLECTIONS.businesses, B.businessId, BUSINESS_FIELDS.name, BARCODE_JOINED.businessName),
  {
    $lookup: {
      from: ERP_BARCODE_COLLECTIONS.suppliers,
      let: {
        ref: `$${B.supplierId}`,
        objectIdRef: { $convert: { input: `$${B.supplierId}`, to: "objectId", onError: null, onNull: null } },
      },
      pipeline: [
        {
          $match: {
            $expr: {
              $or: [
                { $eq: ["$_id", "$$objectIdRef"] },
                { $eq: [`$${SUPPLIER_FIELDS.code}`, "$$ref"] },
              ],
            },
          },
        },
        {
          $project: {
            _id: 0,
            code: `$${SUPPLIER_FIELDS.code}`,
            name: { $ifNull: [`$${SUPPLIER_FIELDS.name}`, `$${SUPPLIER_FIELDS.alternateName}`] },
          },
        },
        { $limit: 1 },
      ],
      as: "_supplier",
    },
  },
  {
    $set: {
      [BARCODE_JOINED.supplierCode]: {
        $ifNull: [
          { $first: "$_supplier.code" },
          {
            $cond: [
              { $regexMatch: { input: { $ifNull: [{ $toString: `$${B.supplierId}` }, ""] }, regex: /^[a-f0-9]{24}$/i } },
              null,
              `$${B.supplierId}`,
            ],
          },
        ],
      },
      [BARCODE_JOINED.supplierName]: { $first: "$_supplier.name" },
    },
  },
];

export class MongoBarcodeLabelRepository implements BarcodeLabelRepository {
  constructor(private readonly conn: () => Promise<Connection>) {}

  private async M() {
    return BarcodeLabelModel(await this.conn());
  }

  private async classificationNames(connection: Connection, products: AnyDoc[]) {
    const ids = [...new Set(Object.keys(ECOMMERCE_CLASSIFICATIONS).flatMap((field) =>
      products.flatMap((product) => ecommerceClassificationValues(product, field as EcommerceClassification)),
    ))];
    const objectIds = ids.filter(Types.ObjectId.isValid).map((id) => new Types.ObjectId(id));
    if (!objectIds.length) return new Map<string, string>();
    const options = await connection.db!.collection<{ _id: ErpId; name?: unknown }>(ERP_BARCODE_COLLECTIONS.productClassificationOptions)
      .find({ _id: { $in: objectIds } }, { projection: { _id: 1, name: 1 } })
      .toArray();
    return new Map(options.flatMap((option) =>
      typeof option.name === "string" && option.name.trim()
        ? [[String(option._id), option.name.trim()] as const]
        : [],
    ));
  }

  private match(params: BarcodeListParams): FilterQuery<AnyDoc> {
    const and: FilterQuery<AnyDoc>[] = [];
    if (params.labelIds?.length) and.push({ _id: { $in: params.labelIds.map(toObjectIdOrString) } });
    if (params.barcodes?.length) and.push({ [B.barcode]: { $in: params.barcodes } });
    if (params.excludedBarcodes?.length) and.push({ [B.barcode]: { $nin: params.excludedBarcodes } });
    if (params.inStockStatusOnly) and.push({ [B.status]: "IN_STOCK" });
    if (params.availableOnly) {
      const qty = {
        $ifNull: [
          { $convert: { input: `$${B.qty}`, to: "double", onError: null, onNull: null } },
          { $convert: { input: `$${B.qtyText}`, to: "double", onError: null, onNull: null } },
        ],
      };
      and.push({ [B.status]: "IN_STOCK" });
      and.push({ $expr: { $or: [{ $eq: [qty, null] }, { $gt: [qty, 0] }] } });
    }
    if (params.seriesPrefix?.trim()) {
      and.push({
        [B.barcode]: new RegExp(`^${escapeRegex(params.seriesPrefix.trim())}`, "i"),
      });
    }
    if (params.status) and.push({ [B.status]: params.status });
    if (params.group) and.push({ [B.groupId]: params.group });
    if (params.business) and.push({ [B.businessId]: params.business });
    const scopes = [
      ...(params.groupIds?.length ? [{ [B.groupId]: { $in: params.groupIds } }] : []),
      ...(params.businessIds?.length ? [{ [B.businessId]: { $in: params.businessIds } }] : []),
    ];
    if (scopes.length) and.push({ $or: scopes });
    if (params.uomType) and.push({ [B.uomType]: params.uomType });
    if (params.q?.trim()) {
      const rx = new RegExp(escapeRegex(params.q.trim()), "i");
      and.push({ $or: BARCODE_SEARCH_FIELDS.map((f) => ({ [f]: rx })) });
    }
    if (!and.length) return {};
    return and.length === 1 ? and[0] : { $and: and };
  }

  /** Raw docs -> domain rows. A record that cannot be mapped is logged and skipped, never fatal. */
  private hydrate(docs: AnyDoc[]): { items: BarcodeProduct[]; skipped: number } {
    let skipped = 0;
    const rows = docs.map((raw) => {
      try {
        const product = mapBarcodeLabel(raw);
        const image = barcodeImageUrl(product.barcode);
        return image ? { ...product, image } : product;
      } catch (e) {
        skipped++;
        console.warn(`[barcodeLabel] skipped record ${String(raw?._id)}: ${(e as Error).message}`);
        return null;
      }
    });
    return { items: rows.filter((r): r is BarcodeProduct => r !== null), skipped };
  }

  async list(params: BarcodeListParams): Promise<Paginated<BarcodeProduct> & { skipped: number }> {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, params.limit ?? 40));
    const match = this.match(params);
    const M = await this.M();
    const [docs, total] = await Promise.all([
      M.aggregate<AnyDoc>([
        { $match: match },
        { $sort: { _id: -1 } }, // newest first; _id is unique + indexed, so paging is stable
        { $skip: (page - 1) * limit },
        { $limit: limit },
        { $project: PROJECTION },
        ...JOIN_STAGES,
      ]),
      Object.keys(match).length ? M.countDocuments(match) : M.estimatedDocumentCount(),
    ]);
    const [{ items, skipped }, shared] = await Promise.all([
      Promise.resolve(this.hydrate(docs)),
      this.labelsPerBarcode(M, docs),
    ]);
    for (const p of items) {
      const n = shared.get(p.barcode);
      if (n && n > 1) p.barcodeLabelCount = n;
    }
    return { items, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)), skipped };
  }

  async getLabelIdsForItemGroups(groupIds: string[]): Promise<string[]> {
    if (!groupIds.length) return [];
    const connection = await this.conn();
    const rows = await connection.db!.collection("items").aggregate<{ _id: string }>([
      { $match: { group: { $in: groupIds.map(toObjectIdOrString) }, "barcodeManagement.sourceBarcodeLabel": { $type: "objectId" } } },
      { $group: { _id: "$barcodeManagement.sourceBarcodeLabel" } },
      { $lookup: { from: ERP_BARCODE_COLLECTIONS.labels, localField: "_id", foreignField: "_id", as: "label" } },
      { $match: { "label.0": { $exists: true } } },
      { $project: { _id: { $toString: "$_id" } } },
    ]).toArray();
    return rows.map((row) => row._id);
  }

  async getLabelIdsForProductTypes(
    productTypes: string[],
    subgroupId?: string,
    query?: string,
    classifications: Partial<Record<EcommerceClassification, string>> = {},
  ): Promise<string[]> {
    if (!productTypes.length) return [];
    const connection = await this.conn();
    const ecommMatch = activeEcommerceMatch(productTypes);
    if (query?.trim()) {
      const search = new RegExp(escapeRegex(query.trim()), "i");
      ecommMatch.$and = [{ $or: ["ecommItemCode", "itemCode"].map((field) => ({ [field]: search })) }];
    }
    const selectedClassifications = Object.entries(classifications)
      .filter((entry): entry is [EcommerceClassification, string] => Boolean(entry[1]?.trim()));
    const classificationProjection = selectedClassifications.length
      ? {
          byWeave: 1,
          byFabric: 1,
          byCraft: 1,
          byOccasion: 1,
          byColour: 1,
          weaveDescription: 1,
          fabricDescription: 1,
          craftDescription: 1,
          occasionDescription: 1,
          colourDescription: 1,
          attributes: 1,
        }
      : {};
    let ecommerceProducts = await connection.db!.collection<AnyDoc>(ERP_BARCODE_COLLECTIONS.ecommerceProducts)
      .find(
        ecommMatch,
        {
          projection: {
            itemId: 1,
            businessId: 1,
            erpDocumentId: 1,
            barcode: 1,
            barcodes: 1,
            ...classificationProjection,
            _id: 0,
          },
        },
      )
      .toArray();
    if (selectedClassifications.length) {
      const names = await this.classificationNames(connection, ecommerceProducts);
      ecommerceProducts = ecommerceProducts.filter((product) =>
        selectedClassifications.every(([field, selected]) => {
          const expected = selected.trim().toLocaleLowerCase();
          return ecommerceClassificationValues(product, field).some((value) =>
            (names.get(value) ?? value).toLocaleLowerCase() === expected,
          );
        }),
      );
    }
    // The storefront shows exactly what the ecommerceproduct records point at: the barcodes saved on
    // them (or a directly linked label). A record with neither shows nothing - never every label of its item.
    const directLabelIds = new Set<string>();
    const barcodeReferences: { codes: string[]; businessId?: string; itemId?: string }[] = [];
    for (const product of ecommerceProducts) {
      if (product.erpDocumentId != null) directLabelIds.add(String(product.erpDocumentId));
      const codes = savedBarcodes(product);
      if (!codes.length) continue;
      barcodeReferences.push({
        codes,
        businessId: product.businessId == null ? undefined : String(product.businessId),
        itemId: product.itemId == null ? undefined : String(product.itemId),
      });
    }
    if (!directLabelIds.size && !barcodeReferences.length) return [];
    if (subgroupId && barcodeReferences.length) {
      const itemIds = [...new Set(barcodeReferences.flatMap((reference) => (reference.itemId ? [reference.itemId] : [])))]
        .flatMap((itemId) => [itemId, toObjectIdOrString(itemId)]);
      const items = await connection.db!.collection<{ _id: ErpId }>("items")
        .find(
          { _id: { $in: itemIds }, subgroup: { $in: [subgroupId, toObjectIdOrString(subgroupId)] } },
          { projection: { _id: 1 } },
        )
        .toArray();
      const matchingItemIds = new Set(items.map((item) => String(item._id)));
      for (let i = barcodeReferences.length - 1; i >= 0; i--) {
        const itemId = barcodeReferences[i].itemId;
        if (!itemId || !matchingItemIds.has(itemId)) barcodeReferences.splice(i, 1);
      }
    }
    // ERP ids may be stored as strings or ObjectIds, so both forms are matched.
    const directFilter: Record<string, unknown> = {
      $or: [{ _id: { $in: [...directLabelIds].flatMap((id) => [id, toObjectIdOrString(id)]) } }],
    };
    const [directLabels, barcodeLabelIds] = await Promise.all([
      directLabelIds.size
        ? connection.db!.collection(ERP_BARCODE_COLLECTIONS.labels).find(directFilter, { projection: { _id: 1 } }).toArray()
        : Promise.resolve([]),
      this.labelIdsForSavedBarcodes(connection, barcodeReferences),
    ]);
    return [...new Set([...directLabels.map((label) => String(label._id)), ...barcodeLabelIds])];
  }

  /**
   * Labels for barcodes saved on e-commerce products. Barcode numbers repeat across businesses, so a
   * label in the product's own business (original or current) wins; when that business has none, the
   * other labels carrying the barcode are used (the ERP form accepts those too).
   */
  private async labelIdsForSavedBarcodes(
    connection: Connection,
    references: { codes: string[]; businessId?: string }[],
  ): Promise<string[]> {
    const codes = [...new Set(references.flatMap((reference) => reference.codes))];
    if (!codes.length) return [];
    // A barcode typed into the ERP form may differ in case ("8a1935" for 8A1935): match case-insensitively,
    // through exact variants so the barcode index is still used.
    const variants = [...new Set(codes.flatMap((code) => [code, code.toUpperCase(), code.toLowerCase()]))];
    const labels = await connection.db!.collection<AnyDoc>(ERP_BARCODE_COLLECTIONS.labels)
      .find(
        { [B.barcode]: { $in: variants } },
        { projection: { _id: 1, [B.barcode]: 1, [B.businessId]: 1, currentBusinessId: 1 } },
      )
      .toArray();
    const byCode = new Map<string, AnyDoc[]>();
    for (const label of labels) {
      const code = String(label[B.barcode] ?? "").toUpperCase();
      byCode.set(code, [...(byCode.get(code) ?? []), label]);
    }
    const ids = new Set<string>();
    for (const { codes: productCodes, businessId } of references) {
      for (const code of productCodes) {
        const candidates = byCode.get(code.toUpperCase()) ?? [];
        const own = businessId
          ? candidates.filter((label) => String(label[B.businessId] ?? "") === businessId || String(label.currentBusinessId ?? "") === businessId)
          : [];
        for (const label of own.length ? own : candidates) ids.add(String(label._id));
      }
    }
    return [...ids];
  }

  async getProductTypeClassifications(
    productTypes: string[],
  ): Promise<Partial<Record<EcommerceClassification, FacetOption[]>>> {
    if (!productTypes.length) return {};
    const connection = await this.conn();
    const products = await connection.db!.collection<AnyDoc>(ERP_BARCODE_COLLECTIONS.ecommerceProducts)
      .find(
        activeEcommerceMatch(productTypes),
        {
          projection: {
            byWeave: 1,
            byFabric: 1,
            byCraft: 1,
            byOccasion: 1,
            byColour: 1,
            weaveDescription: 1,
            fabricDescription: 1,
            craftDescription: 1,
            occasionDescription: 1,
            colourDescription: 1,
            attributes: 1,
            _id: 0,
          },
        },
      )
      .toArray();
    const names = await this.classificationNames(connection, products);
    const facets: Partial<Record<EcommerceClassification, FacetOption[]>> = {};
    for (const field of Object.keys(ECOMMERCE_CLASSIFICATIONS) as EcommerceClassification[]) {
      const counts = new Map<string, number>();
      for (const product of products) {
        const values = new Set(ecommerceClassificationValues(product, field).map((value) => names.get(value) ?? value));
        for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
      }
      facets[field] = [...counts]
        .map(([value, count]) => ({ value, label: value, count }))
        .sort((a, b) => a.label.localeCompare(b.label));
    }
    return facets;
  }

  async getProductTypeSubgroups(productTypes: string[]): Promise<FacetOption[]> {
    if (!productTypes.length) return [];
    const connection = await this.conn();
    const ecommerceProducts = await connection.db!.collection(ERP_BARCODE_COLLECTIONS.ecommerceProducts)
      .find(
        activeEcommerceMatch(productTypes),
        { projection: { itemId: 1, businessId: 1, _id: 0 } },
      )
      .toArray();
    const itemIds = [...new Set(ecommerceProducts.flatMap((product) => product.itemId == null ? [] : [String(product.itemId)]))]
      .flatMap((itemId) => [itemId, toObjectIdOrString(itemId)]);
    if (!itemIds.length) return [];
    const items = await connection.db!.collection<{ _id: ErpId; subgroup?: unknown }>("items")
      .find({ _id: { $in: itemIds }, subgroup: { $nin: [null, ""] } }, { projection: { _id: 1, subgroup: 1 } })
      .toArray();
    const counts = new Map<string, number>();
    for (const item of items) {
      if (item.subgroup == null) continue;
      const subgroupId = String(item.subgroup);
      counts.set(subgroupId, (counts.get(subgroupId) ?? 0) + 1);
    }
    if (!counts.size) return [];
    const subgroupIds = [...counts.keys()].flatMap((id) => [id, toObjectIdOrString(id)]);
    const subgroups = await connection.db!.collection<{ _id: ErpId; name?: unknown; subgroupName?: unknown }>("subgroups")
      .find({ _id: { $in: subgroupIds } }, { projection: { _id: 1, name: 1, subgroupName: 1 } })
      .toArray();
    const names = new Map(subgroups.map((subgroup) => [
      String(subgroup._id),
      typeof subgroup.name === "string" && subgroup.name.trim()
        ? subgroup.name.trim()
        : typeof subgroup.subgroupName === "string" && subgroup.subgroupName.trim()
          ? subgroup.subgroupName.trim()
          : String(subgroup._id),
    ]));
    return [...counts].map(([value, count]) => ({ value, label: names.get(value) ?? value, count }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  /**
   * Barcodes are not unique: 234 appear on several labels, sometimes for different products
   * (no unique index, even per business). One indexed query per page counts them so the UI
   * can say that web settings keyed by barcode are shared.
   */
  private async labelsPerBarcode(M: Model<AnyDoc>, docs: AnyDoc[]): Promise<Map<string, number>> {
    const barcodes = Array.from(new Set(docs.map((d) => d[B.barcode]).filter((b): b is string => typeof b === "string" && b !== "")));
    if (!barcodes.length) return new Map();
    const rows = await M.aggregate<{ _id: string; n: number }>([{ $match: { [B.barcode]: { $in: barcodes } } }, { $group: { _id: `$${B.barcode}`, n: { $sum: 1 } } }]);
    return new Map(rows.map((r) => [r._id, r.n]));
  }

  async facets(params: BarcodeListParams = {}): Promise<BarcodeFacets> {
    const M = await this.M();
    const match = this.match(params);
    const countBy = (field: string): PipelineStage.FacetPipelineStage[] => [
      { $group: { _id: `$${field}`, count: { $sum: 1 } } },
      { $match: { _id: { $nin: [null, ""] } } },
    ];
    const [res] = await M.aggregate<any>([
      ...(Object.keys(match).length ? [{ $match: match }] : []),
      {
        $facet: {
          status: [...countBy(B.status), { $sort: { count: -1 } }],
          uomType: [...countBy(B.uomType), { $sort: { count: -1 } }],
          // productgroup is per business and names repeat ("SAREES" exists in several), so the owning business is fetched too.
          group: [
            ...countBy(B.groupId),
            {
              $lookup: {
                from: ERP_BARCODE_COLLECTIONS.productGroups,
                let: { ref: "$_id" },
                pipeline: [
                  { $match: { $expr: { $eq: ["$_id", { $convert: { input: "$$ref", to: "objectId", onError: null, onNull: null } }] } } },
                  { $project: { _id: 0, n: `$${PRODUCT_GROUP_FIELDS.name}`, b: `$${PRODUCT_GROUP_FIELDS.businessId}` } },
                  { $limit: 1 },
                ],
                as: "pg",
              },
            },
            { $set: { pg: { $first: "$pg" } } },
            { $lookup: { from: ERP_BARCODE_COLLECTIONS.businesses, localField: "pg.b", foreignField: "_id", as: "biz" } },
            { $project: { count: 1, label: "$pg.n", business: { $first: `$biz.${BUSINESS_FIELDS.name}` } } },
          ],
          business: [...countBy(B.businessId), ...(lookupName(ERP_BARCODE_COLLECTIONS.businesses, "_id", BUSINESS_FIELDS.name, "label") as PipelineStage.FacetPipelineStage[])],
          total: [{ $count: "n" }],
        },
      },
    ]);
    type Row = { _id: unknown; count: number; label?: string; business?: string };
    const opt = (r: Row, label?: string): FacetOption => ({ value: String(r._id), label: label ?? String(r._id), count: r.count });
    const byLabel = (a: FacetOption, b: FacetOption) => a.label.localeCompare(b.label);
    // Group ids with no productgroup document (import leftovers like "pc-86") cannot be named, so they are not offered.
    const groups: Row[] = (res?.group ?? []).filter((r: Row) => r.label);
    const nameUses = new Map<string, number>();
    for (const r of groups) nameUses.set(r.label!, (nameUses.get(r.label!) ?? 0) + 1);
    return {
      status: (res?.status ?? []).map((r: Row) => opt(r)),
      uomType: (res?.uomType ?? []).map((r: Row) => opt(r)),
      group: groups.map((r) => opt(r, nameUses.get(r.label!)! > 1 ? `${r.label} · ${r.business ?? "unlisted business"}` : r.label)).sort(byLabel),
      business: (res?.business ?? []).map((r: Row) => opt(r, r.label ?? `Unlisted business ·${String(r._id).slice(-6)}`)).sort(byLabel),
      total: res?.total?.[0]?.n ?? 0,
    };
  }

  async getByBarcode(barcode: string): Promise<BarcodeProduct | null> {
    const M = await this.M();
    const doc = await M.findOne({ [B.barcode]: barcode }, PROJECTION).sort({ _id: -1 }).lean<AnyDoc>();
    if (!doc) return null;
    try {
      return mapBarcodeLabel(doc);
    } catch {
      return null;
    }
  }

  async getByBarcodes(barcodes: string[]): Promise<BarcodeProduct[]> {
    const uniqueBarcodes = Array.from(new Set(barcodes.filter(Boolean)));
    if (!uniqueBarcodes.length) return [];
    const M = await this.M();
    const docs = await M.aggregate<AnyDoc>([
      { $match: { [B.barcode]: { $in: uniqueBarcodes } } },
      { $sort: { _id: -1 } },
      { $project: PROJECTION },
      ...JOIN_STAGES,
    ]);
    const { items } = this.hydrate(docs);
    const byBarcode = new Map<string, BarcodeProduct>();
    for (const item of items) if (!byBarcode.has(item.barcode)) byBarcode.set(item.barcode, item);
    return uniqueBarcodes.flatMap((barcode) => {
      const item = byBarcode.get(barcode);
      return item ? [item] : [];
    });
  }
}
