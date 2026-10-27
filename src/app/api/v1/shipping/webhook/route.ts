import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getWebConnection } from "@/lib/db";
import { OrderModel } from "@/models/erp/order.model";
import type { AnyDoc } from "@/models/_util";

export const dynamic = "force-dynamic";

/**
 * NEW: Shiprocket tracking webhook.
 * Set in Shiprocket → Settings → API → Webhooks:
 *   URL   : https://ecom.wovenessence.in/api/v1/shipping/webhook   (Shiprocket rejects URLs containing "shiprocket")
 *   Token : same value as SHIPROCKET_WEBHOOK_TOKEN (Shiprocket sends it in the x-api-key header)
 * Only moves an order FORWARD (never back from Delivered) and only touches website orders.
 */

const RANK: Record<string, number> = { Placed: 0, Confirmed: 1, Packed: 2, Shipped: 3, "Out for delivery": 4, Delivered: 5 };

function mapStatus(raw: string): string | null {
  const s = raw.trim().toUpperCase();
  if (s === "DELIVERED") return "Delivered";
  if (s === "OUT FOR DELIVERY") return "Out for delivery";
  if (["PICKED UP", "SHIPPED", "IN TRANSIT", "REACHED AT DESTINATION HUB", "REACHED DESTINATION HUB"].includes(s)) return "Shipped";
  if (s === "CANCELED" || s === "CANCELLED") return "Cancelled";
  if (s.startsWith("RTO") && s.includes("DELIVERED")) return "Returned";
  return null; // ignore anything we don't map (pickup scheduled, NDR, etc.)
}

function tokenOk(received: string | null): boolean {
  const expected = process.env.SHIPROCKET_WEBHOOK_TOKEN?.trim();
  if (!expected || !received) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Shiprocket may probe the URL when you save it.
export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  if (!process.env.SHIPROCKET_WEBHOOK_TOKEN?.trim()) {
    return NextResponse.json({ ok: false, error: "Webhook token not configured" }, { status: 503 });
  }
  if (!tokenOk(req.headers.get("x-api-key"))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const p = (await req.json()) as { awb?: string; order_id?: string; current_status?: string; shipment_status?: string };
    const raw = p.current_status || p.shipment_status || "";
    const next = mapStatus(raw);
    const orderNo = p.order_id ? String(p.order_id) : undefined;
    const awb = p.awb ? String(p.awb) : undefined;
    if (!next || (!orderNo && !awb)) return NextResponse.json({ ok: true, ignored: true });

    const M = OrderModel(await getWebConnection());
    const doc = await M.findOne(orderNo ? { orderNo } : { awbNo: awb }).lean<AnyDoc>();
    if (!doc) return NextResponse.json({ ok: true, ignored: true });

    const current = String(doc.orderStatus);
    const forward =
      next === "Cancelled" || next === "Returned"
        ? current !== "Delivered" && current !== next
        : (RANK[next] ?? -1) > (RANK[current] ?? -1);
    if (!forward) return NextResponse.json({ ok: true, ignored: true });

    await M.updateOne(
      { orderNo: doc.orderNo },
      {
        $set: { orderStatus: next, ...(awb && !doc.awbNo ? { awbNo: awb } : {}) },
        $push: { statusHistory: { status: next, note: `Shiprocket: ${raw}`, by: "shiprocket", at: new Date() } },
      },
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[shiprocket webhook]", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
