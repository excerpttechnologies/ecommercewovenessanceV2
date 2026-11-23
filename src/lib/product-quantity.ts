const DEFAULT_PIECE_QTY = 1;
const PIECE_UOM_TYPES = new Set(["PC", "PCS", "PIECE", "PIECES", "NO", "NOS", "EA", "EACH", "UNIT", "UNITS"]);

export function isDecimalUnit(uom?: string | null, uomType?: string | null): boolean {
  const text = `${uom || ""} ${uomType || ""}`.toLowerCase();
  return /mtr|meter|metre/i.test(text);
}

export function getDefaultProductQty(
  unit?: string | null,
  unitType?: string | null,
  availableStock = 0,
  inStock = false,
): number {
  if (!inStock || availableStock <= 0) return 0;
  if (isDecimalUnit(unit, unitType)) {
    if (availableStock < 0.5) return 0;
    return availableStock >= 1 ? 1 : Math.round(availableStock * 100) / 100;
  }
  const normalized = (unitType?.trim() || unit?.trim() || "").replace(/[^a-z]/gi, "").toUpperCase();
  if (normalized && !PIECE_UOM_TYPES.has(normalized)) {
    return availableStock >= 1 ? 1 : 0;
  }
  return availableStock >= DEFAULT_PIECE_QTY ? DEFAULT_PIECE_QTY : 0;
}
