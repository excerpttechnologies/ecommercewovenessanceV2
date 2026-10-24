import type { NextRequest } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/api/body";
import { handler, ok } from "@/lib/api/response";
import { assistantCovers, assistantErrorMessage, runAssistant, type AssistantEvent } from "@/lib/admin/assistant";
import { requireAdmin } from "@/lib/auth";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

const MAX_MESSAGES = 60;

/** GET /api/v1/admin/assistant — what the assistant can look up for this admin, and whether a key is configured. */
export const GET = handler(async () => {
  const session = await requireAdmin("dashboard:read");
  return ok({ hasApiKey: !!env.NVIDIA_API_KEY, model: env.NVIDIA_MODEL, covers: assistantCovers(session), maxMessages: MAX_MESSAGES });
});

const Body = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(8000) }))
    .min(1)
    .max(MAX_MESSAGES)
    .refine((m) => m[0].role === "user" && m[m.length - 1].role === "user", "The conversation must start and end with a user message"),
});

/**
 * POST /api/v1/admin/assistant { messages: [{ role, content }] }
 * Streams newline-delimited JSON events: {type:"activity"|"text"|"error"|"done"}.
 */
export const POST = handler(async (req: NextRequest) => {
  const session = await requireAdmin("dashboard:read");
  const b = await parseBody(req, Body);
  if (!b.ok) return b.res;

  const abort = new AbortController();
  req.signal.addEventListener("abort", () => abort.abort(), { once: true });
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (e: AssistantEvent) => {
        if (abort.signal.aborted) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(e)}\n`));
        } catch {
          abort.abort(); // the browser went away
        }
      };
      try {
        await runAssistant(session, b.data.messages, emit, abort.signal);
        emit({ type: "done" });
      } catch (e) {
        if (!abort.signal.aborted) emit({ type: "error", message: assistantErrorMessage(e) });
      } finally {
        try {
          controller.close();
        } catch {}
      }
    },
    cancel() {
      abort.abort();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store, no-transform", "X-Accel-Buffering": "no" } });
});
