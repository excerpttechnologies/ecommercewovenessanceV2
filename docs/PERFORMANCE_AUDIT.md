# Performance Audit — Woven Essence storefront

Date: 2026-11-19
Stack: Next.js 15.5.4 (App Router), React 19.1.1, Mongoose 8.7.0, MongoDB (web + RetailERP), Node 20
Scope: storefront read path (home, collections, product, header), API envelope, ERP image pipeline.

---

## 1. Executive summary

The storefront is entirely server-rendered on every request (`force-dynamic`) against two MongoDB
clusters and a remote ERP image host. The measured/code-verified hot spots were not React rendering
but **repeated identical metadata work per request**:

| # | Root cause | Effect per request | Status |
|---|-----------|--------------------|--------|
| 1 | Header ERP filter columns re-scanned `producttypes` + `ecommerceproduct` for 4 categories on **every page** | 4 full config scans + 4 classification scans on every storefront route | Fixed with 60 s TTL |
| 2 | Homepage called `getErpHomeSections` **3×** (limits 8 / 10 / 8) over 11 groups | ~33 group catalogs computed, ~4 sections rendered | Fixed: 1 fan-out, sliced per block |
| 3 | Homepage called `getErpFilterChips("occasion")` twice | 22 group-facet sets instead of 11 | Fixed: shared promise + TTL |
| 4 | `inactiveBarcodes()` full `productwebmetas` scan on every catalog/facet call | repeated per group and per page | Fixed: 60 s TTL + admin invalidation |
| 5 | Filter config / facets / filter options recomputed per listing request | repeated ERP scans for every category page | Fixed: 60 s TTL |
| 6 | No API timing/size logging | no production latency data | Added safe `[perf]` logs |

**What was deliberately not changed:** product/stock queries, cart, checkout, Razorpay, shipping,
WhatsApp, auth, product visibility semantics, per-barcode image mapping, and the dynamic rendering
architecture. Catalogue rows (prices, availability) are still read live on every request.

**Honest measurement limit:** this environment has no `.env`, no MongoDB and no ERP credentials, so
Lighthouse, real TTFB and `explain()` output could not be produced here. Section 6 separates
*measured* numbers (build output, cache microbenchmark, runtime API sample, image re-encode test,
call counts) from *projected* savings. Production numbers must be captured with `PERF_LOG=1`.

---

## 2. Scope and constraints respected

- No dependency upgrades, no framework or rendering-architecture change.
- No mock/hardcoded product data, no duplicate APIs.
- No cache of carts, wishlists, orders, checkout/payment state, auth, prices or stock quantities.
- No cross-user or authenticated response caching; nothing keyed by cookies.
- ERP integration, visibility rules, per-barcode images, checkout maths, Razorpay verification,
  WhatsApp notifications and shipping logic untouched.
- Logs contain only method, pathname, status, duration, byte count and aggregate timings — no
  query strings, headers, cookies, tokens, OTPs, passwords, payment data or customer PII.

---

## 3. Method and environment

1. Read the full storefront request path: layout → header/menu → page → data loaders → repositories
   → ERP image resolver → API wrappers.
2. Traced duplicate calls per request (React `cache()` only dedupes *within* one render; nothing was
   shared across requests).
3. Checked `package.json`, `Dockerfile`, `next.config.ts` to understand build/runtime constraints
   (the Docker build runs `next build` with no env/DB, which is why `force-dynamic` must stay).
4. Applied the smallest data-layer changes that remove duplicate work without caching transactional
   or availability-critical data.
5. Validated with `tsc --noEmit`, `vitest`, `next build`, and a `next start` smoke test of the API
   logging.

Environment limitation: `MONGODB_URI` / `ERP_MONGODB_URI` were unset and nothing listened on
`localhost:27017`; `connect ECONNREFUSED` was observed. No real-data timings are claimed.

---

## 4. Root causes (with evidence)

### 4.1 Every storefront route is dynamic
`src/app/(storefront)/layout.tsx` sets `export const dynamic = "force-dynamic"` and reads settings.
This is required: the Dockerfile builds without env/DB, so prerendering would fail, and live
stock/price correctness is required. Consequence: every request repeats the DB/ERP work below.
**Left unchanged intentionally.**

### 4.2 Header menu ERP fan-out (all pages)
`getMenu()` → `withErpFilterColumns()` (`src/lib/erp-menu.ts`) → for each top-level ERP category
(`sarees`, `fabrics`, `plain-fabrics`, `dupatta`) calls `getStorefrontClassificationFacets()`.
Each call ran:
- a full `producttypes` scan with projection (`getStorefrontFilterConfig`), and
- a full `ecommerceproduct` scan for the product types (`getProductTypeClassifications`).

