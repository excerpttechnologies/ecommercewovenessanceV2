import { createHmac, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { getWebConnection } from "@/lib/db";
import { env } from "@/lib/env";
import { OtpModel, WhatsAppNotificationModel } from "@/models/web/commerce.models";
import { getWhatsAppConfig } from "@/lib/whatsapp/config";
import { normaliseWhatsAppNumber } from "@/lib/whatsapp/phone";
import { sendWhatsAppOtpCode } from "@/lib/whatsapp/templates";
import { WhatsAppError, whatsAppErrorDiagnostics } from "@/lib/whatsapp/client";
import type { AnyDoc } from "@/models/_util";

/**
 * WhatsApp OTP login.
 *
 * Security notes:
 *  - the code is generated with crypto.randomInt and only its HMAC is stored;
 *  - rows expire automatically through the otpCodes TTL index;
 *  - resends are rate-limited per mobile (Mongo) and per IP (route helper);
 *  - a code can be consumed exactly once;
 *  - the code is never logged, returned to the browser, or put in a URL.
 */

const SEND_WINDOW_MS = 15 * 60_000;
const SEND_WINDOW_LIMIT = 5;
const OTP_AUDIT_TTL_MS = 24 * 60 * 60_000;

const hashSecret = () =>
  process.env.OTP_HASH_SECRET?.trim() || process.env.JWT_SECRET?.trim() || env.JWT_SECRET;

const hashCode = (mobile: string, code: string) =>
  createHmac("sha256", hashSecret()).update(`otp:${mobile}:${code}`).digest("hex");

function safeEqual(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

/** Six cryptographically secure digits, including leading zeroes. */
const generateCode = () => String(randomInt(0, 1_000_000)).padStart(6, "0");

export class OtpError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
    public details?: unknown,
  ) {
    super(message);
    this.name = "OtpError";
  }
}

export interface SendWhatsAppOtpOptions {
  /** Dialling code from the login form. Defaults to India (+91). */
  countryCode?: string;
  /** Client IP, used for abuse correlation (never returned to the browser). */
  ip?: string;
}

export interface SendWhatsAppOtpResult {
  mobile: string;
  expiresInSec: number;
  resendAfterSec: number;
}

export interface VerifyWhatsAppOtpResult {
  ok: boolean;
  reason?: "INVALID" | "EXPIRED" | "TOO_MANY_ATTEMPTS";
  attemptsRemaining?: number;
  /** Value to look up in the customer collection (10 digits for +91). */
  mobile?: string;
  e164?: string;
}

export interface VerifyWhatsAppOtpOptions {
  /** Set to false for a read-only check; the code is consumed by a later call. */
  consume?: boolean;
}

/** Existing registration/checkout helpers expect a 10-digit Indian number. */
export function normaliseMobile(input: string): string | null {
  const digits = String(input ?? "").replace(/\D/g, "");
  const ten = digits.length > 10 ? digits.slice(-10) : digits;
  return /^[6-9]\d{9}$/.test(ten) ? ten : null;
}

function friendlyDeliveryError(error: unknown): OtpError {
  if (error instanceof WhatsAppError) {
    if (error.code === "WHATSAPP_OTP_NOT_CONFIGURED" || error.code === "WHATSAPP_NOT_CONFIGURED") {
      return new OtpError(
        "WHATSAPP_OTP_UNAVAILABLE",
        "WhatsApp login is not available right now. Please log in with your email and password, or try again later.",
        503,
      );
    }
    if (error.code === "WHATSAPP_BAD_NUMBER" || error.code === "WHATSAPP_REJECTED") {
      return new OtpError(
        "WHATSAPP_DELIVERY_FAILED",
        "We could not send the code to this WhatsApp number. Check the number and try again.",
        422,
      );
    }
    return new OtpError(
      "WHATSAPP_UNAVAILABLE",
      "We could not send the WhatsApp code right now. Please try again in a moment.",
      503,
    );
  }
  return new OtpError(
    "WHATSAPP_UNAVAILABLE",
    "We could not send the WhatsApp code right now. Please try again in a moment.",
    503,
  );
}

