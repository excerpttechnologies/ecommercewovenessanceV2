import type { NextRequest } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/api/body";
import { handler, ok } from "@/lib/api/response";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth";
import { getWebConnection } from "@/lib/db";
import { env } from "@/lib/env";
import { SiteSettingsModel } from "@/models/web/content.models";
import { getSite } from "@/repositories";

export const dynamic = "force-dynamic";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const Settings = z.object({
  storeName: z.string().min(1).optional(),
  legalName: z.string().min(1).optional(),
  tagline: z.string().optional(),
  logo: z.object({ light: z.string().optional(), dark: z.string().optional(), favicon: z.string().optional() }).partial().optional(),
  theme: z.object({ ivory: hex, olive: hex, gold: hex, maroon: hex, ink: hex, muted: hex, line: hex, headingFont: z.string(), bodyFont: z.string() }).partial().optional(),
  supportedCurrencies: z.array(z.string()).optional(),
  defaultStoreId: z.string().nullable().optional(),
  whatsappNumber: z.string().regex(/^\d{10,15}$/).optional(),
  contact: z.object({ phone: z.string(), email: z.string(), address: z.string(), hours: z.string() }).partial().optional(),
  social: z.object({ instagram: z.string(), facebook: z.string(), youtube: z.string() }).partial().optional(),
  seo: z.object({ defaultTitle: z.string(), defaultDescription: z.string(), ogImage: z.string() }).partial().optional(),
  commerce: z.object({ lowStockThreshold: z.number().int().min(0), freeShippingAbove: z.number().min(0), shippingCharge: z.number().min(0), codEnabled: z.boolean(), razorpayEnabled: z.boolean(), serviceablePincodePrefixes: z.array(z.string()) }).partial().optional(),
  shipping: z.object({
    enabled: z.boolean(),
    fallbackToFlatRate: z.boolean(),
    pickupLocation: z.string().max(120),
    pickupName: z.string().max(120),
    pickupPhone: z.string().max(20),
    pickupEmail: z.string().max(160),
    pickupAddress: z.string().max(300),
    pickupAddress2: z.string().max(300),
    pickupCity: z.string().max(120),
    pickupState: z.string().max(120),
    pickupPincode: z.string().regex(/^$|^[1-9][0-9]{5}$/),
    returnName: z.string().max(120),
    returnPhone: z.string().max(20),
    returnEmail: z.string().max(160),
    returnAddress: z.string().max(300),
    returnAddress2: z.string().max(300),
    returnCity: z.string().max(120),
    returnState: z.string().max(120),
    returnPincode: z.string().regex(/^$|^[1-9][0-9]{5}$/),
    defaultWeightKg: z.number().min(0.001).max(1000),
    defaultLengthCm: z.number().min(1).max(300),
    defaultBreadthCm: z.number().min(1).max(300),
    defaultHeightCm: z.number().min(1).max(300),
    rateMarkupPercent: z.number().min(0).max(500),
    codExtraCharge: z.number().min(0),
    trackingCacheMinutes: z.number().min(1).max(1440),
    autoCreateShipments: z.boolean(),
    autoAssignAwb: z.boolean(),
    autoRequestPickup: z.boolean(),
  }).partial().optional(),
  trustBadges: z.array(z.object({ title: z.string(), text: z.string().optional(), icon: z.string().optional() })).optional(),
});

export const GET = handler(async () => {
  await requireAdmin("settings:write");
  const settings = await getSite().settings();
  return ok({
    ...settings,
    erp: { ...settings.erp, dataSource: env.DATA_SOURCE, dbName: env.ERP_DB_NAME },
  });
});

/** PATCH — deep-merges nested groups so partial updates don't wipe siblings. */
export const PATCH = handler(async (req: NextRequest) => {
  const actor = await requireAdmin("settings:write");
  const b = await parseBody(req, Settings);
  if (!b.ok) return b.res;
  const before = await getSite().settings();
  const $set: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(b.data)) {
    if (v && typeof v === "object" && !Array.isArray(v)) for (const [k2, v2] of Object.entries(v)) $set[`${k}.${k2}`] = v2;
    else $set[k] = v;
  }
  const M = SiteSettingsModel(await getWebConnection());
  await M.updateOne({ key: "default" }, { $set }, { upsert: true });
  const after = await getSite().settings();
  await audit(actor, "settings.update", "siteSettings", "default", before, after, req);
  return ok(after);
});