Because those functions were only wrapped in React `cache()`, this work was repeated on **every
request of every storefront route**, on the critical path of the header.

### 4.3 Homepage fan-out
`src/app/(storefront)/page.tsx` called `getErpHomeSections(limit)` in three different blocks with
different limits (8, `ceil(limit/5)*5` = 10, 8). React `cache()` keys on arguments, so the three
calls did not share work. Each call fans out over 11 storefront groups
(`getBarcodeImageCatalog` per group, including ERP details and image probes):
**~33 group catalog computations to render ~4 sections**. `getErpFilterChips("occasion")` was also
called twice (categories strip + occasions strip); each call walks all 11 groups.

### 4.4 Repeated metadata scans
- `inactiveBarcodes()`: `productwebmetas.find({isActive:false})` on every catalog and every facet
  computation (multiple times per listing request).
- `getStorefrontFilterConfig`: full `producttypes` scan per group.
- `getStorefrontClassificationFacets`: per group, per request.
- `getBarcodeImageFilterOptions`: scope + facets + subgroups per listing request.

### 4.5 Per-item image probing
`probeImage()` performs one ranged GET per candidate image with a 6 h success / 15 min failure
cache (`src/lib/erp-images.ts`). Cold catalogs therefore issue many outbound requests; a page-wide
`deadlineAt` parameter exists on `resolveRecordImage` but is not used. **Not changed** (image
correctness is per barcode); listed as remaining work.

### 4.6 Product page loads a 48-item catalogue
`/collections/[slug]/[barcode]` loads 48 products (with ERP details and probes) to build the related
row and previous/next links. Reducing it would change navigation, so it was left alone.

### 4.7 Client extras
Header mounts `useCart` + `useWishlist` on every page load (guests receive cheap empty responses;
React Query `staleTime` is already 30 s). Hero carousel uses three large source PNGs (1.47–2.15 MB)
with `next/image` (`priority` only on slide 1); `sharp` is installed, so the optimizer serves much
smaller variants. Source sizes still cost optimizer CPU/disk and image build size.

### 4.8 No indexes managed by the app
ERP collections are accessed through the raw driver; the app creates no indexes. Barcode/product-type
lookups rely on whatever indexes exist in the ERP database. **Needs DBA review**, not changed here.

---

## 5. Changes made

### New modules

**`src/lib/cache.ts`** — process-wide TTL cache for read-only, non-user data.
- read-through, TTL per key, in-flight promise sharing (concurrent misses run once);
- failures are never cached;
- `invalidateCache(prefix)` for admin edits;
- hard cap of 500 keys with expiry pruning;
- stored in `globalThis` so dev hot-reload / repeated imports reuse it.

**`src/lib/perf.ts`** — instrumentation.
- `withPerf` / `measureDb` / `measureExternal` via `AsyncLocalStorage`;
- `logPerf` emits one `[perf] scope=… key=value` line;
- logs only when `PERF_LOG=1` or the block exceeds `PERF_SLOW_MS` (default 1000 ms);
- timings/counts only; no request or customer data.

### Changed files

| File | Change |
|------|--------|
| `src/lib/barcode-image-series.ts` | 60 s TTL on `getStorefrontFilterConfig`, `getStorefrontClassificationFacets`, `getBarcodeImageFilterOptions`, `getErpFilterChips`, `inactiveBarcodes`; DB/external timing around config, scope, list, ERP details, overrides and image probes; `[perf] scope=catalog` and `scope=home-sections` logs |
| `src/app/(storefront)/page.tsx` | One `getErpHomeSections(maxLimit)` shared by curated collections / new arrivals / Instagram, with per-block slicing preserving each block's previous limit; one shared promise per chip type |
| `src/lib/api/response.ts` | API timing: method + pathname, status, ms, response bytes (lazy size, no body cloning); logs every request when `PERF_LOG=1`, otherwise slow/error requests |
| `src/app/api/v1/admin/products/route.ts` | Invalidates `web:inactive-barcodes` when an admin changes a product's `isActive` |
| `src/lib/env.ts` | Added optional `FASHN_API_KEY` to the schema (the route already read it but it was missing; this pre-existing TS error blocked `npm run build`) |
| `tests/cache.test.ts` | New tests: TTL reuse/expiry, 50-way in-flight dedupe, failures not cached, key isolation, prefix invalidation |
| `tests/barcode-image-series.test.ts` | Clears the TTL cache between tests; connection-count expectation updated from 3 to 2 because the config scan is now shared |

