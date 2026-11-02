/**
 * Phone-number helpers for WhatsApp login and order notifications.
 *
 * The storefront sells in India, so +91 numbers map to the existing 10-digit
 * customer record. Other country codes are still accepted for WhatsApp login
 * and are stored/looked up in E.164 digits (e.g. 971501234567).
 */

export interface CountryCodeOption {
  code: string;
  label: string;
  /** National-number length hint used by the login form. */
  nationalLength?: number;
}

export const COUNTRY_CODES: CountryCodeOption[] = [
  { code: "91", label: "India (+91)", nationalLength: 10 },
  { code: "971", label: "UAE (+971)" },
  { code: "1", label: "US / Canada (+1)" },
  { code: "44", label: "UK (+44)" },
  { code: "65", label: "Singapore (+65)" },
  { code: "61", label: "Australia (+61)" },
];

export interface WhatsAppNumber {
  /** Dialling code without "+", e.g. "91". */
  countryCode: string;
  /** Number without the country code or trunk prefix. */
  national: string;
  /** Digits-only E.164 value used by the WhatsApp API, e.g. "919876543210". */
  e164: string;
  /** Value stored on website customer records: 10 digits for +91, E.164 otherwise. */
  lookup: string;
  /** Human-friendly value, e.g. "+91 98765 43210". */
  display: string;
}

const SUPPORTED_CODES = new Set(COUNTRY_CODES.map((c) => c.code));

function lengthValid(countryCode: string, national: string): boolean {
  if (countryCode === "91") return /^[6-9]\d{9}$/.test(national);
  return /^\d{6,14}$/.test(national) && (countryCode.length + national.length) <= 15;
}

/**
 * Normalise a typed/pasted mobile number. The country code comes from the
 * selector (defaults to +91); a full international number is also accepted.
 */
export function normaliseWhatsAppNumber(input: string, countryCode = "91"): WhatsAppNumber | null {
  const cc = (countryCode || "91").replace(/\D/g, "");
  if (!SUPPORTED_CODES.has(cc)) return null;

  let digits = (input ?? "").replace(/\D/g, "");
  if (!digits) return null;
  // Trunk prefixes: 0 98765… (India) / 00 91 … (international dialling)
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith(cc) && lengthValid(cc, digits.slice(cc.length))) digits = digits.slice(cc.length);
  else if (digits.startsWith("0") && lengthValid(cc, digits.slice(1))) digits = digits.slice(1);

  if (!lengthValid(cc, digits)) return null;

  const e164 = `${cc}${digits}`;
  return {
    countryCode: cc,
    national: digits,
    e164,
    lookup: cc === "91" ? digits : e164,
    display: `+${cc} ${digits}`,
  };
}

/** WhatsApp recipient: always digits-only E.164 (no plus sign). */
export function toWhatsAppRecipient(input: string, countryCode = "91"): string | null {
  return normaliseWhatsAppNumber(input, countryCode)?.e164 ?? null;
}

/** Mask a number for logs/admin lists while keeping the last four digits. */
export function maskWhatsAppNumber(value: string | null | undefined): string {
  const digits = (value ?? "").replace(/\D/g, "");
  if (!digits) return "—";
  if (digits.length <= 4) return `••••${digits}`;
  return `${digits.slice(0, 2)}${"•".repeat(Math.max(2, digits.length - 6))}${digits.slice(-4)}`;
}
