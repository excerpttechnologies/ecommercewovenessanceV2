import type { NextRequest } from "next/server";
import { fail, handler, ok } from "@/lib/api/response";

export const dynamic = "force-dynamic";

interface PostalOffice {
  District?: string;
  State?: string;
}

interface PostalLookupResult {
  Status?: string;
  PostOffice?: PostalOffice[] | null;
}

/** GET /api/v1/pincode/lookup?pin=560001 */
export const GET = handler(async (req: NextRequest) => {
  const pin = req.nextUrl.searchParams.get("pin") ?? "";
  if (!/^[1-9][0-9]{5}$/.test(pin)) return fail("VALIDATION_ERROR", "Enter a valid 6-digit pincode");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  let payload: unknown;
  try {
    const response = await fetch(`https://api.postalpincode.in/pincode/${pin}`, { signal: controller.signal });
    if (!response.ok) return fail("PINCODE_LOOKUP_FAILED", "Pincode lookup is temporarily unavailable", 502);
    payload = await response.json();
  } catch {
    return fail("PINCODE_LOOKUP_FAILED", "Pincode lookup is temporarily unavailable", 502);
  } finally {
    clearTimeout(timeout);
  }

  if (!Array.isArray(payload)) return fail("PINCODE_LOOKUP_FAILED", "Pincode lookup returned an invalid response", 502);
  const result = payload[0];
  if (result === null || typeof result !== "object") return fail("PINCODE_INVALID", "Pincode is incorrect", 404);
  const lookup = result as PostalLookupResult;
  if (lookup.Status !== "Success") return fail("PINCODE_INVALID", "Pincode is incorrect", 404);
  if (!Array.isArray(lookup.PostOffice)) return fail("PINCODE_LOOKUP_FAILED", "Pincode lookup returned an invalid response", 502);
  const office = lookup.PostOffice[0];
  const city = typeof office?.District === "string" ? office.District.trim() : "";
  const state = typeof office?.State === "string" ? office.State.trim() : "";
  if (!city || !state) return fail("PINCODE_INVALID", "Pincode is incorrect", 404);
  return ok({ pin, city, state });
});