### Cache policy

| Data | TTL | Why safe |
|------|-----|----------|
| ERP product-type config | 60 s | reference data; changes rarely |
| Classification facets (menu, chips) | 60 s | reference data; shared by all visitors |
| Listing filter options (counts) | 60 s | display-only filter counts; checkout stays live |
| Hidden barcode list (`isActive:false`) | 60 s | invalidated immediately by the admin update route |
| Catalogue rows, prices, quantity, cart, wishlist, orders, payments | **not cached** | must stay live/correct |

---

## 6. Measurements

### 6.1 Build / bundle (measured)

- `npm run build`: **✓ compiled successfully in 21.2 s**, 11 static pages generated without a
  database. Home route: **1.81 kB** route JS / **145 kB** first-load JS (unchanged — all edits are
  server-side; no client bundle growth).
- `npm run typecheck`: passes (previously failed on the missing `FASHN_API_KEY`).
- `npm test`: **276 passed, 1 failed**; the failure is pre-existing and unrelated:
  `tests/add-on-categories.test.ts` expects `"Ready Bits"`, the source defines `"Pre-Cut Fabrics"`.

### 6.2 TTL cache microbenchmark (measured, simulated 25 ms ERP query)

Script: 12 callers over 4 distinct keys; then 1 000 warm hits; then 50 concurrent cold callers.

| Scenario | Queries | Wall time |
|----------|---------|-----------|
| Before (every caller queries) | 12 | 457.8 ms |
| After (4 keys, TTL cache) | 4 | 125.8 ms |
| Warm hit | 0 | ~0.4 µs per call |
| 50 concurrent cold callers | 1 | 43.6 ms |

Query count −66.7 %, wall time −72.5 % for this pattern. This measures the cache module with a
synthetic 25 ms query, not production MongoDB.

### 6.3 Duplicate work removed (call-count analysis from the code)

| Path | Before | After |
|------|--------|-------|
| Homepage ERP catalog computations | 3 fan-outs × 11 groups = **33** | 1 × 11 = **11** (−67 %) |
| Homepage occasion chips | 2 × 11 group facet sets | 1 × 11, then cached |
| Header filter columns per storefront page | 4 `producttypes` scans + 4 `ecommerceproduct` scans | 0 DB work on any request within 60 s of the first |
| `inactiveBarcodes` scans | once per catalog + once per facets (per group) | at most once per 60 s per instance |

### 6.4 Runtime API sample (measured with `next start`, `PERF_LOG=1`)

```
[perf] scope=api method=GET path=/api/v1/wishlist status=200 ms=0.7 bytes=21
[perf] scope=api method=GET path=/api/v1/cart status=500 ms=8030.5 bytes=127
```

The 8 s cart request is the expected MongoDB connection timeout in this DB-less environment, and
demonstrates that slow/error requests are logged even when `PERF_LOG` is off. The guest wishlist
request shows the logging layer adds only sub-millisecond overhead.

### 6.5 Hero source images (measured re-encode with the repo's `sharp`)

| Source | Dimensions | Source size | WebP @1920, q75 |
|--------|-----------|-------------|-----------------|
| `hero-pink-silk.png` | 2056×765 | 2.15 MB | 111 KB |
| `hero-gold-silk.png` | 2171×724 | 1.98 MB | 68 KB |
| `hero-sarees-courtyard.png` | 1167×768 | 1.71 MB | 84 KB |
| `hero-red-silk.png` | 1365×768 | 1.47 MB | 56 KB |

`next/image` already optimizes these per request (`sharp` is installed), so this is optimizer CPU /
image weight, not the bytes a visitor currently downloads. Converting the sources at build time is
recommended, not done here (no visual-quality sign-off, no DB banner updates).

### 6.6 What is *not* measured

Real TTFB, LCP/CLS, Mongo execution times and ERP latency. Capture them in staging with
`PERF_LOG=1` before/after deployment; the new `scope=catalog` lines report `dbMs`, `externalMs`,
item counts and total ms per category, and `scope=api` reports per-endpoint ms and bytes.

---

## 7. Safety review

- **Carts/wishlists/orders/auth/payments:** untouched and uncached.
- **Stock and prices:** catalogue queries (`barcodeLabels.list`, facets, availability) remain live;
  only display-side filter counts are cached 60 s.
- **Visibility:** the hidden-barcode list is the only visibility cache; it is invalidated by the
  admin product update when `isActive` changes, and otherwise expires in ≤60 s.
