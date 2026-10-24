# barcodeLabel → Admin Products mapping

Admin → Products (`/admin/products`) lists RetailERP **barcode labels**. Every field name below was
read from real documents in `grooretailerp1.barcodeLabel` on 2026-10-01 (27,487 documents; field
coverage from a 3,000-document sample, counts from full-collection aggregations).

| | |
| --- | --- |
| Database | `grooretailerp1` (env `ERP_MONGODB_URI` / alias `ERP_MONGO_URI`, `ERP_DB_NAME`) |
| Collection | `barcodeLabel` — read-only from the website |
| Code | mapping `src/lib/erp-mapping.ts` (`BARCODE_LABEL_FIELDS`, `mapBarcodeLabel`), images `src/lib/erp-images.ts`, queries `src/repositories/mongo/barcode-label.repository.ts` |
| API | `GET /api/v1/admin/products`, `GET /api/v1/admin/products/facets`, `PATCH /api/v1/admin/products` (website overlay only) — all behind `requireAdmin("products:*")` |

The Products API also looks up the ERP `ecommerceProducts` catalog by the exact label ID:
`ecommerceProducts.erpDocumentId` → `barcodeLabel._id`. It returns this as `erpEcommerce`
alongside the existing website `web` overlay. The edit drawer prefills from website overrides
first, then ERP e-commerce values, then the barcode-label data. If an ERP catalog record is
found, the drawer confirms that it was fetched; if not, the drawer remains editable and says
that no ERP e-commerce record was found. Product edits in this app continue to save only to
the website-owned `productWebMeta` collection; this app does not write to RetailERP.

## What a row is

One `barcodeLabel` document = one printed label for one sellable unit: a unique piece
(`batchType: "unique"`, 20,433) or a batch such as a fabric roll (`batchType: "batch"`, 7,054).
The page is therefore **barcode-oriented**: one row per document.

- `itemCode` equals `barcodeNo` on 21,098 labels. On the rest it is a shared item code
  (`FX-CRB` alone covers 1,540 labels), so it is not a product key.
- The ERP's own e-commerce layer also works per label: `ecommerceproducts.erpRef.barcodeLabelId`,
  `ecommerceProducts.erpDocumentId` and `items.barcodeManagement.sourceBarcodeLabel` all point at
  `barcodeLabel._id`.
- Barcodes are **not unique**. No `barcodeLabel` index is unique, including
  `barcodeNo_1_businessId_1`. 234 barcodes appear on more than one document (287 extra):
  - 212 of them span businesses;
  - 35 (barcode, business) pairs repeat inside one business (106 documents).
- Many of these duplicates are different products: 110 of the cross-business groups and 27 of
  the same-business groups have different descriptions.
- Each document is its own row. The row shows "on N labels", and the drawer warns that the
  website's overlay (`productWebMeta`, keyed by barcode) is shared by all of them.

## Field mapping

| UI field | MongoDB source | Coverage | Transformation |
| --- | --- | --- | --- |
| Row id | `_id` | 100% | hex string |
| Barcode | `barcodeNo` | 100% | none; drawn as Code 128 (set B) SVG — values are 4–10 printable ASCII chars |
| Item code | `itemCode` | 100% | none |
| Old barcode | `oldBarcode` | 87% | hidden when equal to `barcodeNo` |
| Product name | `supplierDescription` → `printDescription` → `itemName` → `itemCode` → `barcodeNo` | 100% / 99% / 23% | first non-empty |
| Item name | `itemName` | 23% | hidden when equal to the name |
| Print description | `printDescription` | 99% | hidden when equal to the name |
| Group | `groupId` → `productgroup._id` → `productgroup.name` | 20,798 resolve | `$lookup`; `groupId` is a hex string. Groups are per business and 10 names repeat, so the filter shows "SAREES · TEMPLE FABRICS" when a name is ambiguous |
| Business | `businessId` → `business._id` → `business.name` | 27,447 resolve | `$lookup`; hex string |
| Quantity | `qtyNum` (fallback `qty`) | 100% | rounded to 3 decimals (`0.04999999999999999` → `0.05`); `qty` disagrees with `qtyNum` on 1,146 docs, `qtyNum` wins |
| UOM | `uom` (fallback `uomType`) | 24% / 100% | none |
| Price | `retailPrice` | 100% | string or number → number (the RetailERP backend also prices from `retailPrice`) |
| Offer price | `offerPrice` | 23% | shown only when > 0 |
| HSN / GST % | `hsn` / `gst` | 100% / 24% | GST → number |
| Status | `status` | 100% | raw value; `IN_STOCK` 27,419 · `SOLD` 51 · `VOID` 7 · `IN_TRANSIT` 7 · `HISTORY` 3 |
| Batch type, GRC no. | `batchType`, `grcNo` | 100%, 23% | none |
| Image | `imageUrl`, then `filePath` | 86% non-empty | see below |
| Created / updated | `createdAt`, `updatedAt` | 100% | ISO string |

Empty values are omitted from the API response, so the UI never prints `undefined`, `null` or `N/A`.

## Images

