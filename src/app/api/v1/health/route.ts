import { ok } from "@/lib/api/response";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  return ok({ status: "ok", dataSource: env.DATA_SOURCE, time: new Date().toISOString() });
}
