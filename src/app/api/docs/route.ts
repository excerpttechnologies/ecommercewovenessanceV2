import { NextResponse } from "next/server";
import { buildOpenApi } from "@/lib/openapi";

export const dynamic = "force-static";
/**
 * GET /api/docs → OpenAPI JSON. Swagger UI at /api/docs/ui.
 * The server URL is relative ("/api/v1"), so "Try it out" calls whichever host serves the docs.
 */
export function GET() {
  return NextResponse.json(buildOpenApi(""), { headers: { "Cache-Control": "public, max-age=300" } });
}