For storefront category cards, a matching active `ecommerceproduct` image (`image`, `images` or
`imageUrl`) is preferred. It is matched by the same exact `itemId` and `businessId` pair as the
category entry, normalized using the configured ERP image base/Spaces settings, and accepted only
from an allowed image host. If it is absent or unusable, the card falls back to
`https://erp.wovenessence.in/august_8A_images/<barcode>.jpg`, built from the barcode. The card
shows its photo-unavailable state if that fallback cannot load.

The `barcodeLabel.imageUrl` and `barcodeLabel.filePath` fields are not used as storefront image
sources; their values are summarized below. The barcode URL remains the fallback for these records.

| Stored ERP image value | Docs | Storefront handling |
| --- | ---: | --- |
| `https://templeimg.blr1.digitaloceanspaces.com/<key>?X-Amz-…` | 15,593 | Not used from barcode labels; an allowed matching e-commerce image can use the configured Spaces host |
| `/august_8A_images/<barcode>.jpg` | 3,136 | Not used as a stored barcode-label value; URL is generated from the label barcode |
| `data:image/jpeg;base64,…` | 4,768 | Not used from barcode labels; an e-commerce image may use a supported data URI |
| `/api/files/<hash>.jpg` | 5 | Not used from barcode labels; barcode URL is used instead |
| `http://wovenessencemobile.etpl.ai/uploads/…` | 11 | Not used from barcode labels; barcode URL is used instead |
| empty | 3,975 | URL is generated from the label barcode |

Barcode product cards load the JPEG directly from the ERP host and directory above; they do not use
`next/image` optimization or redirect through an image proxy.

## Relationships checked and not used

| Reference | Finding | Decision |
| --- | --- | --- |
| `itemId` → `item._id` | 3,382 labels; `item.name` equals `barcodeLabel.itemName` on all 3,381 that join; `item.image` is always empty | not joined (no extra data) |
| `productImage` collection | 10 documents, keyed by `barcodeGenerated` (set on 13% of labels); 7 hold an `imageUrl` on the dead `wovenessencemobile.etpl.ai` host, 3 hold inline `imageData` | not joined (no loadable image to gain) |
| `supplierId` | joined to `supplier._id` (ObjectId) or `supplier.accountNo` | supplier code (`accountNo`) and name (`businessName`, fallback `shortName`) are projected into the admin edit drawer; unresolved values are omitted |
| `groupId` like `mtr-6`, `pc-86` | 722 labels, no `productgroup` document | no group shown; not offered as a filter |
| `businessId` `6aabd7c858bc2f2790eba600` | 40 labels, not in `business` | filter label "Unlisted business ·eba600" |

## Storefront category groups

Storefront category membership follows the ERP e-commerce product classification:

| Storefront category | `ecommerceproduct.productType` |
| --- | --- |
| Sarees | `SAREES` |
| Fabrics | `FABRICS` |
| Plain Fabrics | `PLAIN FABRICS` |
| Dupatta | `DUPATTA` |

Active e-commerce products (active `status` or `isActive: true`) are included, including records not marked as published, because
unpublished entries were explicitly requested for the storefront. Their barcode labels are resolved
by the exact `itemId` and `businessId` pair, the same references used by the admin product editor.
This keeps category assignment consistent with RetailERP's Product-Ecom screen; the public
catalogue does not infer categories from barcode prefixes, descriptions, item codes or a similarly
named inventory group. Product-Ecom supplies the storefront display name, description, item code,
classification names and image when available; the barcode label remains the source for barcode,
price and stock, and supplies the fallback image URL. The Weave, Fabric, Craft, Occasion and Color
filters resolve the e-commerce classification references through `productclassificationoption`.
E-commerce item codes are searchable and resolve to their linked barcode labels. Subgroup
filters are loaded from the matching ERP `items.subgroup` references and resolved
through `subgroups._id`; selecting a subgroup filters the same e-commerce products, rather
than guessing from the barcode label's older group field. Existing stock checks still exclude sold,
void and unavailable labels are still visible but cannot be added to the bag. No ERP or e-commerce
records are written.

## Queries

- **List:** one aggregation —
  `$match → $sort {_id:-1} → $skip → $limit → $project → $lookup productgroup → $lookup business`.
  Lookups run only for the page, two per row, so there is no N+1. In parallel,
  `countDocuments(match)` (or `estimatedDocumentCount()` when unfiltered).
- **Search:** case-insensitive, regex-escaped substring over `barcodeNo`, `itemCode`,
  `oldBarcode`, `itemName`, `supplierDescription`, `printDescription`, `designNo`.
- **Filters:** exact match on `status`, `groupId`, `businessId`, `uomType`.
- **Facets:** a single `$facet` with `$group` per filter, plus name lookups.
- Measured on Atlas (44 MB, avg 1.6 KB per document): page ≈ 100 ms, search count ≈ 230 ms,
  facets ≈ 150 ms.
- Existing indexes used: `_id`, `status_1`, `businessId_1`. No index was created — the website
  must not write to the ERP database (the model sets `autoIndex: false`, `autoCreate: false` and an
  always-on read-only guard).
- If the collection grows past ~250k documents, ask the ERP team for an index on `groupId` and a
  text index for search.
