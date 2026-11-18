# Razorpay / Bank Website Compliance Audit — Woven Essence

Date: 16 November 2026
Project: Woven Essence e-commerce (`ecommercewovenessanceV2`)
Local: http://localhost:3001 · Production: https://wovenessence.in/ · ERP: https://erp.wovenessence.in/

## 1. Business details used

| Item | Value | Source |
| --- | --- | --- |
| Store | Woven Essence | `siteSettings.storeName` |
| Legal name | Temple Fabrics | `siteSettings.legalName` |
| Address | 1ST FLOOR 4T, BLOCK 34, 27th Cross, 4th T Block East, 4th Block, Jayanagar, Bengaluru, Karnataka 560011 | `siteSettings.contact.address` |
| Support phone | 9945158629 | updated in `siteSettings.contact.phone` + `src/lib/business.ts` default |
| WhatsApp | 919945158629 | updated in `siteSettings.whatsappNumber` |
| Support email | hello@wovenessence.in | `siteSettings.contact.email` |
| Hours | Mon–Sat, 10:30 am – 8:30 pm | `siteSettings.contact.hours` |
| GSTIN | not stored in the project | **needs admin confirmation** |

## 2. Initial compliance issues found

1. No `/privacy-policy` and no `/shipping-policy` route existed at all (only Terms, Refund and Return policies were published).
2. No pricing-details page. Prices are GST-inclusive and shipping is quoted per pincode, but that was only explained inside product copy, not on a page a reviewer can be pointed to.
3. Business support number was `099163 11500` — as the `businessInfo()` default and in `siteSettings.contact.phone` — and the footer hardcoded `tel:+919916311500`, so the number could not be changed from settings.
4. `siteSettings.whatsappNumber` still held the schema placeholder `919999999999`, which hides the WhatsApp button (`product-info.ts` treats it as "not configured").
5. Footer's Customer Information column had no links to privacy, shipping or pricing pages.

## 3. Privacy Policy (`/privacy-policy`)

New page using the existing `LegalPage` shell. 12 sections: introduction and business identity; information collected (account, order, payment-reference, technical); purposes; payment gateway (Razorpay) and third parties (courier/logistics, WhatsApp messaging, email and hosting, ERP); storage and security; retention; cookies (essential session/cart cookies only — no advertising pixels or third-party analytics, confirmed by a codebase search that found none); customer rights and request route; children's privacy; third-party links; changes; and contact details with `tel:` and `wa.me` links.

Static claims were limited to what the code actually does: no card/CVV/UPI-PIN storage (payment is gateway-hosted), WhatsApp order updates and OTP login, courier data sharing for delivery, HTTPS and hashed passwords.

## 4. Shipping Policy (`/shipping-policy`)

New page, values read from live settings rather than invented: processing `commerce.processingDays` (currently 2 business days), flat charge `commerce.shippingCharge` (₹149), free-shipping threshold `commerce.freeShippingAbove` (₹4,999), COD availability `commerce.codEnabled` and COD handling `shipping.codExtraCharge`. Delivery estimate is "3–7 business days after dispatch", the figure already published in the product Shipping & Returns tab, and is described as an estimate. Also covers India-only coverage with the product-page "Check delivery" pincode check, tracking flow (AWB + email/WhatsApp + Track Order / Account → Orders), delays, lost/undelivered/returned parcels, address corrections and support contacts.

## 5. Pricing details (`/pricing`)

New page explaining: INR pricing visible without login; prices inclusive of GST with the rate disclosed on each product; discount and coupon handling; shipping charges and the free-shipping threshold with a per-pincode courier quote and flat fallback; COD charge; the full checkout breakdown (subtotal, discounts, included GST, shipping, COD charge, final payable amount); that the gateway is charged the server-calculated final amount; price-error handling; and refunds.

Verified in code, not assumed:
- Product page renders "Inclusive of all taxes (GST n%)" and "Free shipping above ₹…" (`products/[slug]/page.tsx`, `barcode-product-detail.tsx`).
- Cart shows `Shipping` and `Includes GST` lines (`cart-page.tsx`), checkout shows subtotal/shipping/discount and the final amount before Razorpay.
- `POST /api/v1/checkout` computes `netAmount = payableSubtotal + chargedShipping(quote)` server-side and creates the Razorpay order from that value, so the browser cannot alter the amount.

No GST logic, shipping calculation or Razorpay integration was modified.

## 6. Razorpay verification requirements checked

Checked locally from the implementation; **not** verified against the merchant dashboard, and no approval is claimed:

- Public policy pages reachable without login — verified over HTTP (see section 10).
- Business identity, contact number and email published in the footer of every page.
- Prices displayed before login, GST treatment disclosed, shipping shown before payment.
- Pricing page now available as a dedicated URL if the dashboard asks for one: `https://wovenessence.in/pricing`.
- Secrets are not exposed in page content; payment verification remains server-side.

Outstanding: Razorpay's account-specific checklist must be compared in the dashboard, since requirements differ per merchant.

## 7. Phone number replacement summary

Replaced the public support number with **9945158629** (WhatsApp **919945158629**):

