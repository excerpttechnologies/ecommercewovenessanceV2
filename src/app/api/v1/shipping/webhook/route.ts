import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { applyShippingWebhook, verifyWebhookToken } from "@/lib/shiprocket";

export const dynamic = "force-dynamic";

/**
 * Shiprocket tracking webhook.
 * URL   : https://<site>/api/v1/shipping/webhook   (Shiprocket rejects URLs containing "shiprocket")
 * Token : SHIPROCKET_WEBHOOK_TOKEN (sent in the x-api-key header)
 *
 * Only authenticated events can update orders. Duplicate events are ignored and
 * an out-of-order event can never move a delivered/cancelled order backwards.
 */

// Shiprocket probes the URL when you save it.
export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const auth = verifyWebhookToken(req.headers);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.reason === "not_configured" ? "Webhook token not configured" : "Unauthorized" },
      { status: auth.reason === "not_configured" ? 503 : 401 },
    );
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
    const result = await applyShippingWebhook(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[shiprocket webhook]", error instanceof Error ? error.message : error);
    // A 500 makes Shiprocket retry, which is what we want for transient failures.
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
