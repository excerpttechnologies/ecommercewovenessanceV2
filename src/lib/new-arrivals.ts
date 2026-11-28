import { normalizeBarcode } from "@/lib/barcode-search";

export const NEW_ARRIVAL_START_SERIES = "11A2";

/**
 * Matches storefront product codes belonging to series 11A2 and all subsequent series:
 * - Major series 12+ (e.g. 12A0001, 13A1001, 100A1001)
 * - Series 11 with letter B-Z (e.g. 11B0001, 11C1001)
 * - Series 11A with sub-series >= 2:
 *   - 1-2 digit series tokens (11A2..11A99, e.g. "11A2", "11A3", "11A10", "11A2-01")
 *   - 3 digit series codes >= 200 (11A200..11A999)
 *   - 4+ digit barcodes >= 2000 (11A2000..11A9999, 11A10000+)
 */
export const NEW_ARRIVAL_SERIES_REGEX =
  /^(?:(?:1[2-9]|[2-9]\d|\d{3,})[A-Z]|11[B-Z]|11A(?:(?:[2-9]|[1-9]\d)(?:[^0-9]|$)|[2-9]\d{2}(?:[^0-9]|$)|(?:[2-9]\d{3}|[1-9]\d{4,})(?:[^0-9]|$)))/i;

export interface ParsedSeriesCode {
  major: number;
  letter: string;
  subDigits: string;
  subNumber: number;
}

/**
 * Parses leading `<major><letter><subDigits>` series identifiers such as
 * `4A1277`, `8A3421`, `9A2594`, `10A2462`, `11A1001`, `11A2`, `11A2001`, `12A1001`.
 */
export function parseSeriesCode(rawCode?: string | null): ParsedSeriesCode | null {
  const code = normalizeBarcode(rawCode);
  if (!code) return null;

  const match = code.match(/^(\d+)([A-Z])(\d*)/);
  if (!match) return null;

  const [, majorStr, letter, subDigits] = match;
  const major = Number.parseInt(majorStr, 10);
  if (!Number.isFinite(major)) return null;

  return {
    major,
    letter,
    subDigits,
    subNumber: subDigits ? Number.parseInt(subDigits, 10) : 0,
  };
}

/**
 * Returns true if the given barcode/SKU belongs to series 11A2 or any subsequent series.
 * Series before 11A2 (e.g. 4A, 8A, 9A, 10A, 11A0, 11A1 / 11A1xxx) return false.
 */
export function isNewArrivalSeriesCode(rawCode?: string | null): boolean {
  const parsed = parseSeriesCode(rawCode);
  if (!parsed) return false;

  if (parsed.major > 11) return true;
  if (parsed.major < 11) return false;

  if (parsed.letter > "A") return true;
  if (parsed.letter < "A") return false;

  if (!parsed.subDigits) return false;
  if (parsed.subDigits.length <= 2) return parsed.subNumber >= 2;
  if (parsed.subDigits.length === 3) return parsed.subNumber >= 200;
  return parsed.subNumber >= 2000;
}
