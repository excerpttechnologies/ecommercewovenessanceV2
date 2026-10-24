import type { NextRequest } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/api/body";
import { handler, ok } from "@/lib/api/response";
import { addToCart, getCartView, setCartQty } from "@/lib/cart-server";

export const dynamic = "force-dynamic";

const strip = ({ token: _t, ...rest }: Awaited<ReturnType<typeof getCartView>>) => rest;

/** GET /api/v1/cart — current guest/customer cart with live prices & totals */
export const GET = handler(async () => ok(strip(await getCartView())));

/** POST /api/v1/cart { sku, qty } — add */
export const POST = handler(async (req: NextRequest) => {
  const b = await parseBody(req, z.object({ sku: z.string().min(1), qty: z.number().int().min(1).max(20).default(1) }));
  if (!b.ok) return b.res;
  return ok(strip(await addToCart(b.data.sku, b.data.qty)));
});

/** PATCH /api/v1/cart { sku, qty } — set quantity (0 removes) */
export const PATCH = handler(async (req: NextRequest) => {
  const b = await parseBody(req, z.object({ sku: z.string().min(1), qty: z.number().int().min(0).max(20) }));
  if (!b.ok) return b.res;
  return ok(strip(await setCartQty(b.data.sku, b.data.qty)));
});
