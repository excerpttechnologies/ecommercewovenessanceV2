import type { NextRequest } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/api/body";
import { fail, handler, ok } from "@/lib/api/response";
import { requireCustomer } from "@/lib/auth";
import { getCustomers, getSite } from "@/repositories";

export const dynamic = "force-dynamic";

const Address = z.object({ name: z.string().min(2), phone: z.string().regex(/^[6-9]\d{9}$/), line1: z.string().min(3), line2: z.string().optional(), city: z.string().min(2), state: z.string().min(2), pincode: z.string().regex(/^[1-9][0-9]{5}$/), country: z.string().default("India"), isDefault: z.boolean().optional() });

/** PUT /api/v1/account/addresses — replace the full address book */
export const PUT = handler(async (req: NextRequest) => {
  const s = await requireCustomer();
  const b = await parseBody(req, z.object({ addresses: z.array(Address).max(10) }));
  if (!b.ok) return b.res;
  const list = b.data.addresses;
  const settings = await getSite().settings();
  const prefixes = settings.commerce?.serviceablePincodePrefixes ?? [];
  if (prefixes.length && list.some((address) => !prefixes.some((prefix) => address.pincode.startsWith(prefix)))) {
    return fail("PINCODE_UNSERVICEABLE", "One or more addresses have a pincode we do not deliver to", 422);
  }
  if (list.length && !list.some((a) => a.isDefault)) list[0].isDefault = true;
  return ok(await getCustomers().setAddresses(s.sub, list));
});
