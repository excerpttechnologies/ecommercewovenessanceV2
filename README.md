# Woven Essence by Temple Fabrics — storefront + admin

Production-grade saree e-commerce (Next.js 15 App Router · TypeScript · Tailwind · MongoDB/Mongoose) with a
RetailERP-ready data layer: master data (products, categories, stores, stock, prices) is **read live from
RetailERP's MongoDB and never modified**; everything the website owns (orders, carts, CMS, banners, coupons,
admin users, audit) lives in a separate database.

_Tagline: Tradition in Every Weave._

## Status

| Phase | Scope | State |
| --- | --- | --- |
| 1 | Data layer: ERP field mapping, repositories, mock/ERP adapters, seed, introspection | ✅ |
| 2 | Storefront (all pages), REST API + OpenAPI, admin panel (RBAC), tests | ✅ |
| 3 | Real RetailERP field names (`erp-introspect` output), product imagery, SMS OTP, Razorpay keys, final logo | ⏳ needs your input |

## Quick start (mock data)

```bash
cp .env.example .env            # defaults: DATA_SOURCE=mock, local MongoDB
npm install
npm run seed                    # ~120 products, categories, menu, banners, CMS pages, coupons, admin user
npm run dev                     # http://localhost:3000
```

- **Storefront**: http://localhost:3000
- **Admin**: http://localhost:3000/admin — `admin@wovenessence.in` / `Admin@123` (change it after first login)
- **API docs**: http://localhost:3000/api/docs/ui (Swagger) · JSON at `/api/docs`
- **Customer accounts**: customers sign up at `/register` (name, email, optional mobile, password) and log in
  at `/login` with email + password. Credentials live in `customerAccounts`, apart from the ERP-shaped
  customer record. The mobile OTP API (`/api/v1/auth/otp/*`) is still available but no longer on the login page;
  its code is a stub printed to the server console.
- **Admin login** is separate: `/admin/login`, its own `we_admin` cookie; the customer pages link to it.
- **Coupons seeded**: `WELCOME10` (10% off), `FESTIVE500` (₹500 off above ₹7,999).
- **Payments**: COD remains available; Razorpay online checkout creates and verifies real gateway orders. Online payment stays unavailable until both server keys are configured and enabled in Admin → Settings → Commerce.

## Quick start (RetailERP)

```bash
npm run erp:introspect -- "<mongodb-uri>" grooretailerp1     # writes erp-introspection.json (schema only, no data)
# edit src/lib/erp-mapping.ts with the real collection + field names (see docs/ERP_INTEGRATION.md)
DATA_SOURCE=erp ERP_MONGODB_URI="<uri>" ERP_DB_NAME=grooretailerp1 npm run erp:sync-meta   # slugs/SEO rows for ERP SKUs
npm run dev
```

Admin → **Inventory & sync** has "Test ERP connection" and "Re-sync web meta" buttons for the same operations.

## What's included

**Storefront** — sticky header with mega-menu (admin-built), search overlay, store + display-currency
selector, home page assembled from admin-orderable sections (hero carousel, trust badges, category tiles,
featured collections, new arrivals, best sellers, occasion/fabric chips, lifestyle banners, testimonials,
Instagram strip, newsletter; navigation and category/collection tiles fall back when CMS records are absent), listing pages with URL-synced facets (fabric, weave, craft, occasion, colour,
motif, border, price, discount, availability) and sort, product page (gallery zoom, attribute table, GST
note, pincode check, reviews, WhatsApp enquiry, related products, JSON-LD), server-side cart + wishlist
(cookie-scoped, merged on login), checkout (saved addresses, COD, Razorpay), order tracking, customer registration + email/password login,
account (profile, orders, address book), store locator, CMS pages, contact, sitemap/robots, security headers.

**Admin (`/admin`)** — RBAC (admin / manager / staff + custom roles with a permission matrix), dashboard
KPIs, products with a "Synced from RetailERP" badge and a website-only overlay (slug / SEO / featured),
inventory summary + low-stock + ERP test/re-sync, orders with an enforced fulfilment workflow
(Placed → Confirmed → Packed → Shipped → Delivered, plus Cancelled/Returned with refund permission) and
AWB, customers, enquiries + newsletter, reports with CSV export, menu builder, rule-based / manual
collections, homepage builder, banners with scheduling, CMS pages (Markdown), testimonials, coupons
(percent / flat / BOGO with limits), review moderation, settings (theme tokens, logo, contact, commerce,
SEO, trust badges), users, audit log with before/after snapshots.