const sanitizeProviderError = (error: unknown, code: string) => {
  const raw = error instanceof Error ? error.message : "WhatsApp delivery failed";
  const withoutCode = raw.split(code).join("[redacted]");
  return withoutCode.replace(/\s+/g, " ").trim().slice(0, 300);
};

/**
 * Create and deliver a login OTP through the approved WhatsApp template.
 * Throws OtpError with a user-safe message on validation/rate-limit/delivery failure.
 */
export async function sendWhatsAppOTP(
  input: string,
  options: SendWhatsAppOtpOptions = {},
): Promise<SendWhatsAppOtpResult> {
  const config = getWhatsAppConfig();
  const number = normaliseWhatsAppNumber(input, options.countryCode ?? "91");
  if (!number) {
    throw new OtpError("VALIDATION_ERROR", "Enter a valid mobile number for the selected country code.", 422);
  }

  const conn = await getWebConnection();
  const M = OtpModel(conn);
  const Notifications = WhatsAppNotificationModel(conn);
  const now = new Date();

  // ---- resend cooldown (only successful sends start the clock) ----
  const latest = await M.findOne({ mobile: number.lookup }).sort({ createdAt: -1 }).lean<AnyDoc>();
  const lastSentAt = latest?.lastSentAt ? new Date(latest.lastSentAt) : null;
  if (lastSentAt && now.getTime() - lastSentAt.getTime() < config.otpResendCooldownSec * 1000) {
    const retryAfter = Math.max(
      1,
      Math.ceil((config.otpResendCooldownSec * 1000 - (now.getTime() - lastSentAt.getTime())) / 1000),
    );
    throw new OtpError("OTP_COOLDOWN", `Please wait ${retryAfter} seconds before requesting another code.`, 429, {
      retryAfterSeconds: retryAfter,
    });
  }

  // ---- rate limit by mobile (15 minutes) ----
  // Failed deliveries do not consume the per-mobile quota; otherwise a
  // transient WhatsApp outage would lock the customer out. The per-IP limiter
  // still bounds repeated failed requests.
  const recentSends = await Notifications.countDocuments({
    type: "otp",
    mobile: number.e164,
    status: { $ne: "FAILED" },
    createdAt: { $gte: new Date(now.getTime() - SEND_WINDOW_MS) },
  });
  if (recentSends >= SEND_WINDOW_LIMIT) {
    throw new OtpError(
      "OTP_RATE_LIMITED",
      "Too many OTP requests for this number. Please try again in 15 minutes.",
      429,
    );
  }

  const code = generateCode();
  const expiresAt = new Date(now.getTime() + config.otpTtlSec * 1000);

  // Invalidate any earlier unused code, then save only the hash of the new one.
  await M.updateMany(
    { mobile: number.lookup, consumedAt: { $exists: false } },
    { $set: { expiresAt: now, codeHash: "invalidated" } },
  );
  const otp = await M.create({
    mobile: number.lookup,
    countryCode: number.countryCode,
    e164: number.e164,
    codeHash: hashCode(number.lookup, code),
    attempts: 0,
    maxAttempts: config.otpMaxAttempts,
    expiresAt,
    sendCount: recentSends + 1,
    windowStartedAt: now,
    requestIp: options.ip,
    deliveryStatus: "PENDING",
  });

  // Audit row for Admin → Settings. Auditing must never prevent delivery.
  let auditId: unknown;
  try {
    const audit = await Notifications.create({
      type: "otp",
      dedupeKey: `otp:${number.e164}:${randomUUID()}`,
      mobile: number.e164,
      templateName: config.otpTemplate,
      messageType: "otp_login",
      status: "PENDING",
      attempts: 1,
      claimedAt: now,
      lastAttemptAt: now,
      expiresAt: new Date(now.getTime() + OTP_AUDIT_TTL_MS),
      metadata: { lookup: number.lookup },
    });
    auditId = audit._id;
  } catch {
    auditId = undefined;
  }

  try {
    const sent = await sendWhatsAppOtpCode(number.e164, code, config);
    await M.updateOne(
      { _id: otp._id },
      {
        $set: {
          deliveryStatus: "SENT",
          providerMessageId: sent.messageId,
          lastSentAt: new Date(),
        },
      },
    );
    if (auditId) {
      await Notifications.updateOne(
        { _id: auditId },
        {
          $set: {
            status: "SENT",
            providerMessageId: sent.messageId,
            sentAt: new Date(),
            failureReason: null,
            retryable: false,
          },
        },
      );
    }
    return {
      mobile: number.lookup,
      expiresInSec: config.otpTtlSec,
      resendAfterSec: config.otpResendCooldownSec,
    };
  } catch (error) {
    const reason = sanitizeProviderError(error, code);
    // Log the sanitised provider/network cause so a live failure is
    // diagnosable without exposing the OTP, token, or customer number.
    console.error("[whatsapp] OTP delivery failed", {
      ...whatsAppErrorDiagnostics(error),
      reason,
    });
    const friendly = friendlyDeliveryError(error);
    await M.updateOne(
      { _id: otp._id },
      {
        $set: {
          deliveryStatus: "FAILED",
          providerError: reason,
          expiresAt: new Date(),
          codeHash: "undelivered",
        },
      },
    ).catch(() => undefined);
    if (auditId) {
      await Notifications.updateOne(
        { _id: auditId },
        {
          $set: {
            status: "FAILED",
            failureReason: reason,
            retryable: error instanceof WhatsAppError ? error.retryable : false,
          },
          $unset: { claimedAt: 1 },
        },
      ).catch(() => undefined);
    }
    throw friendly;
  }
}