- **ERP config changes:** header columns/chips reflect changes within 60 s.
- **Images:** per-barcode mapping and `probeImage` semantics unchanged; no shared image cache added.
- **Build:** `force-dynamic` kept; build still succeeds with no env/DB.
- **Multi-instance:** the cache is per process; replicas may differ by ≤60 s. No correctness depends
  on the cache being shared.
- **Logging:** no query strings, bodies, headers, tokens or PII.

---

## 8. Verification performed

1. `npm run typecheck` — pass.
2. `npm run build` — pass, no DB required.
3. `npx vitest run` — 38/39 files pass; only the pre-existing add-on label test fails.
4. `next start` smoke test — `/api/v1/health` 200, `/api/v1/wishlist` 200 (0.7 ms), cart logged at
   500 with the expected DB timeout.
5. New cache tests cover TTL expiry, in-flight dedupe, error handling and invalidation.
6. Homepage slicing preserves each block's original limit (8 / 10 / 8 by default).

---

## 9. Remaining issues / recommended next steps

| Priority | Issue | Recommendation |
|----------|-------|----------------|
| P0 | No real production measurements yet | Run a before/after capture with `PERF_LOG=1` in staging |
| P1 | ERP collection indexes unknown (`labels.barcode`, `ecommerceproduct` type/business, `item.subGroupId`) | Ask the ERP DBA to confirm/add indexes; `explain()` the top queries |
| P1 | `force-dynamic` on all routes | Evaluate `unstable_cache`/tag revalidation for settings/menu with an explicit DB-less build guard; requires an architecture decision |
| P2 | Product page loads 48 catalogue items for related + prev/next | Split into a small related query and a live prev/next lookup, or cache only the 48-item *metadata* with a stock-aware invalidation |
| P2 | Image probing is N ranged GETs on a cold catalogue | Wire the existing `deadlineAt` per page; keep the 6 h cache |
| P2 | Header cart + wishlist requests for guests | Server-seed an empty state or defer the wishlist query until the menu opens |
| P3 | Hero source PNGs 1.5–2.2 MB | Pre-generate WebP/AVIF assets during the build and update banner references |
| P3 | No bundle analyzer | Add `@next/bundle-analyzer` as a dev-only script |
| P3 | Sitemap is static with 1 h revalidate | Acceptable; revisit if catalogue URLs change frequently |

---

## 10. Deployment and rollback

### Deploy
1. `npm ci`
2. `npm run typecheck`
3. `npm test` (expect the known pre-existing add-on label failure)
4. `npm run build`
5. Optional audit window: set `PERF_LOG=1` (and `PERF_SLOW_MS`, default 1000). Unset afterwards for
   quiet logs; slow/error requests are always logged.
6. Restart the app. Caches warm per instance on the first request; no migration or index required.
7. Verify `/`, `/collections/sarees`, a product page, header filter columns, and an admin
   active/inactive product toggle (it should disappear immediately).

### Rollback
Revert the commit. The cache is in-memory only, so a restart clears it; no data or schema changes to
undo. To disable caching without a revert, set the TTLs in `src/lib/barcode-image-series.ts`
(`CONFIG_TTL_MS`) to `0` — `cached()` with a 0 ms TTL behaves as a pass-through (in-flight sharing
remains).

---

## 11. Addendum — production pass (2026-11-21)

This pass was performed with both MongoDB databases reachable, so the numbers below are **live
measurements**, not projections. See `docs/IMAGE_AUDIT.md` for the image-count bug.

### 11.1 Live baseline (before this pass)

| Scope | Measured |
|-------|----------|
| Homepage `getErpHomeSections(10)` cold | 19 540 ms (11 ERP groups, 6 non-empty) |
| Catalogue, sarees page 1 | total 1336 / 47 items, `dbMs` 6 580, `ms` 6 877 |
| Catalogue, fabrics page 1 | total 572 / 46, `dbMs` 8 616, `ms` 9 079 |
| Catalogue, plain-fabrics page 1 | total 602 / **7**, `dbMs` 9 694, `externalMs` 23 283, `ms` 13 002 |
| Catalogue, dupatta page 1 | total 86 / 47, `dbMs` 3 283, `ms` 3 773 |
| MongoDB command round-trip | ~500 ms; `explain()` shows server-side execution 7–27 ms, so the cost is round-trips, not a collection scan |

### 11.2 Changes since section 5

