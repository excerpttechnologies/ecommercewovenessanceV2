/**
 * Normalizes barcode or product-code input for consistent matching:
 * - Trims leading and trailing whitespace
 * - Collapses consecutive spaces
 * - Converts to uppercase
 * - Preserves meaningful barcode characters (letters, digits, hyphens, underscores, dots, slashes)
 */
export function normalizeBarcode(raw?: string | null): string {
  if (!raw) return "";
  return raw.trim().replace(/\s+/g, " ").toUpperCase();
}

/**
 * Checks if a search input has the characteristics of a barcode or product code identifier:
 * - Single token without whitespace
 * - 2 to 32 characters
 * - Contains digits OR barcode separators (- / _ .)
 * This prevents general English words like "saree", "silk", "cotton", "blue" from being treated as barcode queries.
 */
export function isBarcodeLike(raw?: string | null): boolean {
  if (!raw) return false;
  const trimmed = raw.trim();
  if (trimmed.length < 2 || trimmed.length > 32) return false;
  // If it contains spaces, it's a multi-word phrase, not a barcode
  if (/\s/.test(trimmed)) return false;
  // Must be alphanumeric + barcode symbols
  if (!/^[A-Za-z0-9_\-\.\/]+$/.test(trimmed)) return false;
  // Must contain at least one digit or code separator (- / _ .)
  // Barcodes in ERP always have numbers (9A2766, 8A3987, PA14007) or hyphens (15-S-KOL, FX-CRB)
  return /\d/.test(trimmed) || /[-_\/\.]/.test(trimmed);
}
