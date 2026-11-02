import { afterEach, describe, expect, it, vi } from "vitest";
import { maskWhatsAppNumber, normaliseWhatsAppNumber } from "@/lib/whatsapp/phone";
import { getWhatsAppConfig } from "@/lib/whatsapp/config";
import { sendWhatsAppTemplate } from "@/lib/whatsapp/client";
import { buildOrderTemplateParams, orderTemplateValues, otpTemplateComponents } from "@/lib/whatsapp/templates";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("WhatsApp phone normalisation", () => {
  it("accepts Indian numbers with spaces, +91, or a trunk zero", () => {
    for (const input of ["9876543210", "+91 98765 43210", "09876543210", "91 9876543210"]) {
      const number = normaliseWhatsAppNumber(input, "91");
      expect(number).toMatchObject({ e164: "919876543210", lookup: "9876543210", countryCode: "91" });
    }
  });

  it("accepts other selected country codes and stores E.164 for lookup", () => {
    expect(normaliseWhatsAppNumber("0501234567", "971")).toMatchObject({
      e164: "971501234567",
      lookup: "971501234567",
    });
    expect(normaliseWhatsAppNumber("4155552671", "1")).toMatchObject({ e164: "14155552671" });
  });

  it("rejects invalid Indian numbers and unsupported codes", () => {
    expect(normaliseWhatsAppNumber("1234567890", "91")).toBeNull();
    expect(normaliseWhatsAppNumber("98765", "91")).toBeNull();
    expect(normaliseWhatsAppNumber("9876543210", "999")).toBeNull();
  });

  it("masks a number for admin screens", () => {
    expect(maskWhatsAppNumber("919876543210")).toBe("91••••••3210");
    expect(maskWhatsAppNumber("")).toBe("—");
  });
});

describe("WhatsApp templates", () => {
  const order = {
    orderNo: "WE-1001",
    createdAt: "2026-01-02T10:00:00Z",
    paymentMode: "RAZORPAY",
    paymentStatus: "Paid",
    netAmount: 1234.5,
    paymentTransactionId: "pay_abc",
    shippingAddress: { name: "Asha Rao", phone: "9876543210" },
  };

  it("maps order values in the configured parameter order", () => {
    expect(
      buildOrderTemplateParams(order, ["customerName", "orderNumber", "paymentMethod", "totalAmount", "paymentStatus", "paymentReference"]),
    ).toEqual(["Asha Rao", "WE-1001", "Razorpay (Online)", "1,234.50", "Successful", "pay_abc"]);
    expect(orderTemplateValues(order).orderStatus).toBe("Confirmed");
  });

  it("builds a body-only authentication template by default", () => {
    expect(otpTemplateComponents("123456")).toEqual([
      { type: "body", parameters: [{ type: "text", text: "123456" }] },
    ]);
  });

  it("builds the approved two-parameter template with its copy-code button", () => {
    expect(
      otpTemplateComponents("123456", { bodyParams: 2, includeButton: true, purpose: "Login" }),
    ).toEqual([
      {
        type: "body",
        parameters: [
          { type: "text", text: "123456" },
          { type: "text", text: "Login" },
        ],
      },
      {
        type: "button",
        sub_type: "url",
        index: "0",
        parameters: [{ type: "text", text: "123456" }],
      },
    ]);
  });
});

describe("WhatsApp configuration", () => {
  const numericKeys = [
    "WHATSAPP_TIMEOUT_MS",
    "WHATSAPP_REQUEST_TIMEOUT_MS",
    "WHATSAPP_MAX_RETRIES",
    "WHATSAPP_OTP_TTL_SEC",
    "WHATSAPP_OTP_TTL_MINUTES",
    "WHATSAPP_OTP_RESEND_COOLDOWN_SEC",
    "WHATSAPP_OTP_RESEND_COOLDOWN_SECONDS",
    "WHATSAPP_OTP_MAX_ATTEMPTS",
    "WHATSAPP_OTP_BODY_PARAMS",
    "WHATSAPP_OTP_INCLUDE_BUTTON",
  ];

  it("uses the documented defaults when numeric env vars are absent", () => {
    for (const key of numericKeys) vi.stubEnv(key, "");
    const config = getWhatsAppConfig();
    expect(config.timeoutMs).toBe(10_000);
    expect(config.maxRetries).toBe(1);
    expect(config.otpTtlSec).toBe(300);
    expect(config.otpResendCooldownSec).toBe(30);
    expect(config.otpMaxAttempts).toBe(5);
    expect(config.otpBodyParams).toBe(1);
    expect(config.otpIncludeButton).toBe(false);
  });

  it("supports the existing deployment env names", () => {
    vi.stubEnv("WHATSAPP_TEMPLATE_LANGUAGE", "en_US");
    vi.stubEnv("WHATSAPP_REQUEST_TIMEOUT_MS", "8000");
    vi.stubEnv("WHATSAPP_OTP_RESEND_COOLDOWN_SECONDS", "60");
    vi.stubEnv("WHATSAPP_OTP_TTL_MINUTES", "5");
    vi.stubEnv("WHATSAPP_OTP_TTL_SEC", "");
    vi.stubEnv("WHATSAPP_OTP_BODY_PARAMS", "2");
    vi.stubEnv("WHATSAPP_OTP_INCLUDE_BUTTON", "true");
    const config = getWhatsAppConfig();
    expect(config.otpTemplateLang).toBe("en_US");
    expect(config.orderTemplateLang).toBe("en_US");
    expect(config.timeoutMs).toBe(8000);
    expect(config.otpResendCooldownSec).toBe(60);
    expect(config.otpTtlSec).toBe(300);
    expect(config.otpBodyParams).toBe(2);
    expect(config.otpIncludeButton).toBe(true);
  });
});

