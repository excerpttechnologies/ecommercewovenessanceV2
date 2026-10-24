import { cookies } from "next/headers";
import { handler, ok } from "@/lib/api/response";
import { ADMIN_COOKIE } from "@/lib/auth";

export const POST = handler(async () => {
  (await cookies()).delete(ADMIN_COOKIE);
  return ok({ loggedOut: true });
});
