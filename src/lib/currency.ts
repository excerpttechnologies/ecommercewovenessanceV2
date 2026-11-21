/**
 * Display-only currency conversion. Orders are always placed in INR.
 * Rates are placeholders — wire to an FX feed or make them admin-editable in siteSettings.
 */
export const CURRENCY_OPTIONS = ["INR", "USD"] as const;
export type CurrencyCode = (typeof CURRENCY_OPTIONS)[number];

export const CURRENCIES: Record<CurrencyCode, { symbol: string; rate: number; locale: string; label: string }> = {
  INR: { symbol: "₹", rate: 1, locale: "en-IN", label: "Indian Rupee (₹)" },
  USD: { symbol: "$", rate: 1 / 83.5, locale: "en-US", label: "US Dollar ($)" },
};

export function normalizeCurrencyCode(code: string | null | undefined): CurrencyCode {
  return code === "USD" ? "USD" : "INR";
}

export function formatMoney(inr: number, code: string = "INR", options: { decimals?: number } = {}): string {
  const normalizedCode = normalizeCurrencyCode(code);
  const c = CURRENCIES[normalizedCode];
  const v = inr * c.rate;
  const digits = options.decimals ?? (normalizedCode === "INR" ? 0 : 2);
  return `${c.symbol}${v.toLocaleString(c.locale, { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}
