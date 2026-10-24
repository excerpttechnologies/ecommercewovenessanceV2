import type { NextRequest } from "next/server";
import { handler, ok } from "@/lib/api/response";
import { requireCustomer } from "@/lib/auth";
import { getOrders } from "@/repositories";

export const dynamic = "force-dynamic";

export const GET = handler(async (req: NextRequest) => {
  const s = await requireCustomer();
  const page = Number(req.nextUrl.searchParams.get("page") ?? 1);
  const { items, ...meta } = await getOrders().listByCustomer(s.sub, { page, limit: 10 });
  return ok(items, meta);
});