| Area | Change |
|------|--------|
| `src/lib/cache.ts` | Added `cachedSWR` (stale-while-revalidate), `invalidateCachePrefixes`, `stableKey`; 500-key cap retained |
| `src/lib/db.ts` | Env-configurable pools (`MONGODB_MAX_POOL_SIZE`/`MONGODB_MIN_POOL_SIZE`), `maxConnecting: 2`, timeouts, driver command monitoring; ERP connection uses `autoIndex:false`/`autoCreate:false` |
| `src/lib/mongo-perf.ts` | New: logs only slow server-side commands (`dbMs`) or every command with `MONGO_PERF_LOG=1`; redacts values and sensitive collections |
| `src/lib/perf.ts` | Added `getPerfContext()` for the command monitor |
| `src/lib/product-meta-cache.ts` | New: one cached `productWebMeta` map + inactive-barcode list shared by catalog, homepage and product hydration |
| `src/lib/cache-invalidation.ts` | New: product/site/config invalidation + `revalidatePath`; wired into all admin write routes |
| `src/lib/site-data.ts` | 300 s TTL + 600 s stale on settings/menu/categories/stores/pages |
| `src/lib/barcode-image-series.ts` | 120 s TTL + 300 s stale on catalog and homepage sections; 300 s on label-id scopes; shared count/list filter; **no rows dropped for missing photos** (placeholder instead); 1 200 ms photo-probe budget; configurable homepage concurrency (default 11 = prior parallelism) |
| `src/repositories/mongo/barcode-label.repository.ts` | Extracted pure exported `buildBarcodeMatch()`; added `count()`; `list()` and `facets()` use the same builder |
| `src/repositories/mongo/product.repository.ts` | Hydration reuses the cached overlay snapshot |
| `src/app/(storefront)/page.tsx` | **One** `getErpHomeSections(maxLimit)` shared by featured collections / new arrivals / Instagram (was 3 fan-outs); slices preserve each block's limit |
| `src/app/(storefront)/layout.tsx` | Kept `force-dynamic` — see §11.4 |
| `next.config.ts` | AVIF/WebP, 30-day minimum image cache, tuned device/image sizes, gzip, `poweredByHeader:false`, optional standalone output |
| Scripts | `scripts/migrate-indexes.ts` (add-only, dry-run default), `scripts/audit-images.ts`, `docs/IMAGE_AUDIT.md`, `ecosystem.config.js` |

### 11.3 Live after measurements

```
home cold:  21 727 ms  sections=7  items=57   cache=35 entries
home warm:       0 ms  sections=7  items=57
plain-fabrics: total=602  items=10  (count/list now agree)
plain-fabrics page 2, sort=price_desc: total=602  items=10  2 266 ms  (uncached)
```

Cold homepage is unchanged in wall time (concurrency default kept at one worker per group); every
subsequent request within the 120 s TTL is a memory hit. `dbMs` in the `[perf]`/`[mongo]` logs is
now the driver-reported server duration, not application elapsed time.

### 11.4 Why ISR was not enabled

An experiment with `revalidate = 120` on the storefront layout and homepage made `/` static and
worked **when `.env`/MongoDB were present**, but the existing `Dockerfile` runs `next build` with
no env and no database. Verified failure without `.env`:

```
Error occurred prerendering page "/".
MongooseServerSelectionError: connect ECONNREFUSED 127.0.0.1:27017
```

With the original `force-dynamic` restored, `npm run build` passes both with and without `.env`
(10 static pages, all storefront routes dynamic). Therefore storefront rendering stays dynamic and
the latency reduction comes from the process TTL/SWR caches, which are safe with a DB-less build.

### 11.5 Verification (this pass)

- `npm run typecheck` — pass.
- `npm run lint` — pass.
- `npm test` — **283 passed / 283** (39 files). Added SWR, invalidation, cache-key, count/list
  consistency and image-fallback tests; updated three stale tests that depended on old env/naming.
- `npm run build` — pass with `.env` and with `.env` removed (DB-less Docker scenario).
- Live DB measurements above; no data was written by the audit.

### 11.6 Deployment notes

1. Run `npx tsx scripts/migrate-indexes.ts` first (dry run), then `--apply` in a maintenance window.
   It is add-only and never drops an index.
2. Set the new env knobs only if tuning is needed (see `.env.example`). `MONGO_PERF_LOG=1` is for
   short investigations only.
3. With PM2 cluster mode, each worker has its own cache. Keep `PM2_INSTANCES=2` initially; admin
   writes call `revalidatePath` so all workers re-render, and other workers' stale TTL entries
   refresh on their next hit.
4. `docs/IMAGE_AUDIT.md` explains the missing plain-fabric photos: this is ERP content, not code.
