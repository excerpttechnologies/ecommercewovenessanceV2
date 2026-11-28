import type { ProductCard } from "@/domain/types";
import { isBarcodeLike, normalizeBarcode } from "@/lib/barcode-search";
import { escapeRegex } from "@/lib/utils";

export interface ProductCodeStructure {
  normalized: string;
  /** Prefix preceding a numeric sequence or final separator segment (e.g. "9A", "15-S-"). */
  prefix: string;
  /** Trailing numeric sequence string when present (e.g. "2594"). */
  numStr?: string;
  /** Parsed integer value of `numStr` when present. */
  numValue?: number;
  /** Trailing alphabetic or final segment suffix (e.g. "A" in "9A2594A", "KOL" in "15-S-KOL"). */
  suffix: string;
  /** Alphanumeric/digit tokens used for structural similarity. */
  tokens: string[];
}

export interface RelatedCodeAttributes {
  category?: string;
  productType?: string;
  itemId?: string;
  ecommItemCode?: string;
  fabric?: string;
  weave?: string;
  color?: string;
}

const MIN_CODE_SIMILARITY_SCORE = 150;

/**
 * Extracts numeric, prefix, suffix, and token structure from any product code/SKU.
 * Supports alphanumeric series ("9A2594", "PA14007"), hyphenated codes ("15-S-102", "15-S-KOL"),
 * suffixed codes ("9A2594A"), and pure numeric codes ("10045").
 */
export function parseProductCodeStructure(rawCode: string): ProductCodeStructure {
  const normalized = normalizeBarcode(rawCode);
  const tokens = normalized.match(/[A-Z]+|\d+/g) ?? [];

  if (!normalized) {
    return { normalized: "", prefix: "", suffix: "", tokens: [] };
  }

  // Match prefix + trailing digits + optional short letter suffix (e.g. "9A" + "2594" + "").
  const numericTrail = normalized.match(/^([A-Z0-9._/-]*?)(\d+)([A-Z]{0,2})$/);
  if (numericTrail) {
    const [, prefix, numStr, suffix] = numericTrail;
    const numValue = Number.parseInt(numStr, 10);
    return {
      normalized,
      prefix,
      numStr,
      numValue: Number.isFinite(numValue) ? numValue : undefined,
      suffix,
      tokens,
    };
  }

  // Fallback for separator-based non-numeric codes (e.g. "15-S-KOL" -> prefix "15-S-", suffix "KOL").
  const separatorMatch = normalized.match(/^(.*[-_/.])([A-Z0-9]+)$/);
  if (separatorMatch) {
    return {
      normalized,
      prefix: separatorMatch[1],
      suffix: separatorMatch[2],
      tokens,
    };
  }

  return {
    normalized,
    prefix: "",
    suffix: "",
    tokens,
  };
}

/**
 * Builds anchored, index-friendly regex patterns that capture a product code's family
 * for database pre-filtering across large catalogs.
 */
export function buildCodeFamilyQueryPatterns(rawCode: string): RegExp[] {
  const struct = parseProductCodeStructure(rawCode);
  if (!struct.normalized) return [];

  const patterns: RegExp[] = [];
  const seen = new Set<string>();
  const addPrefixPattern = (prefix: string) => {
    if (!prefix || seen.has(prefix)) return;
    seen.add(prefix);
    patterns.push(new RegExp(`^${escapeRegex(prefix)}`, "i"));
  };

  if (struct.prefix) {
    addPrefixPattern(struct.prefix);
    // For multi-segment separator codes (e.g. "15-S-KOL"), also consider the top-level segment ("15-").
    const firstSep = struct.prefix.search(/[-_/.]/);
    if (firstSep > 0 && firstSep + 1 < struct.prefix.length) {
      addPrefixPattern(struct.prefix.slice(0, firstSep + 1));
    }
  } else if (struct.numStr) {
    // Pure numeric code: match same-magnitude high-order prefix or exact digit length.
    if (struct.numStr.length >= 4) {
      addPrefixPattern(struct.numStr.slice(0, Math.max(2, struct.numStr.length - 3)));
    }
    patterns.push(new RegExp(`^\\d{${Math.max(1, struct.numStr.length - 1)},${struct.numStr.length + 1}}$`));
  } else if (struct.normalized.length >= 3) {
    addPrefixPattern(struct.normalized.slice(0, 2));
  }

  return patterns;
}