/**
 * Verify a WhatsApp OTP. The successful update is atomic, so a code cannot be
 * used twice even if two requests arrive together.
 */
export async function verifyWhatsAppOTP(
  input: string,
  code: string,
  countryCode = "91",
  options: VerifyWhatsAppOtpOptions = {},
): Promise<VerifyWhatsAppOtpResult> {
  const number = normaliseWhatsAppNumber(input, countryCode);
  if (!number || !/^\d{6}$/.test(code)) return { ok: false, reason: "INVALID" };

  const M = OtpModel(await getWebConnection());
  const now = new Date();
  const doc = await M.findOne({ mobile: number.lookup }).sort({ createdAt: -1 }).lean<AnyDoc>();
  if (!doc) return { ok: false, reason: "EXPIRED" };

  const maxAttempts = Number(doc.maxAttempts) || getWhatsAppConfig().otpMaxAttempts;
  if ((doc.attempts ?? 0) >= maxAttempts) return { ok: false, reason: "TOO_MANY_ATTEMPTS" };
  if (doc.consumedAt) return { ok: false, reason: "EXPIRED" };
  if (!doc.expiresAt || new Date(doc.expiresAt).getTime() <= now.getTime()) {
    return { ok: false, reason: "EXPIRED" };
  }

  if (!safeEqual(String(doc.codeHash), hashCode(number.lookup, code))) {
    const updated = await M.findOneAndUpdate(
      { _id: doc._id, consumedAt: { $exists: false }, expiresAt: { $gt: now } },
      { $inc: { attempts: 1 } },
      { new: true },
    ).lean<AnyDoc>();
    const attempts = Number(updated?.attempts ?? (doc.attempts ?? 0) + 1);
    if (attempts >= maxAttempts) {
      await M.updateOne({ _id: doc._id }, { $set: { consumedAt: now, codeHash: "locked" } });
      return { ok: false, reason: "TOO_MANY_ATTEMPTS" };
    }
    return { ok: false, reason: "INVALID", attemptsRemaining: Math.max(0, maxAttempts - attempts) };
  }

  const consumed = options.consume === false
    ? { ok: true }
    : await M.findOneAndUpdate(
        {
          _id: doc._id,
          codeHash: doc.codeHash,
          consumedAt: { $exists: false },
          expiresAt: { $gt: now },
        },
        { $set: { consumedAt: now, codeHash: "verified" } },
        { new: true },
      ).lean<AnyDoc>();
  if (!consumed) return { ok: false, reason: "INVALID" };

  return { ok: true, mobile: number.lookup, e164: number.e164 };
}

/* Backwards-compatible aliases used by older callers. */
export const sendOtp = sendWhatsAppOTP;
export async function verifyOtp(mobile: string, code: string): Promise<boolean> {
  return (await verifyWhatsAppOTP(mobile, code)).ok;
}
