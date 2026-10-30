import { getSite } from "@/repositories";
import { env } from "@/lib/env";
import { normalizeShippingSettings, type ShippingSettings } from "@/lib/shipping-settings";
import { ShiprocketError } from "./errors";
import type { ShiprocketConfig } from "./types";

const DEFAULT_BASE = "https://apiv2.shiprocket.in/v1/external";

export interface ShippingContext {
  shipping: ShippingSettings;
  commerce: {
    shippingCharge: number;
    freeShippingAbove: number;
    codEnabled: boolean;
    serviceablePincodePrefixes: string[];
  };
  config: ShiprocketConfig | null;
}

const digits = (value?: string | null) => (value ?? "").replace(/\D/g, "");
const num = (value: unknown, fallback: number, min = 0) => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= min ? parsed : fallback;
};
const text = (value: unknown, fallback = "") => (typeof value === "string" ? value.trim() : fallback);

export function shiprocketEnvConfigured(): boolean {
  return Boolean(
    process.env.SHIPROCKET_EMAIL?.trim() &&
      process.env.SHIPROCKET_PASSWORD?.trim() &&
      (process.env.SHIPROCKET_PICKUP_LOCATION?.trim() || true),
  );
}

function buildConfig(shipping: ShippingSettings): ShiprocketConfig | null {
  const email = process.env.SHIPROCKET_EMAIL?.trim() ?? "";
  const password = process.env.SHIPROCKET_PASSWORD?.trim() ?? "";
  const pickupLocation = shipping.pickupLocation || process.env.SHIPROCKET_PICKUP_LOCATION?.trim() || "";
  if (!email || !password || !pickupLocation) return null;

  return {
    baseUrl: (process.env.SHIPROCKET_BASE_URL?.trim() || DEFAULT_BASE).replace(/\/+$/, ""),
    email,
    password,
    pickupLocation,
    pickupPincode: digits(shipping.pickupPincode || process.env.SHIPROCKET_PICKUP_PINCODE),
    channelId: process.env.SHIPROCKET_CHANNEL_ID?.trim() || undefined,
    timeoutMs: Math.round(num(process.env.SHIPROCKET_TIMEOUT_MS, 20_000, 1_000)),
    maxRetries: Math.round(num(process.env.SHIPROCKET_MAX_RETRIES, 2, 0)),
    defaultWeightKg: num(shipping.defaultWeightKg, 0.7, 0.001),
    defaultLengthCm: num(shipping.defaultLengthCm, 30, 1),
    defaultBreadthCm: num(shipping.defaultBreadthCm, 25, 1),
    defaultHeightCm: num(shipping.defaultHeightCm, 5, 1),
    rateMarkupPercent: num(shipping.rateMarkupPercent, 0, 0),
    codExtraCharge: num(shipping.codExtraCharge, 0, 0),
    pickup: {
      name: text(shipping.pickupName, "Woven Essence"),
      phone: digits(shipping.pickupPhone || process.env.SHIPROCKET_FALLBACK_PHONE),
      email: text(shipping.pickupEmail || process.env.SHIPROCKET_FALLBACK_EMAIL, "orders@wovenessence.in"),
      address: text(shipping.pickupAddress),
      address2: text(shipping.pickupAddress2),
      city: text(shipping.pickupCity),
      state: text(shipping.pickupState),
      pincode: digits(shipping.pickupPincode || process.env.SHIPROCKET_PICKUP_PINCODE),
    },
    returnAddress: {
      name: text(shipping.returnName || shipping.pickupName, "Woven Essence"),
      phone: digits(shipping.returnPhone || shipping.pickupPhone || process.env.SHIPROCKET_FALLBACK_PHONE),
      email: text(shipping.returnEmail || shipping.pickupEmail || process.env.SHIPROCKET_FALLBACK_EMAIL, "orders@wovenessence.in"),
      address: text(shipping.returnAddress || shipping.pickupAddress),
      address2: text(shipping.returnAddress2 || shipping.pickupAddress2),
      city: text(shipping.returnCity || shipping.pickupCity),
      state: text(shipping.returnState || shipping.pickupState),
      pincode: digits(shipping.returnPincode || shipping.pickupPincode || process.env.SHIPROCKET_PICKUP_PINCODE),
    },
  };
}

/** Load site settings + environment once per request. */
export async function getShippingContext(): Promise<ShippingContext> {
  const settings = await getSite().settings();
  const shipping = normalizeShippingSettings(settings.shipping as Partial<ShippingSettings> | undefined);
  const commerce = (settings.commerce ?? {}) as {
    shippingCharge?: number;
    freeShippingAbove?: number;
    codEnabled?: boolean;
    serviceablePincodePrefixes?: string[] | null;
  };
  return {
    shipping,
    commerce: {
      shippingCharge: num(commerce.shippingCharge, 149, 0),
      freeShippingAbove: num(commerce.freeShippingAbove, 4999, 0),
      codEnabled: commerce.codEnabled !== false,
      serviceablePincodePrefixes: (commerce.serviceablePincodePrefixes ?? []).map(String).filter(Boolean),
    },
    config: buildConfig(shipping),
  };
}

export function requireShiprocketConfig(context: ShippingContext): ShiprocketConfig {
  if (!context.config) {
    throw new ShiprocketError(
      "SHIPROCKET_NOT_CONFIGURED",
      "Shiprocket is not configured. Add SHIPROCKET_EMAIL, SHIPROCKET_PASSWORD and SHIPROCKET_PICKUP_LOCATION on the server, and the pickup location/pincode in Admin → Settings → Shipping.",
      { status: 503 },
    );
  }
  return context.config;
}

/** True when live rates can be requested (credentials + a pickup pincode for serviceability). */
export function canQueryServiceability(config: ShiprocketConfig | null): boolean {
  return Boolean(config?.pickupPincode && config.pickupPincode.length === 6);
}

export function siteUrl(): string {
  return env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "");
}
