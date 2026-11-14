# Product Gallery — Five-Image Delivery Report (Woven Essence V2)

**Date:** 14-11-2026
**Product under test (real):** `https://wovenessence.in/collections/fabrics/4A1277` (fabric `4A1277`, real photo `4A1287.jpg` from the ERP image host)
**Scope:** Fabrics / Sarees / Men’s Wear five-image product gallery, with shopping flow preserved.

## 1. Analysis

- Before: the storefront gallery showed only the ERP barcode/default product image.
  `ProductWebMeta.extraImages` existed but the gallery assembly ignored it; ERP
  `ecommerceproduct.additionalImages` were not read or merged; there was no way to
  add real photos beyond the ERP default.
- After: gallery is assembled from barcode-keyed website
  `ProductWebMeta.extraImages` and, only when an ERP product maps to one barcode,
  ERP `ecommerceproduct.additionalImages` (dedup, order preserved, capped at five).
  Multi-barcode ERP products do not share their item-level primary or gallery images
  across barcode cards.

## 2. Modified components / APIs / DB (e-commerce repo: `deploy/ecommercewovenessanceV2`)

- `src/lib/barcode-image-series.ts` — gallery assembly after `withEcommerceDetails`;
  applies barcode-specific web overrides and only uses ERP images when the barcode
  relationship is unambiguous; dedupes and caps at 5.
- `src/lib/product-gallery.ts` — category labels and gallery builder
  (Saree: Full Drape / Pallu / Border / Texture / Blouse Piece; Fabric: Full View /
  Texture / Pattern / Border / Folded View; Men’s Wear: Front / Side / Back / Detail / Styling).
- `src/components/product/image-gallery.tsx` — shared storefront gallery (desktop
  vertical thumbs / mobile horizontal strip, click, arrows, swipe, zoom, fullscreen,
  skeleton/fallback, lazy secondary, single-image safe).
- `src/components/admin/product-gallery-editor.tsx` — five-slot admin editor.
- `src/app/api/v1/admin/products/route.ts` — gallery PATCH validation + prune.
- `src/app/api/v1/admin/products/gallery/upload/route.ts` — multi-file upload w/ progress.
- `src/app/api/v1/uploads/[...path]/route.ts` — local disk serving.
- `src/lib/product-upload.ts` — sniffing, size cap, dedupe, prune.
- `src/domain/types.ts` — gallery field types.

## 3. ERP-side changes (this session, 14-11-2026)

The ERP web admin (`C:\Users\Admin\Desktop\deploy\wovenessenceV2`, app `orbit-erp-clone`)
now owns the product-photo management flow end to end:

- `lib/productGallery.js` (new) — content-addressed public gallery storage
  (JPEG/PNG/WebP, magic-byte sniff, 8 MB cap, traversal-safe).
- `app/api/product-eccom/gallery/route.js` (new) — session-gated
  `POST /api/product-eccom/gallery` (multipart `file` + `sku`).
- `app/api/product-gallery/[...path]/route.js` (new) — public
  `GET /api/product-gallery/<sku>/<hash>.<ext>`.
- `components/ProductGalleryManager.jsx` (new) — upload/reorder/set-primary/delete,
  five-image cap, progress bar, reuse of existing `image` / `additionalImages`.
- `app/admin/ecommerce/product-eccom/add/page.jsx` — renders the manager; `additionalImages`
  moved out of the generic field list into the manager.

The separate Express backend (`deploy/reatailerp`) was **not** changed; the gallery
URLs it already serves under `/images/<prefix>/...` remain the source of real photos.

## 4. Admin behaviour

- Upload real JPEG/PNG/WebP photos only (magic-byte validated, no SVG, no AI-generated).
- Multi-file upload fills slots sequentially; XHR progress; content dedupe; 5-image cap.
- Reorder, set primary, delete, revert to barcode image.
- Save persists into `ecommerceproduct.additionalImages` + `ecommerceproduct.image`
  through the existing product save path. No auto-publish.

## 5. Image count / real photos

- `4A1277` (fabric): only **one real product image** exists in the ERP
  (`4A1287.jpg`); no alternate photos, no duplicates, no other-product images fabricated.
  Gallery = 1 real image; no `4A1277.jpg` used.
- `4A1159` (saree): verified — real image, `Full Drape` label, Add to Bag / Buy Now present.
- Men’s Wear: no published storefront product found during this pass.

## 6. Testing performed

- Automated: full suite green (38 files / 267 tests), `tsc --noEmit`, lint, `next build`.
- Live storefront: `/collections/fabrics/4A1277` → HTTP 200 with correct real image;
  `/collections/sarees/4A1159` → HTTP 200 with `Full Drape`; Add to Bag / Buy Now / GST OK.
- Live ERP endpoints: `GET /api/product-gallery/<sku>/<file>` → 404 for bad path (safe);
  `POST /api/product-eccom/gallery` unauthenticated → 401 (auth wiring OK).
- Full `next build` of the ERP app passed with the new routes registered.

## 7. Shopping-function confirmation

- Fetching, pricing, GST, stock, quantity, cart, checkout, wishlist, share, SEO,
  navigation, product information flows untouched. Guest cart behaviour re-checked
  (expected `UNAUTHENTICATED` / “Please log in”).

## 8. Known limitations / not verified here

- No real alternate photos existed for `4A1277`, so a live click-through through five
  thumbnails could not be performed.
- Interactive browser UI and full authenticated cart/checkout/payment/wishlist E2E not run.
- No published Men’s Wear storefront product was found to test.
- ERP backend (`deploy/reatailerp`) code unchanged.

## 9. Next steps

- Operator uploads real photos for `4A1277` (+ saree/men’s products) via the ERP
  E-commerce → product gallery manager, then saves/publishes.
- Final commit + deployment decision pending.
