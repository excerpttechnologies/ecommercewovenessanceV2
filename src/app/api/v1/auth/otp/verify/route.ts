import type { NextRequest } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/api/body";
import { fail, handler, ok } from "@/lib/api/response";
import { clientKey, rateLimit } from "@/lib/api/rate-limit";
import { startCustomerSession } from "@/lib/customer-session";
import { OtpError, verifyWhatsAppOTP } from "@/lib/otp";
import { getCustomers } from "@/repositories";

export const dynamic = "force-dynamic";

/** POST /api/v1/auth/otp/verify — verify the WhatsApp code and start the existing customer session. */
export const POST = handler(async (req: NextRequest) => {
  const b = await parseBody(
    req,
    z.object({
      mobile: z.string().trim().min(4).max(24),
      countryCode: z.string().trim().regex(/^\d{1,3}$/).optional(),
      code: z.string().regex(/^\d{6}$/),
      /** Only needed the first time a new mobile number logs in. */
      name: z.string().trim().min(2).max(80).optional(),
    }),
  );
  if (!b.ok) return b.res;

  const limit = rateLimit(clientKey(req, "otp-verify"), 25, 10 * 60_000);
  if (!limit.ok) {
    return fail("OTP_RATE_LIMITED", "Too many verification attempts. Please wait a few minutes and try again.", 429, {
      retryAfterSeconds: limit.retryAfterSeconds,
    });
  }

  const otpFailure = (reason?: string) => {
    if (reason === "TOO_MANY_ATTEMPTS") {
      return fail("OTP_TOO_MANY_ATTEMPTS", "Too many incorrect attempts. Request a new code.", 429);
    }
    if (reason === "EXPIRED") {
      return fail("OTP_EXPIRED", "This OTP has expired. Request a new code.", 401);
    }
    return fail("OTP_INVALID", "Incorrect or expired OTP.", 401);
  };

  try {
    // 1) Check the code without consuming it. Only a valid code reveals whether
    //    the number is new, and a new customer can submit the same code again
    //    with their name. Wrong codes are counted here.
    const checked = await verifyWhatsAppOTP(b.data.mobile, b.data.code, b.data.countryCode, { consume: false });
    if (!checked.ok) return otpFailure(checked.reason);

    const mobile = checked.mobile!;
    const customers = getCustomers();
    const existing = await customers.getByMobile(mobile);
    const name = b.data.name?.trim();

    if (!existing && !name) {
      // No partial/duplicate record is created: the verified number stays in the
      // OTP row and the browser asks for the minimum required information.
      return fail("REGISTRATION_REQUIRED", "Enter your name to finish creating your account.", 422, {
        requiresName: true,
        mobile,
      });
    }

    // 2) Consume the code atomically, then start the existing session.
    const result = await verifyWhatsAppOTP(b.data.mobile, b.data.code, b.data.countryCode);
    if (!result.ok) return otpFailure(result.reason);

    let customer = existing;
    let isNew = false;

    if (!existing) {
      customer = await customers.upsertByMobile({ mobile, name: name! });
      isNew = true;
    } else if (!existing.name.trim() && name) {
      customer = (await customers.update(existing.id, { name })) ?? existing;
    }

    await startCustomerSession(customer!);
    return ok({ id: customer!.id, name: customer!.name, mobile, isNew });
  } catch (error) {
    // OtpError messages are customer-safe; a database/session failure is not.
    if (error instanceof OtpError) return fail(error.code, error.message, error.status, error.details);
    console.error("[otp] verify failed", error instanceof Error ? error.message : error);
    return fail(
      "OTP_UNAVAILABLE",
      "We could not verify your code right now. Please try again in a moment.",
      503,
    );
  }
});
