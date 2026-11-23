const ERP_MEDIA_BASE = "https://erp.wovenessence.in";
const BARCODE_FILE_NAME = /^\d{1,2}[A-Za-z]\d{3,6}$/i;

export function formatImageUrl(src?: string | null): string | undefined {
  if (!src || typeof src !== "string") return undefined;
  const s = src.trim();
  if (!s) return undefined;
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith("//")) return `https:${s}`;
  if (s.startsWith("/")) return `${ERP_MEDIA_BASE}${s}`;
  return `${ERP_MEDIA_BASE}/${s}`;
}

export function imageBelongsToBarcode(src: string, barcode: string): boolean {
  const stem = String(src || "").split(/[?#]/)[0].split("/").pop()?.replace(/\.[a-z0-9]+$/i, "");
  if (!stem) return false;
  if (!BARCODE_FILE_NAME.test(stem)) return true;
  return barcode.toLowerCase() === stem.toLowerCase();
}
