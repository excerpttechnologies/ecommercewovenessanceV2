import { afterEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import { createGatewayOrder, isRazorpayConfigured, verifyRazorpayPayment } from "@/lib/payments";

const keyId = "rzp_test_public";
const keySecret = "test_secret";
const signedPayment = (orderId: string, paymentId: string) => ({
  orderId,
  paymentId,
  signature: createHmac("sha256", keySecret).update(`${orderId}|${paymentId}`).digest("hex"),
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Razorpay checkout", () => {
  it("does not simulate payment when credentials are missing", async () => {
    vi.stubEnv("RAZORPAY_KEY_ID", "");
    vi.stubEnv("RAZORPAY_KEY_SECRET", "");

    expect(isRazorpayConfigured()).toBe(false);
    await expect(createGatewayOrder(100, "cart-receipt")).rejects.toThrow("Online payments are not configured");
  });

  it("creates a real INR gateway order in paise", async () => {
    vi.stubEnv("RAZORPAY_KEY_ID", keyId);
    vi.stubEnv("RAZORPAY_KEY_SECRET", keySecret);
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(JSON.stringify({ id: "order_real_123", amount: 125050, currency: "INR" }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const order = await createGatewayOrder(1250.5, "cart-token");

    expect(order).toEqual({
      gateway: "razorpay",
      gatewayOrderId: "order_real_123",
      amount: 125050,
      currency: "INR",
      keyId,
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("https://api.razorpay.com/v1/orders");
    expect(JSON.parse(String(init?.body))).toMatchObject({ amount: 125050, currency: "INR" });
    expect(new Headers(init?.headers).get("authorization")).toMatch(/^Basic /);
  });

  it("validates the signed Razorpay payment and captures an authorized payment", async () => {
    vi.stubEnv("RAZORPAY_KEY_ID", keyId);
    vi.stubEnv("RAZORPAY_KEY_SECRET", keySecret);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        order_id: "order_real_123",
        amount: 125050,
        currency: "INR",
        status: "authorized",
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        order_id: "order_real_123",
        amount: 125050,
        currency: "INR",
        status: "captured",
      }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(verifyRazorpayPayment(signedPayment("order_real_123", "pay_real_456"), 1250.5)).resolves.toBe(true);
    expect(String(fetchMock.mock.calls[0][0])).toContain("/payments/pay_real_456");
    expect(String(fetchMock.mock.calls[1][0])).toContain("/payments/pay_real_456/capture");
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({ amount: 125050, currency: "INR" });
  });

  it("rejects invalid signatures and mismatched payment amounts", async () => {
    vi.stubEnv("RAZORPAY_KEY_ID", keyId);
    vi.stubEnv("RAZORPAY_KEY_SECRET", keySecret);
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      order_id: "order_real_123",
      amount: 100,
      currency: "INR",
      status: "captured",
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(verifyRazorpayPayment({ ...signedPayment("order_real_123", "pay_real_456"), signature: "bad" }, 1)).resolves.toBe(false);
    await expect(verifyRazorpayPayment(signedPayment("order_real_123", "pay_real_456"), 2)).resolves.toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
