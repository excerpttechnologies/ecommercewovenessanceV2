import type { NextRequest } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/api/body";
import { fail, handler, ok } from "@/lib/api/response";
import { clientKey, rateLimit } from "@/lib/api/rate-limit";
import { OtpError, sendWhatsAppOTP } from "@/lib/otp";

export const dynamic = "force-dynamic";

/** POST /api/v1/auth/otp/send — deliver a login code through WhatsApp. */
export const POST = handler(async (req: NextRequest) => {
  const b = await parseBody(
    req,
    z.object({
      mobile: z.string().trim().min(4).max(24),
      /** Dialling code without "+"; defaults to India. */
      countryCode: z.string().trim().regex(/^\d{1,3}$/).optional(),
    }),
  );
  if (!b.ok) return b.res;

  // Per-instance IP guard in addition to the per-mobile Mongo limit.
  const limit = rateLimit(clientKey(req, "otp-send"), 10, 10 * 60_000);
  if (!limit.ok) {
    return fail("OTP_RATE_LIMITED", "Too many OTP requests from this connection. Please try again later.", 429, {
      retryAfterSeconds: limit.retryAfterSeconds,
    });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    undefined;

  try {
    const result = await sendWhatsAppOTP(b.data.mobile, { countryCode: b.data.countryCode, ip });
    // Generic success body: never contains the code, a URL, or account details.
    return ok(result);
  } catch (error) {
    // OtpError messages are written for customers. Anything else (database or
    // network failure) must not leak its internal message into the response.
    if (error instanceof OtpError) return fail(error.code, error.message, error.status, error.details);
    console.error("[otp] send failed", error instanceof Error ? error.message : error);
    return fail(
      "OTP_UNAVAILABLE",
      "We could not send a WhatsApp code right now. Please try again in a moment.",
      503,
    );
  }
});
