import { getWhatsAppConfig, whatsappOtpConfigured, whatsappOrderConfigured, type OrderTemplateParamKey, type WhatsAppConfig } from "./config";
import { sendWhatsAppTemplate, WhatsAppError, type WhatsAppTemplateComponent } from "./client";

/** Template builders for the two WhatsApp messages the website sends. */

export interface OrderMessageSource {
  orderNo: string;
  createdAt?: Date | string;
  paymentMode?: string;
  paymentStatus?: string;
  orderStatus?: string;
  netAmount?: number;
  paymentTransactionId?: string | null;
  paymentGatewayOrderId?: string | null;
  shippingAddress?: { name?: string; phone?: string };
}

const amount = (value: unknown) =>
  new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    Number.isFinite(Number(value)) ? Number(value) : 0,
  );

const orderDate = (value?: Date | string) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(date);
};

const paymentMethod = (value?: string) => {
  const mode = String(value ?? "").toUpperCase();
  if (mode === "RAZORPAY") return "Razorpay (Online)";
  if (mode === "COD") return "Cash on Delivery";
  if (mode === "UPI") return "UPI";
  if (mode === "CARD") return "Card";
  return mode || "Online";
};

const safeParam = (value: unknown) => {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text ? text.slice(0, 900) : "—";
};

/** Order values available to an approved utility template. */
export function orderTemplateValues(order: OrderMessageSource): Record<OrderTemplateParamKey, string> {
  return {
    customerName: safeParam(order.shippingAddress?.name || "Customer"),
    orderNumber: safeParam(order.orderNo),
    orderDate: safeParam(orderDate(order.createdAt)),
    paymentMethod: safeParam(paymentMethod(order.paymentMode)),
    totalAmount: safeParam(amount(order.netAmount)),
    paymentStatus: safeParam(order.paymentStatus === "Paid" ? "Successful" : order.paymentStatus || "Successful"),
    paymentReference: safeParam(order.paymentTransactionId || order.paymentGatewayOrderId || "—"),
    orderStatus: safeParam(order.orderStatus || "Confirmed"),
  };
}

export function buildOrderTemplateParams(
  order: OrderMessageSource,
  keys: OrderTemplateParamKey[] = getWhatsAppConfig().orderTemplateParams,
): string[] {
  const values = orderTemplateValues(order);
  return keys.map((key) => values[key]);
}

export function orderTemplateComponents(
  order: OrderMessageSource,
  keys: OrderTemplateParamKey[] = getWhatsAppConfig().orderTemplateParams,
): WhatsAppTemplateComponent[] {
  return [
    {
      type: "body",
      parameters: buildOrderTemplateParams(order, keys).map((text) => ({ type: "text", text })),
    },
  ];
}

export interface OtpTemplateOptions {
  /** Number of body placeholders in the approved template (1 or 2). */
  bodyParams?: number;
  /** Add the copy-code button component required by some authentication templates. */
  includeButton?: boolean;
  /** Value for the second body placeholder, e.g. "Login". */
  purpose?: string;
}

export function otpTemplateComponents(
  code: string,
  options: OtpTemplateOptions = {},
): WhatsAppTemplateComponent[] {
  const bodyParams = Math.min(2, Math.max(1, Math.round(options.bodyParams ?? 1)));
  const parameters: { type: "text"; text: string }[] = [{ type: "text", text: code }];
  if (bodyParams >= 2) {
    parameters.push({ type: "text", text: options.purpose?.trim() || "Login" });
  }
  const components: WhatsAppTemplateComponent[] = [{ type: "body", parameters }];

  // Meta authentication templates with a `COPY_CODE` button require the code
  // in both the body and the URL button parameter. This is Meta's
  // whatsapp.com/otp/code URL, not a Woven Essence URL; the code is never put
  // in the site URL, returned to the browser, or logged.
  if (options.includeButton) {
    components.push({
      type: "button",
      sub_type: "url",
      index: "0",
      parameters: [{ type: "text", text: code }],
    });
  }
  return components;
}

/** Authentication-template OTP delivery. */
export async function sendWhatsAppOtpCode(
  to: string,
  code: string,
  config: WhatsAppConfig = getWhatsAppConfig(),
): Promise<{ messageId: string }> {
  if (!whatsappOtpConfigured(config)) {
    throw new WhatsAppError(
      "WHATSAPP_OTP_NOT_CONFIGURED",
      "WhatsApp OTP is not configured. Add WHATSAPP_OTP_TEMPLATE on the server.",
      503,
      false,
    );
  }
  return sendWhatsAppTemplate(
    {
      to,
      name: config.otpTemplate,
      language: config.otpTemplateLang,
      components: otpTemplateComponents(code, {
        bodyParams: config.otpBodyParams,
        includeButton: config.otpIncludeButton,
        purpose: config.otpPurpose,
      }),
    },
    config,
  );
}

/** Approved utility-template order payment confirmation. */
export async function sendOrderPaymentTemplate(
  to: string,
  order: OrderMessageSource,
  config: WhatsAppConfig = getWhatsAppConfig(),
): Promise<{ messageId: string }> {
  if (!whatsappOrderConfigured(config)) {
    throw new WhatsAppError(
      "WHATSAPP_ORDER_NOT_CONFIGURED",
      "WhatsApp order notifications are not configured. Add WHATSAPP_ORDER_TEMPLATE on the server.",
      503,
      false,
    );
  }
  return sendWhatsAppTemplate(
    {
      to,
      name: config.orderTemplate,
      language: config.orderTemplateLang,
      components: orderTemplateComponents(order, config.orderTemplateParams),
    },
    config,
  );
}
