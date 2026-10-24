import type { NextRequest } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/api/body";
import { fail, handler, ok } from "@/lib/api/response";
import { startCustomerSession } from "@/lib/customer-session";
import { normaliseMobile, verifyOtp } from "@/lib/otp";
import { getCustomers } from "@/repositories";

export const dynamic = "force-dynamic";

export const POST = handler(async (req: NextRequest) => {
  const b = await parseBody(req, z.object({ mobile: z.string(), code: z.string().regex(/^\d{6}$/), name: z.string().max(80).optional() }));
  if (!b.ok) return b.res;
  const mobile = normaliseMobile(b.data.mobile);
  if (!mobile) return fail("VALIDATION_ERROR", "Invalid mobile", 422);
  if (!(await verifyOtp(mobile, b.data.code))) return fail("OTP_INVALID", "Incorrect or expired code", 401);

  const customer = await getCustomers().upsertByMobile({ mobile, name: b.data.name });
  await startCustomerSession(customer);
  return ok({ id: customer.id, name: customer.name, mobile });
});
