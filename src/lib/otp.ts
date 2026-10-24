import { createHash, randomInt } from "node:crypto";
import { getWebConnection } from "@/lib/db";
import { env } from "@/lib/env";
import { OtpModel } from "@/models/web/commerce.models";

const hash = (mobile: string, code: string) => createHash("sha256").update(`${mobile}:${code}:${env.JWT_SECRET}`).digest("hex");

export function normaliseMobile(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  const ten = digits.length > 10 ? digits.slice(-10) : digits;
  return /^[6-9]\d{9}$/.test(ten) ? ten : null;
}

/**
 * OTP provider stub. In production replace `deliver()` with MSG91 / Twilio / WhatsApp Business.
 * In development the code is printed to the server console and returned as `devOtp`.
 */
export async function sendOtp(mobile: string): Promise<{ devOtp?: string; expiresInSec: number }> {
  const M = OtpModel(await getWebConnection());
  const recent = await M.countDocuments({ mobile, expiresAt: { $gt: new Date(Date.now() - 60_000) } });
  if (recent >= 3) throw Object.assign(new Error("Too many OTP requests. Try again in a minute."), { status: 429, code: "RATE_LIMITED" });
  const code = String(randomInt(100000, 999999));
  const expiresAt = new Date(Date.now() + 5 * 60_000);
  await M.deleteMany({ mobile });
  await M.create({ mobile, codeHash: hash(mobile, code), expiresAt });
  await deliver(mobile, code);
  return { expiresInSec: 300, ...(env.NODE_ENV !== "production" ? { devOtp: code } : {}) };
}

async function deliver(mobile: string, code: string) {
  // TODO: integrate SMS/WhatsApp provider
  console.log(`[otp] ${mobile} → ${code}`);
}

export async function verifyOtp(mobile: string, code: string): Promise<boolean> {
  const M = OtpModel(await getWebConnection());
  const doc = await M.findOne({ mobile, expiresAt: { $gt: new Date() } });
  if (!doc) return false;
  if (doc.attempts >= 5) {
    await M.deleteOne({ _id: doc._id });
    return false;
  }
  if (doc.codeHash !== hash(mobile, code)) {
    await M.updateOne({ _id: doc._id }, { $inc: { attempts: 1 } });
    return false;
  }
  await M.deleteOne({ _id: doc._id });
  return true;
}
