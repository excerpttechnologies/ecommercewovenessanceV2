/**
 * WhatsApp (Meta Cloud API) configuration — server-only.
 *
 * Credentials are read from the environment at call time so tests and local
 * mocks can switch them without a rebuild. Never import this module from a
 * client component: the access token must never reach the browser.
 */

export const OTP_MAX_ATTEMPTS = 5;
export const ORDER_NOTIFICATION_MAX_ATTEMPTS = 5;

export const ORDER_TEMPLATE_PARAM_KEYS = [
  "customerName",
  "orderNumber",
  "orderDate",
  "paymentMethod",
  "totalAmount",
  "paymentStatus",
  "paymentReference",
  "orderStatus",
] as const;

export type OrderTemplateParamKey = (typeof ORDER_TEMPLATE_PARAM_KEYS)[number];

const DEFAULT_ORDER_PARAMS =
  "customerName,orderNumber,orderDate,paymentMethod,totalAmount,paymentStatus,paymentReference";

export interface WhatsAppConfig {
  enabled: boolean;
  accessToken: string;
  phoneNumberId: string;
  apiVersion: string;
  graphBaseUrl: string;
  timeoutMs: number;
  maxRetries: number;
  otpTemplate: string;
  otpTemplateLang: string;
  otpBodyParams: number;
  otpIncludeButton: boolean;
  otpPurpose: string;
  otpMaxAttempts: number;
  otpResendCooldownSec: number;
  otpTtlSec: number;
  orderTemplate: string;
  orderTemplateLang: string;
  orderTemplateParams: OrderTemplateParamKey[];
}

const text = (value: string | undefined) => (value ?? "").trim();
const firstText = (...values: Array<string | undefined>) => {
  for (const value of values) {
    const v = text(value);
    if (v) return v;
  }
  return "";
};
const bool = (value: string | undefined, fallback: boolean) => {
  const v = text(value).toLowerCase();
  if (!v) return fallback;
  return !["0", "false", "no", "off"].includes(v);
};
const num = (value: string | undefined, fallback: number, min: number, max: number) => {
  const raw = text(value);
  // Number("") is 0, which previously replaced every documented default with
  // the minimum (e.g. a 1s WhatsApp timeout instead of 10s). Treat a missing
  // value as "use the default" instead.
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
};

function parseOrderParams(value: string | undefined): OrderTemplateParamKey[] {
  const raw = text(value) || DEFAULT_ORDER_PARAMS;
  const allowed = new Set<string>(ORDER_TEMPLATE_PARAM_KEYS);
  const params = raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  // Each entry is one template placeholder, so duplicates are intentional and
  // must be preserved. If any name is unknown, use the documented default order
  // rather than silently shifting every later parameter.
  if (!params.length || params.some((part) => !allowed.has(part))) {
    return DEFAULT_ORDER_PARAMS.split(",") as OrderTemplateParamKey[];
  }
  return params as OrderTemplateParamKey[];
}

const otpTtlSeconds = () => {
  const seconds = text(process.env.WHATSAPP_OTP_TTL_SEC);
  if (seconds) return num(seconds, 300, 60, 900);
  const minutes = text(process.env.WHATSAPP_OTP_TTL_MINUTES);
  return minutes ? num(minutes, 5, 1, 15) * 60 : 300;
};