**API** — `/api/v1/*`, JSON envelopes, Zod validation, OpenAPI 3.1 at `/api/docs`.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (flat config) |
| `npm test` | Vitest — ERP mapping + pricing rules |
| `npm run seed` | Seed mock catalogue + website content (mock mode only; never touches ERP; product/category imagery is left empty) |
| `npm run erp:introspect -- <uri> <db>` | Dump RetailERP collection/field shapes to `erp-introspection.json` |
| `npm run erp:sync-meta` | Create `productWebMeta` (slug/SEO) rows for products that lack one |

## Environment

See `.env.example`. Key variables:

| Variable | Purpose |
| --- | --- |
| `DATA_SOURCE` | `mock` or `erp` |
| `MONGODB_URI`, `WEB_DB_NAME` | Website-owned database (always writable) |
| `ERP_MONGODB_URI`, `ERP_DB_NAME` | RetailERP database (read-only; alias `ERP_MONGO_URI`; falls back to `MONGODB_URI`). Admin → Products reads `barcodeLabel` here |
| `ERP_IMAGE_BASE` | Deployed RetailERP web app serving relative ERP image paths (see `docs/barcodeLabel-product-mapping.md`) |
| `ERP_IMAGE_SPACES_HOSTS` | DigitalOcean Spaces bucket host(s) holding ERP photos; default `templeimg.blr1.digitaloceanspaces.com` |
| `DO_SPACES_KEY`, `DO_SPACES_SECRET` | Optional; presign private ERP product photos on DigitalOcean Spaces |
| `NVIDIA_API_KEY` | NVIDIA API key (build.nvidia.com) for Admin → AI Assistant (`/admin/assistant`); server-only. The page loads without it but cannot answer |
| `NVIDIA_MODEL`, `NVIDIA_BASE_URL` | Optional; model (must support tool calling, default `nvidia/nemotron-3-super-120b-a12b`) and endpoint (default `https://integrate.api.nvidia.com/v1`) |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | Session signing (customer cookie `we_session`, admin cookie `we_admin`) |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL for sitemap / JSON-LD / OpenAPI |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Required for real Razorpay checkout; online payment is unavailable when either is blank |

## Layout

```
src/lib/erp-mapping.ts        ← THE ONLY place RetailERP field names live
src/domain/types.ts           UI-facing types (Product, Order, …)
src/repositories/             MasterData (read-only ERP) + website repositories, mock/erp adapters
src/models/erp/*              Mongoose models generated from the mapping (strict:false)
src/models/web/*              Website-owned collections
src/lib/                      auth (jose JWT), cart-server, pricing (pure), otp, payments, admin/*
src/app/(storefront)/         Public pages
src/app/admin/                Admin panel (login + (panel) route group)
src/app/api/v1/               REST API · src/app/api/docs = OpenAPI
src/components/               ui primitives (shadcn-style, self-contained), layout, product, cart, home, listing, account, admin
scripts/                      seed, introspect-erp, sync-web-meta
tests/                        vitest
docs/ERP_INTEGRATION.md       Step-by-step ERP wiring guide
```

Design notes: brand tokens are CSS variables injected from `siteSettings.theme` (admin-editable, no rebuild);
UI primitives follow shadcn conventions but are self-contained (no Radix dependency); nothing customer-facing
is hard-coded in components — copy, menus, banners and sections come from the database.

## Docker

Admin → Products reads RetailERP even when `DATA_SOURCE=mock`. Set `ERP_MONGODB_URI`
(or the `ERP_MONGO_URI` alias) and optionally `ERP_DB_NAME` in `.env` before starting
the app with Docker Compose; otherwise the product list will query the local MongoDB
container and may be empty.

```bash
docker compose up --build       # app + MongoDB; then `docker compose exec app npm run seed`
```

## Known gaps / next steps

- `src/lib/erp-mapping.ts` field names are placeholders (`// TODO: verify against RetailERP`) until the
  introspection JSON is applied.
- Storefront image areas show a Coming Soon placeholder; mock product and category records are seeded without images.
- OTP delivery and courier ETA (`/api/v1/pincode`) are stubs with clearly marked TODOs. Razorpay requires valid server credentials and never simulates successful payment.
- Upload the final logo and paste its URL in Admin → Settings → Brand & theme.
