# RetailERP integration guide

Woven Essence reads **master data** (products, categories, stores, stock, price) from
RetailERP and never writes to it. Everything the website itself owns (carts,
wishlists, web orders, banners, menus, CMS, settings, reviews, audit log) lives in a
separate database. Switching between the seeded mock database and the real ERP is a
matter of three environment variables and one file.

```
DATA_SOURCE=erp
ERP_MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.e3s8dbr.mongodb.net
ERP_DB_NAME=grooretailerp1
```

| Concern | Where it lives | Mode `mock` | Mode `erp` |
| --- | --- | --- | --- |
| Products, categories, stores | `ERP_DB_NAME` (master connection) | seeded copy in `WEB_DB_NAME`, writable by `npm run seed` | RetailERP, **read-only** (`readOnlyGuard` throws on any write) |
| Field names | `src/lib/erp-mapping.ts` | same | same |
| Carts, wishlists, website checkout orders, banners, menu, CMS, settings, reviews, admin users, audit | `WEB_DB_NAME` (web connection) | writable | writable |
| Admin → Orders | `ERP_DB_NAME.orders` (RetailERP online orders) | RetailERP connection, read-only | RetailERP connection, read-only |

Admin → Settings keeps editable storefront configuration in the web database and
shows live, read-only RetailERP counts for active items, inventory, orders and
customers. It also reads the ERP `sitesettings`, `storefrontSettings` and active
`branches` collections for a live settings snapshot and branch selector. The ERP
snapshot refreshes automatically; website-owned settings remain writable only in
the web database, and ERP connection errors are reported without preventing
changes to website-owned settings.

> **Admin → Products already reads real RetailERP data** from `grooretailerp1.barcodeLabel`,
> whatever `DATA_SOURCE` is set to. See [barcodeLabel-product-mapping.md](barcodeLabel-product-mapping.md)
> for the verified field names, relationships and image rules. The storefront still follows
> `DATA_SOURCE` and the placeholder `PRODUCT_FIELDS` below.
>
> The Products edit drawer also reads RetailERP `ecommerceproduct`, joined to each
> `barcodeLabel` by `itemId` and `businessId`. Its `displayName`, pricing overrides,
> descriptions, publication flags, SEO values and classification references prefill the
> editor. Edits are saved to the website-owned `productWebMeta` overlay; RetailERP remains
> read-only from the website.

### Business e-commerce export

An authenticated, read-only JSON export for one ERP business is available at:

```text
GET /api/v1/admin/erp/business-export?businessId=<24-character-business-id>&limit=5000
```

It returns the matching ERP barcode labels, their website-owned `productWebMeta` overlay,
unique classification values (`byWeave`, `byFabric`, `byCraft`, `byOccasion`, `byColour`),
and counts for products returned, items with e-commerce metadata, and items with `byFabric`
populated. E-commerce metadata counts a label when it has at least one non-empty editable
website product field (or is explicitly inactive); the schema's default `isActive: true` alone
does not count. Classification values are split on commas, trimmed and deduplicated. Counts
are per barcode-label row; multiple labels sharing a barcode each count as an item.

The endpoint requires the application's own admin session with `products:read`, and uses
`ERP_MONGODB_URI` / `ERP_DB_NAME` for RetailERP plus `MONGODB_URI` / `WEB_DB_NAME` for the
website metadata. `limit` is capped at 5,000; `meta.truncated` indicates if more ERP records
exist for that business. It does not proxy requests or use cookies for `erp.wovenessence.in`.

Admin → Reviews reads live product-level counts and ratings from RetailERP `items.reviews`.
RetailERP stores review settings and aggregates only, not individual customer reviews or
moderation records; website-submitted reviews remain in the separate web database.

The homepage's Sarees, Fabrics, Plain Fabrics and Dupatta category tiles link to
paginated catalogues built from ERP barcode labels. Category membership comes from
`ecommerceproduct.productType` and an active e-commerce status, joined to `barcodeLabel` by
the exact `itemId` and `businessId` pair. Subgroup filters are populated from each
matching ERP item's `subgroup` reference. The catalogue then applies ERP stock
status to mark unavailable labels while still displaying their barcodes and images.
Search also matches the e-commerce item code. A matching e-commerce product's image is used when
available and served from an allowed ERP/Spaces host; otherwise the storefront falls back to the
barcode-derived ERP image URL. Product-Ecom display name, description, item code and
weave/fabric/craft/occasion/colour classifications are also shown on the cards; the classification
filters use live active e-commerce records and their linked ERP classification options.
This works even when the generic `products` collection is empty or `DATA_SOURCE=mock`.

