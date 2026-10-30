/**
 * Shipping settings shared by the storefront, checkout and the Shiprocket
 * integration. Kept dependency-free so it can be unit-tested and imported by
 * both the web settings schema and server-only Shiprocket code.
 */

export interface ShippingSettings {
  /** Try live Shiprocket serviceability/rates. When false, the storefront uses the flat fallback rate. */
  enabled: boolean;
  /** Use the configured flat rate when Shiprocket is not configured or temporarily unavailable. */
  fallbackToFlatRate: boolean;
  pickupLocation: string;
  pickupName: string;
  pickupPhone: string;
  pickupEmail: string;
  pickupAddress: string;
  pickupAddress2: string;
  pickupCity: string;
  pickupState: string;
  pickupPincode: string;
  returnName: string;
  returnPhone: string;
  returnEmail: string;
  returnAddress: string;
  returnAddress2: string;
  returnCity: string;
  returnState: string;
  returnPincode: string;
  defaultWeightKg: number;
  defaultLengthCm: number;
  defaultBreadthCm: number;
  defaultHeightCm: number;
  /** Percentage added to the live courier rate before showing/charging it. */
  rateMarkupPercent: number;
  /** Extra amount added when the shopper chooses cash on delivery. */
  codExtraCharge: number;
  /** Tracking responses are reused for this many minutes unless an explicit refresh is requested. */
  trackingCacheMinutes: number;
  autoCreateShipments: boolean;
  autoAssignAwb: boolean;
  autoRequestPickup: boolean;
}

export const SHIPPING_DEFAULTS: ShippingSettings = {
  enabled: true,
  fallbackToFlatRate: true,
  pickupLocation: "",
  pickupName: "Woven Essence",
  pickupPhone: "",
  pickupEmail: "",
  pickupAddress: "",
  pickupAddress2: "",
  pickupCity: "",
  pickupState: "",
  pickupPincode: "",
  returnName: "Woven Essence",
  returnPhone: "",
  returnEmail: "",
  returnAddress: "",
  returnAddress2: "",
  returnCity: "",
  returnState: "",
  returnPincode: "",
  defaultWeightKg: 0.7,
  defaultLengthCm: 30,
  defaultBreadthCm: 25,
  defaultHeightCm: 5,
  rateMarkupPercent: 0,
  codExtraCharge: 0,
  trackingCacheMinutes: 10,
  autoCreateShipments: true,
  autoAssignAwb: true,
  autoRequestPickup: true,
};

const number = (value: unknown, fallback: number, min = 0): number => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= min ? parsed : fallback;
};

const bool = (value: unknown, fallback: boolean): boolean => (typeof value === "boolean" ? value : fallback);
const text = (value: unknown, fallback = ""): string => (typeof value === "string" ? value.trim() : fallback);

/** Merge stored settings over safe defaults (migration-safe for old siteSettings documents). */
export function normalizeShippingSettings(input?: Partial<ShippingSettings> | null): ShippingSettings {
  const raw = input ?? {};
  return {
    enabled: bool(raw.enabled, SHIPPING_DEFAULTS.enabled),
    fallbackToFlatRate: bool(raw.fallbackToFlatRate, SHIPPING_DEFAULTS.fallbackToFlatRate),
    pickupLocation: text(raw.pickupLocation, SHIPPING_DEFAULTS.pickupLocation),
    pickupName: text(raw.pickupName, SHIPPING_DEFAULTS.pickupName),
    pickupPhone: text(raw.pickupPhone, SHIPPING_DEFAULTS.pickupPhone),
    pickupEmail: text(raw.pickupEmail, SHIPPING_DEFAULTS.pickupEmail),
    pickupAddress: text(raw.pickupAddress, SHIPPING_DEFAULTS.pickupAddress),
    pickupAddress2: text(raw.pickupAddress2, SHIPPING_DEFAULTS.pickupAddress2),
    pickupCity: text(raw.pickupCity, SHIPPING_DEFAULTS.pickupCity),
    pickupState: text(raw.pickupState, SHIPPING_DEFAULTS.pickupState),
    pickupPincode: text(raw.pickupPincode, SHIPPING_DEFAULTS.pickupPincode),
    returnName: text(raw.returnName, SHIPPING_DEFAULTS.returnName),
    returnPhone: text(raw.returnPhone, SHIPPING_DEFAULTS.returnPhone),
    returnEmail: text(raw.returnEmail, SHIPPING_DEFAULTS.returnEmail),
    returnAddress: text(raw.returnAddress, SHIPPING_DEFAULTS.returnAddress),
    returnAddress2: text(raw.returnAddress2, SHIPPING_DEFAULTS.returnAddress2),
    returnCity: text(raw.returnCity, SHIPPING_DEFAULTS.returnCity),
    returnState: text(raw.returnState, SHIPPING_DEFAULTS.returnState),
    returnPincode: text(raw.returnPincode, SHIPPING_DEFAULTS.returnPincode),
    defaultWeightKg: number(raw.defaultWeightKg, SHIPPING_DEFAULTS.defaultWeightKg, 0.001),
    defaultLengthCm: number(raw.defaultLengthCm, SHIPPING_DEFAULTS.defaultLengthCm, 1),
    defaultBreadthCm: number(raw.defaultBreadthCm, SHIPPING_DEFAULTS.defaultBreadthCm, 1),
    defaultHeightCm: number(raw.defaultHeightCm, SHIPPING_DEFAULTS.defaultHeightCm, 1),
    rateMarkupPercent: number(raw.rateMarkupPercent, SHIPPING_DEFAULTS.rateMarkupPercent, 0),
    codExtraCharge: number(raw.codExtraCharge, SHIPPING_DEFAULTS.codExtraCharge, 0),
    trackingCacheMinutes: number(raw.trackingCacheMinutes, SHIPPING_DEFAULTS.trackingCacheMinutes, 1),
    autoCreateShipments: bool(raw.autoCreateShipments, SHIPPING_DEFAULTS.autoCreateShipments),
    autoAssignAwb: bool(raw.autoAssignAwb, SHIPPING_DEFAULTS.autoAssignAwb),
    autoRequestPickup: bool(raw.autoRequestPickup, SHIPPING_DEFAULTS.autoRequestPickup),
  };
}
