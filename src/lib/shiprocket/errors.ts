/** Typed, sanitised errors for the Shiprocket integration. */
export class ShiprocketError extends Error {
  readonly code: string;
  readonly status: number;
  readonly retryable: boolean;
  readonly details?: unknown;
  /** HTTP status returned by Shiprocket, when the failure came from an HTTP response. */
  readonly upstreamStatus?: number;

  constructor(
    code: string,
    message: string,
    opts: { status?: number; retryable?: boolean; details?: unknown; upstreamStatus?: number } = {},
  ) {
    super(message);
    this.name = "ShiprocketError";
    this.code = code;
    this.status = opts.status ?? 502;
    this.retryable = opts.retryable ?? false;
    this.details = opts.details;
    this.upstreamStatus = opts.upstreamStatus;
  }
}

export function isShiprocketError(value: unknown): value is ShiprocketError {
  return value instanceof ShiprocketError;
}

/** Never log request bodies (addresses/phone numbers) or auth headers. */
export function safeError(value: unknown): {
  code: string;
  message: string;
  status: number;
  retryable: boolean;
  upstreamStatus?: number;
} {
  if (isShiprocketError(value)) {
    return {
      code: value.code,
      message: value.message,
      status: value.status,
      retryable: value.retryable,
      upstreamStatus: value.upstreamStatus,
    };
  }
  const message = value instanceof Error ? value.message : "Shiprocket request failed";
  return {
    code: "SHIPROCKET_ERROR",
    message: message.slice(0, 300),
    status: 502,
    retryable: false,
  };
}
