import type { z } from "zod";
import { fail } from "./response";

/** Parse + validate a JSON body. Returns the NextResponse on failure. */
export async function parseBody<T extends z.ZodTypeAny>(req: Request, schema: T): Promise<{ ok: true; data: z.infer<T> } | { ok: false; res: Response }> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return { ok: false, res: fail("BAD_JSON", "Request body must be valid JSON", 400) };
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) return { ok: false, res: fail("VALIDATION_ERROR", "Invalid request body", 422, parsed.error.flatten()) };
  return { ok: true, data: parsed.data };
}
