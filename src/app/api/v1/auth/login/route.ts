import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { parseBody } from "@/lib/api/body";
import { fail, handler, ok } from "@/lib/api/response";
import { startCustomerSession } from "@/lib/customer-session";
import { getWebConnection } from "@/lib/db";
import { CustomerAccountModel } from "@/models/web/commerce.models";
import { getCustomers } from "@/repositories";

export const dynamic = "force-dynamic";

export const POST = handler(async (req: NextRequest) => {
  const b = await parseBody(req, z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1) }));
  if (!b.ok) return b.res;
  const Accounts = CustomerAccountModel(await getWebConnection());
  const account = await Accounts.findOne({ email: b.data.email });
  const generic = () => fail("INVALID_CREDENTIALS", "Incorrect email or password", 401);
  if (!account) return generic();
  if (account.lockedUntil && account.lockedUntil > new Date()) return fail("LOCKED", "Too many failed attempts. Try again in 15 minutes.", 423);
  if (!(await bcrypt.compare(b.data.password, account.passwordHash))) {
    const failed = (account.failedAttempts ?? 0) + 1;
    await Accounts.updateOne({ _id: account._id }, { $set: { failedAttempts: failed, ...(failed >= 5 ? { lockedUntil: new Date(Date.now() + 15 * 60_000) } : {}) } });
    return generic();
  }
  const customer = await getCustomers().getById(account.customerId);
  if (!customer) return generic();
  await Accounts.updateOne({ _id: account._id }, { $set: { failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() } });
  await startCustomerSession(customer);
  return ok({ id: customer.id, name: customer.name, email: account.email });
});
