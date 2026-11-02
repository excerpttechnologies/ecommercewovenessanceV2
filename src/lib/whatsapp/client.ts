import { getWhatsAppConfig, whatsappCredentialsConfigured, type WhatsAppConfig } from "./config";
import { normaliseWhatsAppNumber } from "./phone";

/** Server-only WhatsApp Cloud API client. Never logs the access token. */

export type WhatsAppTemplateComponent =
  | { type: "body"; parameters: { type: "text"; text: string }[] }
  | { type: "button"; sub_type: "url"; index: string; parameters: { type: "text"; text: string }[] };

export interface SendWhatsAppTemplateInput {
  /** E.164 digits, e.g. 919876543210. */
  to: string;
  name: string;
  language: string;
  components?: WhatsAppTemplateComponent[];
}

export interface WhatsAppSendResult {
  messageId: string;
}

/** Sanitised provider/network details for server logs and admin diagnostics. */
export interface WhatsAppErrorDiagnostics {
  httpStatus?: number;
  providerCode?: string | number;
  providerSubcode?: string | number;
  providerType?: string;
  providerDetails?: string;
  traceId?: string;
  networkCode?: string;
  networkMessage?: string;
}

export class WhatsAppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 502,
    public retryable = false,
    public providerCode?: string | number,
    public diagnostics?: WhatsAppErrorDiagnostics,
  ) {
    super(message);
    this.name = "WhatsAppError";
  }
}

/** Log-safe view; never includes the access token or the message payload. */
export function whatsAppErrorDiagnostics(error: unknown): Record<string, unknown> {
  if (!(error instanceof WhatsAppError)) return { code: "UNKNOWN" };
  return {
    code: error.code,
    retryable: error.retryable,
    providerCode: error.providerCode,
    ...error.diagnostics,
  };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function providerError(json: unknown): {
  message: string;
  code?: string | number;
  subcode?: string | number;
  type?: string;
  details?: string;
  traceId?: string;
} {
  const error = (
    json as {
      error?: {
        message?: string;
        code?: number | string;
        error_subcode?: number | string;
        type?: string;
        error_data?: { details?: string };
        fbtrace_id?: string;
      };
    }
  )?.error;
  return {
    message: typeof error?.message === "string" ? error.message.slice(0, 300) : "",
    code: error?.code,
    subcode: error?.error_subcode,
    type: typeof error?.type === "string" ? error.type : undefined,
    details: typeof error?.error_data?.details === "string" ? error.error_data.details.slice(0, 300) : undefined,
    traceId: typeof error?.fbtrace_id === "string" ? error.fbtrace_id : undefined,
  };
}

/**
 * Send one template message through Meta's Graph API. Transient failures
 * (network, timeout, HTTP 429, HTTP 5xx) are retried; template/credential
 * errors fail fast so the caller can record a useful notification status.
 */
export async function sendWhatsAppTemplate(
  input: SendWhatsAppTemplateInput,
  config: WhatsAppConfig = getWhatsAppConfig(),
): Promise<WhatsAppSendResult> {
  if (!whatsappCredentialsConfigured(config)) {
    throw new WhatsAppError(
      "WHATSAPP_NOT_CONFIGURED",
      "WhatsApp is not configured on the server. Add WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID.",
      503,
      false,
    );
  }

  const recipient = normaliseWhatsAppNumber(input.to)?.e164 ?? input.to.replace(/\D/g, "");
  if (!/^\d{8,15}$/.test(recipient)) {
    throw new WhatsAppError("WHATSAPP_BAD_NUMBER", "The WhatsApp number is invalid.", 422, false);
  }

  if (process.env.NODE_ENV === "production" && !config.graphBaseUrl.startsWith("https://")) {
    throw new WhatsAppError("WHATSAPP_INSECURE_URL", "WhatsApp API requests must use HTTPS.", 500, false);
  }

  const url = `${config.graphBaseUrl}/${config.apiVersion}/${encodeURIComponent(config.phoneNumberId)}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipient,
    type: "template",
    template: {
      name: input.name,
      language: { code: input.language },
      ...(input.components?.length ? { components: input.components } : {}),
    },
  };

  let lastError: WhatsAppError | null = null;

  for (let attempt = 0; attempt <= config.maxRetries; attempt += 1) {
    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(config.timeoutMs),
      });
    } catch (error) {
      const cause = (error as { cause?: { code?: string; message?: string } }).cause;
      lastError = new WhatsAppError(
        "WHATSAPP_UNAVAILABLE",
        "WhatsApp could not be reached. Please try again.",
        502,
        true,
        undefined,
        {
          networkCode:
            (typeof cause?.code === "string" && cause.code) ||
            (error instanceof Error ? error.name : undefined),
          networkMessage: String(cause?.message ?? (error instanceof Error ? error.message : ""))
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 300),
        },
      );
      if (attempt < config.maxRetries) {
        await sleep(400 * 2 ** attempt);
        continue;
      }
      throw lastError;
    }

    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      // Meta always returns JSON, but a proxy may not.
    }

    if (!response.ok) {
      const provider = providerError(body);
      const retryable = response.status === 429 || response.status >= 500;
      lastError = new WhatsAppError(
        retryable ? "WHATSAPP_UNAVAILABLE" : "WHATSAPP_REJECTED",
        provider.message || `WhatsApp rejected the message (HTTP ${response.status}).`,
        502,
        retryable,
        provider.code ?? provider.subcode,
        {
          httpStatus: response.status,
          providerCode: provider.code,
          providerSubcode: provider.subcode,
          providerType: provider.type,
          providerDetails: provider.details,
          traceId: provider.traceId,
        },
      );
      if (retryable && attempt < config.maxRetries) {
        await sleep(400 * 2 ** attempt);
        continue;
      }
      throw lastError;
    }

    const messageId = (body as { messages?: { id?: string }[] })?.messages?.[0]?.id;
    if (!messageId) {
      throw new WhatsAppError("WHATSAPP_BAD_RESPONSE", "WhatsApp did not return a message id.", 502, true);
    }
    return { messageId };
  }

  throw lastError ?? new WhatsAppError("WHATSAPP_UNAVAILABLE", "WhatsApp could not be reached.", 502, true);
}
