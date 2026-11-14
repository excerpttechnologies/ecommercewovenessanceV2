/**
 * Product gallery helpers shared by the storefront and the admin product editor.
 *
 * Labels are derived from the existing product classification (product type,
 * category title or ERP group). No new category system is introduced and no
 * gallery data is invented when a product has only one photograph.
 */

export type GalleryCategory = "saree" | "fabric" | "menswear" | "default";

export const GALLERY_VIEWS: Record<GalleryCategory, readonly string[]> = {
  saree: ["Full Drape", "Pallu", "Border", "Texture", "Blouse Piece"],
  fabric: ["Full View", "Texture", "Pattern", "Border", "Folded View"],
  menswear: ["Front", "Side", "Back", "Detail", "Styling"],
  default: ["Main View", "Alternate View", "Detail View", "Close-up", "Styling"],
};

export const GALLERY_SLOT_LIMIT = 5;

const normalize = (value?: string | null) => String(value ?? "").trim().toUpperCase();

/** Maps the existing category/product-type/group strings to a view-label set. */
export function galleryCategory(value?: string | null): GalleryCategory {
  const text = normalize(value);
  if (!text) return "default";
  if (/\b(?:SAREES?|SARI|SAREE)\b/.test(text)) return "saree";
  if (/\b(?:FABRICS?|PLAIN\s+FABRICS?|DUPATTA|UNSTITCHED\s+SUITS?)\b/.test(text)) return "fabric";
  if (/\b(?:MENS?|MEN'S|READY\s+MADE|DHOTIS?|KURTA|SHIRT|PAVADA)\b/.test(text)) return "menswear";
  return "default";
}

export function galleryViewLabels(value?: string | null): readonly string[] {
  return GALLERY_VIEWS[galleryCategory(value)];
}

/** Label for one gallery position (falls back to a generic view name). */
export function galleryViewLabel(position: number, value?: string | null): string {
  const labels = galleryViewLabels(value);
  return labels[position] ?? GALLERY_VIEWS.default[position] ?? `View ${position + 1}`;
}

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Gallery fields accept public http(s) URLs or site-relative paths (including uploaded
 * `/api/v1/uploads/…` files). Data/markup protocols are rejected before they reach the DOM.
 */
export function isAllowedGalleryUrl(value: unknown): value is string {
  const url = clean(value);
  if (!url || /[\u0000-\u001f\u007f]/.test(url) || url.includes("\\")) return false;
  if (url.startsWith("/")) return !url.startsWith("//");
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Builds the ordered, de-duplicated storefront gallery (maximum five images).
 * The first image is the primary. `base` is the existing ERP/barcode image and
 * is only used when no primary override has been saved.
 */
export function buildGalleryImages(
  primary: string | null | undefined,
  extras: readonly unknown[] | null | undefined,
  base?: string | null,
  limit = GALLERY_SLOT_LIMIT,
): string[] {
  const first = clean(primary) || clean(base);
  const rest = (extras ?? []).map(clean).filter(Boolean);
  const seen = new Set<string>();
  const images: string[] = [];
  for (const image of [first, ...rest]) {
    if (!image || seen.has(image)) continue;
    seen.add(image);
    images.push(image);
    if (images.length >= limit) break;
  }
  return images;
}