## 1. Discover the real field names

The sandbox this project was scaffolded in could not reach Atlas, so every field in
`erp-mapping.ts` is a **placeholder** marked `// TODO: verify against RetailERP`.
Run the introspection script from a machine that can reach the cluster:

```bash
npm run erp:introspect -- "mongodb+srv://<user>:<password>@cluster0.e3s8dbr.mongodb.net" grooretailerp1
# add --examples to include (non-PII) sample values per field
```

It writes `erp-introspection.json` containing, for every collection: document count,
each field path, observed types and coverage %, plus a best-guess of which collections
are products / categories / orders / customers / stores. PII-looking fields (mobile,
email, address, gst) are never sampled.

## 2. Update the mapping — the only file that changes

`src/lib/erp-mapping.ts` is the single translation layer. UI code and repositories
only know the **left-hand keys**; the right-hand values are RetailERP paths.

```ts
export const ERP_COLLECTIONS = { products: "products", categories: "categories", ... };

export const PRODUCT_FIELDS = {
  name: "productName",   // ← change to whatever the introspection shows, e.g. "item_name"
  motif: "pattern",      // dotted paths work too: "attributes.pattern"
  images: "images",      // string[], {url}[], {path}[] and csv strings are all handled
  isActive: "isActive",  // true/false, 1/0, "Y"/"N", "active" all handled
  ...
};
```

Things to check after introspection:

- **`PRODUCT_CATEGORY_REF`** — does `products.category` hold the category *name*,
  its `_id`, or a slug? Set to `"name" | "id" | "slug"`.
- **`ACTIVE_PRODUCT_QUERY` / `ACTIVE_CATEGORY_QUERY`** — adjust if the ERP uses a
  `status` field instead of a boolean.
- **`PRODUCT_FILTER_FIELDS`** — which ERP paths feed the facet sidebar
  (fabric, weave, craft, occasion, colour, motif, border).
- **`productSort`** — which field represents "newest"/"best selling".
- Stock: if RetailERP keeps stock per store in a separate collection, add a
  `stockQty` lookup in `MongoProductRepository` and keep the UI key unchanged.
- Images: add the ERP/CDN hostname to `images.remotePatterns` in `next.config.ts`.

Nothing else in the codebase needs to change: `defineFromMapping()` builds the
Mongoose schemas from these tables (with `strict: false`, so unknown ERP fields are
preserved), and every repository query is expressed in UI keys and translated at
runtime.

## 3. Verify the connection

```bash
DATA_SOURCE=erp npm run dev
curl http://localhost:3000/api/v1/erp/status
```

The endpoint returns a ping (db name, collection counts, latency), the active mapping
tables and a sample product mapped through `mapProduct()` so you can eyeball the
result. The same check is wired to the **Settings → Integrations → Test RetailERP
connection** button in the admin panel.

## 4. Create website metadata for ERP products

RetailERP has no slugs or SEO fields. They live in the website-owned
`productWebMeta` collection, keyed by SKU:

```bash
DATA_SOURCE=erp npm run erp:sync-meta
```

This creates a `productWebMeta` row (`slug = slugify(name)-slugify(sku)`) for every
active ERP product that does not have one, and stamps `siteSettings.erp.lastSyncAt`.
It is idempotent and safe to run on a schedule (the admin Inventory page has a
"Re-sync" button that calls the same function). Existing slugs are never rewritten,
so URLs stay stable when a product is renamed in the ERP.

## 5. Read-only guarantee

- `getMasterConnection()` opens a **separate** Mongoose connection to `ERP_DB_NAME`.
- Every ERP model is registered with `readOnlyGuard()`, which rejects `save`,
  `insertMany`, `updateOne/Many`, `findOneAndUpdate`, `deleteOne/Many`,
  `replaceOne` and `bulkWrite` when `DATA_SOURCE=erp`.
