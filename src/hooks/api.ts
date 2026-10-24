"use client";

export class ApiError extends Error {
  constructor(public code: string, message: string, public status: number, public details?: unknown) {
    super(message);
  }
}

/** Thin fetch wrapper for the /api/v1 envelope. */
export async function api<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<{ data: T; meta?: Record<string, unknown> }> {
  const { json, ...rest } = init ?? {};
  const res = await fetch(path, {
    ...rest,
    headers: { ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...(rest.headers ?? {}) },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
    credentials: "same-origin",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.ok === false) {
    const e = body.error ?? {};
    throw new ApiError(e.code ?? "HTTP_ERROR", e.message ?? res.statusText, res.status, e.details);
  }
  return { data: body.data as T, meta: body.meta };
}
