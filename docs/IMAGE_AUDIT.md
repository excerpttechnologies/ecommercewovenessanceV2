# Product image availability audit

## Why this document exists

Plain Fabrics reported `total = 602` but rendered `items = 0`. The count is computed by
MongoDB (`barcodeLabels.list` → `countDocuments`) using the catalog filter (published ERP
product type, `IN_STOCK`, quantity > 4.5 m for fabrics, web `isActive !== false`). The old code
then called `withAvailableImages()` on the returned rows and **silently dropped** every row whose
photo could not be loaded. Plain-fabric barcodes such as `100231` and `102998` have no image at
any candidate URL, so every eligible row was removed while the count stayed at 602.

## Fix

`withAvailableImages()` no longer removes rows. It keeps the row and marks it:

- `image: undefined, imageIssue: "unavailable"` when the image is definitely missing (404/403);
- `image: undefined, imageIssue: "none"` when no image field ever existed;
- the original `image` when the probe succeeded or could not be resolved (network/5xx — the
  browser retries and falls back).

The existing grid component (`src/components/products/barcode-product-grid.tsx`) already renders
`photo-unavailable.webp` for an item without `src` and on `onError`, so the placeholder appears
and **the list length now agrees with the count**. Probing is bounded by `IMAGE_PROBE_BUDGET_MS`
(default 1200 ms): past the deadline the URL is passed to the browser without a server-side
check, so one slow image host cannot stall the whole page.

## How to audit images

```bash
# First 50 eligible items per main group
npx tsx scripts/audit-images.ts

# A full plain-fabrics audit, with a CSV for merchandising
npx tsx scripts/audit-images.ts --groups plain-fabrics --limit 700 --csv docs/image-audit.csv

# Several groups, more parallelism
npx tsx scripts/audit-images.ts --groups sarees,fabrics,plain-fabrics,dupatta --limit 200 --concurrency 12
```

The script:

1. loads each group's eligible catalogue with the **same** filters the storefront uses;
2. builds the exact candidate URL list (`erp-images.ts: barcodeImageCandidates`);
3. probes each URL with the shared ranged-GET prober (`probeImage`);
4. prints `eligible / sampled / withImage / withoutImage` and the first missing barcodes;
5. exits with status 1 if any sampled product has no loadable image (usable as a content gate).

It makes no database writes and logs only barcodes and image URLs — never customer data.
Results are also available from the app's own logs: `PERF_LOG=1` emits
`[perf] scope=catalog group=… items=… total=…` with timings for each category.

## Known live-data observations (2026-11-19)

| Check | Result |
|-------|--------|
| `10A2462` (saree) | Resolves at `https://templeimg.blr1.digitaloceanspaces.com/1/1/barcodes/10A2462.jpg` |
| `100231`, `102998` (plain fabrics) | No image at any candidate URL (Spaces barcode path, ERP relative path, legacy host) |
| Eligible plain-fabric rows | 609 (direct query), of which web overlay hides 8 → 601; repository count 602 at measurement time |

These are content/merchandising facts from the live ERP, not application bugs. The application
must not pretend an image exists; it now shows the placeholder instead of an empty list.

## Remediation options (for the merchandising team, not code)

1. Upload barcode photos for the plain-fabric SKUs to the public Spaces path
   `1/1/barcodes/<barcode>.jpg`.
2. Or add a real photo to each ERP product's `image` / `additionalImages`.
3. Or add a website `productWebMeta.galleryPrimaryImage` for those SKUs.
4. Only as a last resort, set `isActive: false` to hide a SKU deliberately (this changes the DB
   count as well, unlike the old client-side drop).

## Placeholder

`public/photo-unavailable.webp` is used by `barcode-product-grid.tsx` when `item.image` is absent
or `onError` fires. No new asset is required.