- `npm run seed` refuses to run in erp mode.
- Use a MongoDB user with the `read` role on `grooretailerp1` for defence in depth.

## 6. Website orders → ERP (future write-back)

Website checkout orders are stored in `WEB_DB_NAME.orders` **using RetailERP field names**
(`orderNo`, `customerId`, `items[].sku`, `netAmount`, `paymentMode`, ...) via
`buildOrderDoc()`. When RetailERP exposes a sales-order API or an import
collection, the sync job only has to copy documents — no re-mapping. The same holds
for `customers` (`customerName`, `mobile`, `addresses[]`, `loyaltyPoints`).

The Admin → Orders page reads the verified online-order collection
`ERP_DB_NAME.orders` directly. ERP `orderNumber`, `lines`, `amounts`, `payment`,
`shippingAddress`, `status`, and `timeline` are mapped to the admin order view.
The view is read-only because ERP status/tracking write-back is not configured.
Website checkout orders in `WEB_DB_NAME.orders` are not automatically synced into
RetailERP and therefore do not appear in this ERP-backed admin list.

The dashboard uses the same RetailERP orders for sales totals, status counts,
best sellers, latest orders and out-for-delivery orders. Customer totals come from
`ERP_DB_NAME.customers`, and stock counts come from active `ERP_DB_NAME.items`
using `inventory.availableStock` (falling back to `inventory.currentStock`).
Admin → Inventory reads and aggregates active item stock directly from that same
RetailERP `items` collection on every API request; low/out-of-stock rows and summary
counts never fall back to the mock catalogue. The page refreshes the live query once
per minute. Alert rows resolve ERP item code, barcode, and description through
`items.barcodeManagement.sourceBarcodeLabel` → `barcodeLabel._id`, using the label's
`itemCode` and `barcodeNo` fields as fallbacks to the item master's
`identity.itemCode` and `identity.productName` fields. The inventory barcode column
shows only the linked label's original `barcodeNo`; it does not substitute the
item's `barcodeManagement.internalBarcode` or another identifier when no label is linked.
Inventory category starts with `identity.productType`; explicit `PLAIN FABRIC(S)` and
`FABRIC(S)` labels in the ERP product name take precedence when the generic ERP type
does not match the item.
MongoDB document IDs are never shown as item codes or barcodes. Its
separate web-meta sync only updates website-owned product metadata.
Reviews, enquiries and abandoned carts are website-owned activity and continue to
be counted from `WEB_DB_NAME`.

## 7. Mapping a collection that does not exist yet

If the ERP splits data differently (e.g. `item_master` + `item_stock` + `item_price`):

1. Add the collection names to `ERP_COLLECTIONS`.
2. Add a Mongoose model in `src/models/erp/` (use `defineFromMapping` or a plain schema).
3. In `MongoProductRepository`, add an aggregation `$lookup` so the pipeline yields a
   single document that satisfies `PRODUCT_FIELDS`. The rest of the app is untouched.

## 8. What the admin panel can and cannot change

| Data | Owner | Editable in admin? |
| --- | --- | --- |
| ERP product name, price, MRP, GST, stock, attributes, images | RetailERP | No — source data remains read-only |
| Product display name, item name, active flag, slug, SEO, featured flag, extra images | Website (`productWebMeta`) | Yes — Products → row → Edit; inactive barcode items are omitted from storefront catalogs |
| Categories, stores | RetailERP | No |
| Menu, banners, collections, homepage sections, CMS, testimonials, coupons | Website | Yes |
| Orders, customers (website registrations) | Website, stored with ERP field names | Yes (status workflow, AWB) |

Stock and prices are **never cached**: every product list, cart hydration and checkout re-reads master data,
so the site can never sell a SKU RetailERP has already sold in-store.

## 9. Runtime switches

- `DATA_SOURCE=erp` + `ERP_MONGODB_URI` / `ERP_DB_NAME` — restart the app after changing.
- Admin → Inventory & sync → **Test ERP connection** calls `POST /api/v1/admin/erp/test` (pings, lists collections).
- Admin → Inventory & sync → **Re-sync web meta** calls `POST /api/v1/admin/erp/sync-meta` (same as `npm run erp:sync-meta`).
- `GET /api/v1/erp/status` is safe to expose to monitoring.
