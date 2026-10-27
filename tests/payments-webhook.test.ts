// [CHG-14] NEW FILE. WHY: optional test for verifyWebhookSignature (accepts a correctly signed body, rejects tampered/wrong-secret/missing-secret). Run: npm test
import { afterEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import { verifyWebhookSignature } from "@/lib/payments";

const secret = "whsec_test";
const body = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: "pay_1", order_id: "order_1" } } } });
const sign = (raw: string, key = secret) => createHmac("sha256", key).update(raw).digest("hex");

afterEach(() => vi.unstubAllEnvs());

describe("Razorpay webhook signature", () => {
  it("accepts a correctly signed raw body", () => {
    vi.stubEnv("RAZORPAY_WEBHOOK_SECRET", secret);
    expect(verifyWebhookSignature(body, sign(body))).toBe(true);
  });

  it("rejects a tampered body, a wrong secret, a malformed signature, or a missing secret", () => {
    vi.stubEnv("RAZORPAY_WEBHOOK_SECRET", secret);
    expect(verifyWebhookSignature(body + " ", sign(body))).toBe(false);
    expect(verifyWebhookSignature(body, sign(body, "other"))).toBe(false);
    expect(verifyWebhookSignature(body, "abc")).toBe(false);
    vi.stubEnv("RAZORPAY_WEBHOOK_SECRET", "");
    expect(verifyWebhookSignature(body, sign(body))).toBe(false);
  });
});
