/**
 * Display-only currency conversion. Orders are always placed in INR.
 * Rates are placeholders — wire to an FX feed or make them admin-editable in siteSettings.
 */
export const CURRENCIES: Record<string, { symbol: string; rate: number; locale: string; label: string }> = {
  INR: { symbol: "₹", rate: 1, locale: "en-IN", label: "India (₹)" },
  USD: { symbol: "$", rate: 1 / 83.5, locale: "en-US", label: "USA ($)" },
  GBP: { symbol: "£", rate: 1 / 106, locale: "en-GB", label: "UK (£)" },
  AED: { symbol: "AED ", rate: 1 / 22.7, locale: "en-AE", label: "UAE (AED)" },
  EUR: { symbol: "€", rate: 1 / 91, locale: "de-DE", label: "Europe (€)" },
};
export type CurrencyCode = keyof typeof CURRENCIES;

export function formatMoney(inr: number, code: string = "INR"): string {
  const c = CURRENCIES[code] ?? CURRENCIES.INR;
  const v = inr * c.rate;
  const digits = code === "INR" ? 0 : 2;
  return `${c.symbol}${v.toLocaleString(c.locale, { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}
