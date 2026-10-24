import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { buildOpenApi } from "@/lib/openapi";

export const dynamic = "force-static";
/** GET /api/docs → OpenAPI JSON. Swagger UI at /api/docs/ui. */
export function GET() {
  return NextResponse.json(buildOpenApi(env.NEXT_PUBLIC_SITE_URL), { headers: { "Cache-Control": "public, max-age=300" } });
}
