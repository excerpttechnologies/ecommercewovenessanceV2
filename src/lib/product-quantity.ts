const DEFAULT_PIECE_QTY = 1;
const PIECE_UOM_TYPES = new Set(["PC", "PCS", "PIECE", "PIECES", "NO", "NOS", "EA", "EACH", "UNIT", "UNITS"]);

export function getDefaultProductQty(
  unit?: string | null,
  unitType?: string | null,
  availableStock = 0,
  inStock = false,
): number {
  const normalized = (unitType?.trim() || unit?.trim() || "").replace(/[^a-z]/gi, "").toUpperCase();
  return inStock && PIECE_UOM_TYPES.has(normalized) && availableStock >= DEFAULT_PIECE_QTY
    ? DEFAULT_PIECE_QTY
    : 0;
}
