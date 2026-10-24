import { handler, ok } from "@/lib/api/response";
import { getMasterData } from "@/repositories";

export const dynamic = "force-dynamic";

/** GET /api/v1/categories — nested tree used by the mega-menu and category tiles */
export const GET = handler(async () => ok(await getMasterData().categories.tree()));
