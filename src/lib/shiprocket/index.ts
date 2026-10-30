/**
 * Shiprocket integration — public surface.
 *
 * Server-only: never import from a client component (credentials live in
 * `config.ts`). Use the route handlers for browser access.
 */
export * from "./types";
export { ShiprocketError, isShiprocketError, safeError } from "./errors";
export {
  getShippingContext,
  requireShiprocketConfig,
  shiprocketEnvConfigured,
  canQueryServiceability,
  siteUrl,
  type ShippingContext,
} from "./config";
export { erpWeightToKg, computePackage, type PackageDefaults } from "./package";
export { resolvePackageItems, packageDefaultsFromConfig, type PackageSourceItem } from "./package-server";
export { fetchServiceability, quoteShipping, clearQuoteCache } from "./serviceability";
export {
  buildOrderPayload,
  createShiprocketOrder,
  createShipment,
  fetchCourierOptions,
  assignAwb,
  requestPickup,
  generateLabel,
  generateManifest,
  cancelShiprocketOrder,
  shiprocketDate,
} from "./shipments";
export { createReturnShipment, buildReturnPayload } from "./returns";
export { getTracking, applyTrackingToOrder, clearTrackingCache, type TrackingTarget } from "./tracking";
export {
  mapShiprocketStatus,
  orderStatusForShipping,
  canAdvanceShipping,
  canAdvanceOrderStatus,
  isTerminalShippingStatus,
  shippingEventKey,
  mergeTrackingEvents,
} from "./status";
export {
  applyFreeShipping,
  buildOrderShippingSnapshot,
  chargedShipping,
  quoteForItems,
  resolveCartPackage,
  defaultsFromContext,
  type QuoteInput,
} from "./checkout";
export {
  createShipmentForOrder,
  scheduleShipment,
  autoShipmentsEnabled,
  type AutoShipmentOptions,
  type ShipmentTrigger,
} from "./auto";
export {
  applyShippingWebhook,
  parseWebhookPayload,
  verifyWebhookToken,
  type ShippingWebhookEvent,
  type WebhookApplyResult,
} from "./webhook";
