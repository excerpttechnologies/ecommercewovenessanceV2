import type { NextRequest } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/api/body";
import { fail, handler, ok } from "@/lib/api/response";
import { getCustomerSession, requireCustomer } from "@/lib/auth";
import { getWebConnection } from "@/lib/db";
import { CustomerAccountModel } from "@/models/web/commerce.models";
import { getCustomers } from "@/repositories";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  const s = await getCustomerSession();
  if (!s) return ok(null);
  return ok(await getCustomers().getById(s.sub));
});

export const PATCH = handler(async (req: NextRequest) => {
  const s = await requireCustomer();
  const b = await parseBody(req, z.object({ name: z.string().min(2).max(80).optional(), email: z.string().trim().toLowerCase().email().optional(), gstNumber: z.string().max(20).optional() }));
  if (!b.ok) return b.res;
  if (b.data.email) {
    // the profile email doubles as the login email for password accounts
    const Accounts = CustomerAccountModel(await getWebConnection());
    if (await Accounts.exists({ email: b.data.email, customerId: { $ne: s.sub } })) return fail("EMAIL_TAKEN", "That email is already used by another account", 409);
    await Accounts.updateOne({ customerId: s.sub }, { $set: { email: b.data.email } });
  }
  return ok(await getCustomers().update(s.sub, b.data));
});
