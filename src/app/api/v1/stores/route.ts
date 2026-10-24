import { handler, ok } from "@/lib/api/response";
import { getMasterData } from "@/repositories";

export const dynamic = "force-dynamic";
export const GET = handler(async () => ok(await getMasterData().stores.list()));