| Location | Change |
| --- | --- |
| `siteSettings` (DB, `key: "default"`) | `contact.phone` → `9945158629`, `whatsappNumber` → `919945158629` (1 document modified) |
| `src/lib/business.ts` | `DEFAULT_PHONE` → `9945158629`; added `whatsAppHref()` |
| `src/components/layout/footer.tsx` | `tel:+919916311500` hardcode → `tel:${e164(phone)}` from settings |
| `src/app/(storefront)/contact/page.tsx` | `tel:` link now uses `e164()` |
| `src/app/(storefront)/page.tsx` | home-page support panel no longer overrides the phone with `099163 11500` |
| `src/app/(storefront)/checkout/success/[orderNo]/page.tsx` | order-confirmation "Cancel" line now renders `tel:`/`mailto:` from settings; shipping-policy link points at `/shipping-policy` |
| Privacy / Shipping / Pricing pages | `tel:` and `wa.me` links rendered from settings |
| Terms, Refund, Return policies + `LegalPage` sidebar | already settings-driven, so they show the new number automatically |

Intentionally unchanged: customer account mobiles, historical order phone numbers, courier/ERP contact records, and the `919999999999` schema placeholder constant in `content.models.ts` (it is a "not configured" sentinel, not a support number). ERP inventory, stock and barcode data were not touched.

## 8. Files modified / created

Modified:
- `src/lib/business.ts`
- `src/components/layout/footer.tsx`
- `src/components/content/legal-page.tsx` (policy last-updated date)
- `src/app/(storefront)/contact/page.tsx`
- `src/app/(storefront)/page.tsx`
- `src/app/(storefront)/checkout/success/[orderNo]/page.tsx`
- `src/app/sitemap.ts`

Created:
- `src/app/(storefront)/privacy-policy/page.tsx`
- `src/app/(storefront)/shipping-policy/page.tsx`
- `src/app/(storefront)/pricing/page.tsx`
- `docs/RAZORPAY_WEBSITE_COMPLIANCE_AUDIT.md`

## 9. Routes

| Page | Final URL |
| --- | --- |
| Home | `/` |
| About Us | `/about-us` |
| Contact Us | `/contact-us` (also `/contact`) |
| Privacy Policy | `/privacy-policy` (new) |
| Shipping Policy | `/shipping-policy` (new) |
| Pricing Details | `/pricing` (new) |
| Terms & Conditions | `/terms-and-conditions` |
| Refund Policy | `/refund-policy` |
| Return Policy | `/return-policy` |

All three new routes are added to `src/app/sitemap.ts` and to the footer's Customer Information column.

## 10. Test results (actual)

Run against `npx next dev -p 3001` on 16 Nov 2026, after the changes:

| Route | HTTP status | Phone present | `tel:+919945158629` | `wa.me/919945158629` | Old number present |
| --- | --- | --- | --- | --- | --- |
| `/` | 200 | yes | yes | yes | no |
| `/privacy-policy` | 200 | yes | yes | yes | no |
| `/shipping-policy` | 200 | yes | yes | yes | no |
| `/pricing` | 200 | yes | yes | yes | no |
| `/contact-us` | 200 | yes | yes | yes | no |
| `/refund-policy` | 200 | yes | yes | yes | no |
| `/terms-and-conditions` | 200 | yes | yes | yes | no |

Other checks:
- `npx tsc --noEmit` → exit 0.
- Privacy page renders 13 section headings including Razorpay and cookies; shipping page renders the ₹4,999 threshold, ₹149 charge and processing/tracking sections; pricing page renders GST and Razorpay sections.
- `/collections/sarees` → 200 (listing unaffected).
- Footer contains links to `/privacy-policy`, `/shipping-policy` and `/pricing`.
- Home page after the fix: 200, shows `9945158629`, `wa.me/919945158629`, and no `9916311500`.
- `npx tsc --noEmit` re-run after the home/order-success edits → exit 0.
- A repo-wide search for the old number leaves only commented-out legacy blocks (no live code).
- `/cart` and `/checkout` return 307 for an empty cart session, which is the pre-existing redirect behaviour; the checkout/Razorpay flow itself was **not** re-exercised end-to-end (no test payment was made), and no payment code was changed.

Not tested: production deployment, Razorpay dashboard verification, real courier/payment transactions, mobile browser rendering.

## 11. Remaining merchant information to confirm

1. **GSTIN** — not stored anywhere in the project; needed on invoices and often on the website for bank review.
2. **Registered business name and address** — the storefront uses "Temple Fabrics" and the Jayanagar address; confirm this matches the bank account and Razorpay KYC documents exactly.
3. **Support email** — `hello@wovenessence.in` is used; confirm the mailbox is monitored.
4. **Delivery estimates and shipping charges** — the policy pages render them from settings (`processingDays`, `shippingCharge`, `freeShippingAbove`, `codExtraCharge`); confirm the current values before submission.
5. **Return/exchange window** — `commerce.returnWindowDays` (7) is quoted on the Return Policy and product tabs; confirm.
6. **International shipping** — described as "on request"; confirm whether the courier account supports it.
7. **Razorpay dashboard requirements** — the exact set of URLs the account asks for must be read from the merchant dashboard; this audit cannot confirm acceptance.

## 12. Deployment checklist

1. Deploy the branch containing the new routes.
2. Confirm the production `siteSettings` document also holds phone `9945158629` and WhatsApp `919945158629` (the local/dev database was updated; production may be a separate database).
3. Open `https://wovenessence.in/privacy-policy`, `/shipping-policy`, `/pricing`, `/contact-us` and check them logged out.
4. Submit `https://wovenessence.in/privacy-policy`, `https://wovenessence.in/shipping-policy`, `https://wovenessence.in/pricing`, `https://wovenessence.in/terms-and-conditions`, `https://wovenessence.in/refund-policy` and `https://wovenessence.in/contact-us` to Razorpay/bank review.
5. Do a low-value live test order to confirm the gateway still opens with the correct amount.
