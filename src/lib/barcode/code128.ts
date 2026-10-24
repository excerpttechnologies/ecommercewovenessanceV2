/**
 * Minimal Code 128 (code set B) encoder — the project had no barcode library and
 * RetailERP barcodeLabel stores only the barcode value (barcodeNo: 4–10 printable
 * ASCII chars), so the admin UI draws the symbol itself as SVG.
 *
 * Each pattern lists bar/space widths in modules, starting with a bar.
 * Index = symbol value (0–102 data, 103–105 start A/B/C, 106 stop).
 */
export const CODE128_PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112",
] as const;

const START_B = 104;
const STOP = 106;

export interface Code128Symbol {
  /** Symbol values in order: start, data…, checksum, stop. */
  values: number[];
  /** Bar/space widths in modules, alternating and starting with a bar. */
  widths: number[];
  /** Total width in modules, excluding quiet zones. */
  modules: number;
}

/** Encodes `text` in code set B. Returns null for empty input or characters outside ASCII 32–127. */
export function encodeCode128B(text: string): Code128Symbol | null {
  if (!text) return null;
  const data: number[] = [];
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if (code < 32 || code > 127) return null;
    data.push(code - 32);
  }
  const checksum = data.reduce((sum, v, i) => sum + v * (i + 1), START_B) % 103;
  const values = [START_B, ...data, checksum, STOP];
  const widths = values.flatMap((v) => CODE128_PATTERNS[v].split("").map(Number));
  return { values, widths, modules: widths.reduce((a, b) => a + b, 0) };
}