describe("WhatsApp client", () => {
  it("sends the approved language, body parameters, and copy-code button", async () => {
    vi.stubEnv("WHATSAPP_ENABLED", "true");
    vi.stubEnv("WHATSAPP_ACCESS_TOKEN", "test-token");
    vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID", "123456");
    vi.stubEnv("WHATSAPP_API_VERSION", "v26.0");
    vi.stubEnv("WHATSAPP_TIMEOUT_MS", "5000");
    vi.stubEnv("WHATSAPP_OTP_BODY_PARAMS", "2");
    vi.stubEnv("WHATSAPP_OTP_INCLUDE_BUTTON", "true");
    vi.stubEnv("WHATSAPP_OTP_TEMPLATE", "wovenessence_otp");
    vi.stubEnv("WHATSAPP_TEMPLATE_LANGUAGE", "en_US");

    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ messages: [{ id: "wamid.test" }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const config = getWhatsAppConfig();
    await sendWhatsAppTemplate(
      {
        to: "919876543210",
        name: config.otpTemplate,
        language: config.otpTemplateLang,
        components: otpTemplateComponents("123456", {
          bodyParams: config.otpBodyParams,
          includeButton: config.otpIncludeButton,
          purpose: config.otpPurpose,
        }),
      },
      config,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("https://graph.facebook.com/v26.0/123456/messages");
    const body = JSON.parse(String(init?.body)) as {
      template: { language: { code: string }; components: unknown[] };
    };
    expect(body.template.language.code).toBe("en_US");
    expect(body.template.components).toEqual([
      {
        type: "body",
        parameters: [
          { type: "text", text: "123456" },
          { type: "text", text: "Login" },
        ],
      },
      {
        type: "button",
        sub_type: "url",
        index: "0",
        parameters: [{ type: "text", text: "123456" }],
      },
    ]);
  });

  it("keeps sanitised provider diagnostics for server logs", async () => {
    vi.stubEnv("WHATSAPP_ENABLED", "true");
    vi.stubEnv("WHATSAPP_ACCESS_TOKEN", "test-token");
    vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID", "123456");
    vi.stubEnv("WHATSAPP_API_VERSION", "v26.0");
    vi.stubEnv("WHATSAPP_MAX_RETRIES", "0");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            message: "Template not found",
            code: 132001,
            type: "OAuthException",
            fbtrace_id: "trace-1",
          },
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      ),
    );

    const config = getWhatsAppConfig();
    await expect(
      sendWhatsAppTemplate({ to: "919876543210", name: "wovenessence_otp", language: "en_US" }, config),
    ).rejects.toMatchObject({
      code: "WHATSAPP_REJECTED",
      providerCode: 132001,
      diagnostics: { httpStatus: 400, traceId: "trace-1" },
    });
  });
});

describe("WhatsApp order parameter configuration", () => {
  it("preserves repeated keys because each one maps to a template placeholder", () => {
    vi.stubEnv("WHATSAPP_ORDER_TEMPLATE_PARAMS", "customerName,totalAmount,totalAmount,orderNumber");
    expect(getWhatsAppConfig().orderTemplateParams).toEqual([
      "customerName",
      "totalAmount",
      "totalAmount",
      "orderNumber",
    ]);
  });

  it("falls back to the documented order when a key is unknown", () => {
    vi.stubEnv("WHATSAPP_ORDER_TEMPLATE_PARAMS", "customerName,notAKey");
    expect(getWhatsAppConfig().orderTemplateParams).toEqual([
      "customerName",
      "orderNumber",
      "orderDate",
      "paymentMethod",
      "totalAmount",
      "paymentStatus",
      "paymentReference",
    ]);
  });
});
