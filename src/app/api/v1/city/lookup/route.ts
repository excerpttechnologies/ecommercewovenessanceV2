import type { NextRequest } from "next/server";
import { handler, ok, fail } from "@/lib/api/response";

export const dynamic = "force-dynamic";

interface PostalOffice {
  District?: string;
  State?: string;
}

interface PostalLookupResult {
  Status?: string;
  PostOffice?: PostalOffice[] | null;
}

/** GET /api/v1/city/lookup?city=Bengaluru */
export const GET = handler(async (req: NextRequest) => {
  const city = req.nextUrl.searchParams.get("city")?.trim() ?? "";
  if (city.length < 3 || city.length > 80) return fail("VALIDATION_ERROR", "Enter at least 3 characters for the city");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  let payload: unknown;
  try {
    const response = await fetch(`https://api.postalpincode.in/postoffice/${encodeURIComponent(city)}`, {
      signal: controller.signal,
    });
    if (!response.ok) return fail("CITY_LOOKUP_FAILED", "City lookup is temporarily unavailable", 502);
    payload = await response.json();
  } catch {
    return fail("CITY_LOOKUP_FAILED", "City lookup is temporarily unavailable", 502);
  } finally {
    clearTimeout(timeout);
  }

  if (!Array.isArray(payload)) return fail("CITY_LOOKUP_FAILED", "City lookup returned an invalid response", 502);
  const result = payload[0];
  if (result === null || typeof result !== "object") return ok({ locations: [] });
  const lookup = result as PostalLookupResult;
  if (lookup.Status !== "Success" || !Array.isArray(lookup.PostOffice)) return ok({ locations: [] });

  const matches = new Map<string, { city: string; state: string }>();
  for (const item of lookup.PostOffice) {
    if (item === null || typeof item !== "object") continue;
    const office = item as PostalOffice;
    const district = typeof office.District === "string" ? office.District.trim() : "";
    const state = typeof office.State === "string" ? office.State.trim() : "";
    if (district && state) matches.set(`${district.toLocaleLowerCase()}|${state.toLocaleLowerCase()}`, { city: district, state });
  }
  const locations = [...matches.values()].slice(0, 20);
  return ok({ locations });
});