/**
 * Determines whether a search query represents a product-code/SKU search
 * (either via barcode/code token syntax or an exact single-SKU match).
 */
export function isProductCodeSearch(
  rawQuery?: string | null,
  primaryItems: readonly Pick<ProductCard, "sku">[] = [],
): boolean {
  const trimmed = rawQuery?.trim() ?? "";
  if (!trimmed) return false;
  if (isBarcodeLike(trimmed)) return true;
  const normalized = normalizeBarcode(trimmed);
  return primaryItems.length === 1 && normalizeBarcode(primaryItems[0].sku) === normalized;
}

function commonPrefixLength(a: string, b: string): number {
  const len = Math.min(a.length, b.length);
  let i = 0;
  while (i < len && a[i] === b[i]) i++;
  return i;
}

function tokenJaccard(a: readonly string[], b: readonly string[]): number {
  if (!a.length || !b.length) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

function sameText(a?: string, b?: string): boolean {
  return Boolean(a && b && a.trim().toLowerCase() === b.trim().toLowerCase());
}

/**
 * Computes a symmetric relevance score between a searched product code and a candidate code.
 * Returns `null` when the candidate does not meet the minimum code-similarity threshold.
 */
export function scoreRelatedCodeCandidate(
  targetCode: string,
  candidateCode: string,
  targetAttrs: RelatedCodeAttributes = {},
  candidateAttrs: RelatedCodeAttributes = {},
): { score: number; codeScore: number; numericDistance: number } | null {
  const target = parseProductCodeStructure(targetCode);
  const cand = parseProductCodeStructure(candidateCode);

  if (!target.normalized || !cand.normalized || target.normalized === cand.normalized) {
    return null;
  }

  let codeScore = 0;
  let numericDistance = Number.MAX_SAFE_INTEGER;

  if (target.numValue != null && cand.numValue != null) {
    numericDistance = Math.abs(target.numValue - cand.numValue);
  }

  if (target.prefix && cand.prefix === target.prefix) {
    // Same alphanumeric/series family prefix (e.g. "9A2594" vs "9A2592").
    codeScore += 1000;
    if (target.numStr && cand.numStr && target.numStr.length === cand.numStr.length) {
      codeScore += 200;
    }
    if (numericDistance !== Number.MAX_SAFE_INTEGER) {
      codeScore += 500 / (1 + numericDistance * 0.05);
    }
    if (target.suffix === cand.suffix) {
      codeScore += 30;
    }
  } else if (!target.prefix && !cand.prefix && target.numStr && cand.numStr) {
    // Both codes are pure numeric.
    if (target.numStr.length === cand.numStr.length) {
      codeScore += 600 + 500 / (1 + numericDistance * 0.05);
    } else if (numericDistance <= 100) {
      codeScore += 300 + 300 / (1 + numericDistance * 0.05);
    }
  } else {
    // Structural prefix and token similarity for hyphenated or cross-series codes.
    const lcp = commonPrefixLength(target.normalized, cand.normalized);
    const maxLen = Math.max(target.normalized.length, cand.normalized.length);
    if (lcp >= 2 && maxLen > 0) {
      codeScore += (lcp / maxLen) * 400;
    }
    const jaccard = tokenJaccard(target.tokens, cand.tokens);
    if (jaccard > 0) {
      codeScore += jaccard * 300;
    }
    if (lcp >= 1 && numericDistance <= 50) {
      codeScore += 150 / (1 + numericDistance * 0.1);
    }
  }

  if (codeScore < MIN_CODE_SIMILARITY_SCORE) {
    return null;
  }

  let attributeScore = 0;
  if (sameText(targetAttrs.itemId, candidateAttrs.itemId)) attributeScore += 150;
  if (sameText(targetAttrs.ecommItemCode, candidateAttrs.ecommItemCode)) attributeScore += 120;
  if (sameText(targetAttrs.category ?? targetAttrs.productType, candidateAttrs.category ?? candidateAttrs.productType)) {
    attributeScore += 100;
  }
  if (sameText(targetAttrs.fabric, candidateAttrs.fabric)) attributeScore += 60;
  if (sameText(targetAttrs.weave, candidateAttrs.weave)) attributeScore += 40;
  if (sameText(targetAttrs.color, candidateAttrs.color)) attributeScore += 30;

  return {
    score: codeScore + attributeScore,
    codeScore,
    numericDistance,
  };
}
