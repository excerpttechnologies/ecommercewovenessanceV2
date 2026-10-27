import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export interface GatewayOrder {
  gateway: "razorpay";
  gatewayOrderId: string;
  amount: number; // paise
  currency: "INR";
  keyId: string;
}

interface RazorpayPayment {
  order_id?: string;
  amount?: number;
  currency?: string;
  status?: string;
}

function credentials() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) {
    throw new Error("Online payments are not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to the server environment.");
  }
  return { keyId, keySecret };
}

export function isRazorpayConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID?.trim() && process.env.RAZORPAY_KEY_SECRET?.trim());
}

async function razorpayRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const { keyId, keySecret } = credentials();
  const response = await fetch(`https://api.razorpay.com/v1/${path}`, {
    ...init,
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error(`Razorpay request failed (HTTP ${response.status}). Please retry or contact support.`);
  }
  return response.json() as Promise<T>;
}

export async function createGatewayOrder(amountInr: number, receipt: string): Promise<GatewayOrder> {
  const { keyId } = credentials();
  const amount = Math.round(amountInr * 100);
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error("The order total must be greater than zero.");
  const created = await razorpayRequest<{ id?: string; amount?: number; currency?: string }>("orders", {
    method: "POST",
    body: JSON.stringify({
      amount,
      currency: "INR",
      receipt: `${receipt}-${randomBytes(6).toString("hex")}`.slice(0, 40),
    }),
  });
  if (!created.id || created.amount !== amount || created.currency !== "INR") {
    throw new Error("Razorpay returned an invalid payment order. Please retry.");
  }
  return { gateway: "razorpay", gatewayOrderId: created.id, amount, currency: "INR", keyId };
}

export function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!secret || !/^[a-f\d]{64}$/i.test(signature)) return false;
  const expected = createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest();
  const actual = Buffer.from(signature, "hex");
  return actual.length === expected.length && timingSafeEqual(expected, actual);
}

export async function verifyRazorpayPayment(
  payment: { orderId: string; paymentId: string; signature: string },
  expectedAmountInr: number,
): Promise<boolean> {
  if (!verifyRazorpaySignature(payment.orderId, payment.paymentId, payment.signature)) return false;
  const expectedAmount = Math.round(expectedAmountInr * 100);
  if (!Number.isSafeInteger(expectedAmount) || expectedAmount <= 0) return false;

  const details = await razorpayRequest<RazorpayPayment>(`payments/${encodeURIComponent(payment.paymentId)}`);
  if (
    details.order_id !== payment.orderId ||
    details.amount !== expectedAmount ||
    details.currency !== "INR"
  ) return false;
  if (details.status === "captured") return true;
  if (details.status !== "authorized") return false;

  const captured = await razorpayRequest<RazorpayPayment>(`payments/${encodeURIComponent(payment.paymentId)}/capture`, {
    method: "POST",
    body: JSON.stringify({ amount: expectedAmount, currency: "INR" }),
  });
  return captured.order_id === payment.orderId &&
    captured.amount === expectedAmount &&
    captured.currency === "INR" &&
    captured.status === "captured";
}
