import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { parseBody } from "@/lib/api/body";
import { fail, handler, ok } from "@/lib/api/response";
import { startCustomerSession } from "@/lib/customer-session";
import { getWebConnection } from "@/lib/db";
import { normaliseMobile } from "@/lib/otp";
import { CustomerAccountModel } from "@/models/web/commerce.models";
import { getCustomers } from "@/repositories";

export const dynamic = "force-dynamic";

export const POST = handler(async (req: NextRequest) => {
  const b = await parseBody(
    req,
    z.object({
      name: z.string().trim().min(2).max(80),
      email: z.string().trim().toLowerCase().email().max(120),
      phone: z.string().optional(),
      password: z.string().min(8).max(72), // bcrypt ignores bytes past 72
    }),
  );
  if (!b.ok) return b.res;
  const { name, email, password } = b.data;
  const mobile = b.data.phone?.trim() ? normaliseMobile(b.data.phone) : undefined;
  if (mobile === null) return fail("VALIDATION_ERROR", "Enter a valid 10-digit Indian mobile number", 422);

  const Accounts = CustomerAccountModel(await getWebConnection());
  const customers = getCustomers();
  if (await Accounts.exists({ email })) return fail("EMAIL_TAKEN", "An account with this email already exists. Log in instead.", 409);
  // Don't attach a new login to an existing record by phone alone: the number isn't verified here,
  // and that record may hold someone's guest orders and addresses.
  if (mobile && (await customers.getByMobile(mobile))) return fail("MOBILE_TAKEN", "This mobile number is already linked to another account. Use a different number or leave it blank.", 409);

  try {
    const customer = await customers.create({ name, email, mobile });
    await Accounts.create({ customerId: customer.id, email, passwordHash: await bcrypt.hash(password, 10) });
    await startCustomerSession(customer);
    return ok({ id: customer.id, name: customer.name, email }, undefined, { status: 201 });
  } catch (e) {
    // lost a race with a concurrent registration for the same email / mobile
    if ((e as { code?: number }).code === 11000) return fail("ALREADY_REGISTERED", "An account with these details already exists. Log in instead.", 409);
    throw e;
  }
});