/** Read the current WhatsApp settings. Safe to call on every request. */
export function getWhatsAppConfig(): WhatsAppConfig {
  // WHATSAPP_TEMPLATE_LANGUAGE and the other *_SECONDS/_REQUEST_TIMEOUT names
  // are supported for existing deployments. The more specific names win.
  const sharedLanguage = firstText(process.env.WHATSAPP_TEMPLATE_LANGUAGE);
  return {
    enabled: bool(process.env.WHATSAPP_ENABLED, true),
    accessToken: text(process.env.WHATSAPP_ACCESS_TOKEN),
    phoneNumberId: text(process.env.WHATSAPP_PHONE_NUMBER_ID),
    apiVersion: text(process.env.WHATSAPP_API_VERSION) || "v23.0",
    graphBaseUrl: (text(process.env.WHATSAPP_GRAPH_BASE_URL) || "https://graph.facebook.com").replace(/\/+$/, ""),
    timeoutMs: num(
      firstText(process.env.WHATSAPP_TIMEOUT_MS, process.env.WHATSAPP_REQUEST_TIMEOUT_MS),
      10_000,
      1_000,
      60_000,
    ),
    maxRetries: num(process.env.WHATSAPP_MAX_RETRIES, 1, 0, 5),
    otpTemplate: text(process.env.WHATSAPP_OTP_TEMPLATE),
    otpTemplateLang: firstText(process.env.WHATSAPP_OTP_TEMPLATE_LANG, sharedLanguage) || "en",
    // Number of body placeholders in the approved template. The live
    // authentication template uses {{1}} for the code and {{2}} for the purpose.
    otpBodyParams: num(process.env.WHATSAPP_OTP_BODY_PARAMS, 1, 1, 2),
    // Authentication templates with a copy-code button require a button
    // component containing the same code. Enable this for those templates.
    otpIncludeButton: bool(process.env.WHATSAPP_OTP_INCLUDE_BUTTON, false),
    otpPurpose: text(process.env.WHATSAPP_OTP_PURPOSE) || "Login",
    otpMaxAttempts: num(process.env.WHATSAPP_OTP_MAX_ATTEMPTS, OTP_MAX_ATTEMPTS, 3, 10),
    otpResendCooldownSec: num(
      firstText(process.env.WHATSAPP_OTP_RESEND_COOLDOWN_SEC, process.env.WHATSAPP_OTP_RESEND_COOLDOWN_SECONDS),
      30,
      15,
      600,
    ),
    otpTtlSec: otpTtlSeconds(),
    orderTemplate: text(process.env.WHATSAPP_ORDER_TEMPLATE),
    orderTemplateLang: firstText(process.env.WHATSAPP_ORDER_TEMPLATE_LANG, sharedLanguage) || "en",
    orderTemplateParams: parseOrderParams(process.env.WHATSAPP_ORDER_TEMPLATE_PARAMS),
  };
}

/** API credentials + the global switch. Templates are checked separately. */
export function whatsappCredentialsConfigured(config = getWhatsAppConfig()): boolean {
  return Boolean(config.enabled && config.accessToken && config.phoneNumberId);
}

export function whatsappOtpConfigured(config = getWhatsAppConfig()): boolean {
  return Boolean(whatsappCredentialsConfigured(config) && config.otpTemplate);
}

export function whatsappOrderConfigured(config = getWhatsAppConfig()): boolean {
  return Boolean(whatsappCredentialsConfigured(config) && config.orderTemplate);
}

/** Useful in admin/debug views — never exposes the token. */
export function whatsappConfigurationSummary() {
  const config = getWhatsAppConfig();
  return {
    enabled: config.enabled,
    credentials: Boolean(config.accessToken && config.phoneNumberId),
    otpReady: whatsappOtpConfigured(config),
    orderReady: whatsappOrderConfigured(config),
    apiVersion: config.apiVersion,
    otpTemplate: config.otpTemplate || null,
    otpTemplateLang: config.otpTemplateLang,
    otpBodyParams: config.otpBodyParams,
    otpIncludeButton: config.otpIncludeButton,
    otpMaxAttempts: config.otpMaxAttempts,
    otpResendCooldownSec: config.otpResendCooldownSec,
    otpTtlSec: config.otpTtlSec,
    orderTemplate: config.orderTemplate || null,
    orderTemplateLang: config.orderTemplateLang,
    orderTemplateParams: config.orderTemplateParams,
    timeoutMs: config.timeoutMs,
    maxRetries: config.maxRetries,
  };
}
