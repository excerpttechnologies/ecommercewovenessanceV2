import type { NextRequest } from "next/server";
import { fail, handler, ok } from "@/lib/api/response";
import { getSite } from "@/repositories";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/pincode?pin=560001
 * Serviceability stub: honours siteSettings.commerce.serviceablePincodePrefixes ([] = all India).
 * TODO: replace ETA with a courier API (Delhivery / Shiprocket) lookup.
 */
export const GET = handler(async (req: NextRequest) => {
  const pin = req.nextUrl.searchParams.get("pin") ?? "";
  if (!/^[1-9][0-9]{5}$/.test(pin)) return fail("VALIDATION_ERROR", "Enter a valid 6-digit pincode");
  const s = await getSite().settings();
  const prefixes = s.commerce?.serviceablePincodePrefixes ?? [];
  const serviceable = prefixes.length === 0 || prefixes.some((p) => pin.startsWith(p));
  const local = pin.startsWith("56"); // Karnataka
  return ok({ pin, serviceable, etaDays: serviceable ? (local ? 2 : 5) : undefined, cod: serviceable && (s.commerce?.codEnabled ?? true) });
});
