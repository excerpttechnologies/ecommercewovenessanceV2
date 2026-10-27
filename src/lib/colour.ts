/** Saree colour names that are not CSS colour keywords. */
const NAMED_COLOURS: Record<string, string> = {
  "bottle green": "#0b5a3b", "emerald green": "#1f8a5b", "mustard": "#d9a514", "rani pink": "#d81b74", "wine": "#6d1f33",
  "peach": "#f6b89a", "cream": "#f4ead2", "off white": "#f5f1e8", "mint": "#9fd8bf", "rust": "#b4532a", "copper": "#b06a3b",
  "mauve": "#b784a7", "magenta": "#c2185b", "sea green": "#2e8b57", "navy": "#1f2a5a", "navy blue": "#1f2a5a",
  "royal blue": "#2747a8", "multi": "conic-gradient(#d81b74, #d9a514, #1f8a5b, #2747a8, #d81b74)", "multicolour": "conic-gradient(#d81b74, #d9a514, #1f8a5b, #2747a8, #d81b74)",
};

/** Best-effort CSS background for an ERP colour name ("Royal Blue" → a blue). Unknown names fall back to the keyword. */
export function swatchColor(name: string): string {
  const key = name.trim().toLowerCase();
  return NAMED_COLOURS[key] ?? key.replace(/\s+/g, "");
}
