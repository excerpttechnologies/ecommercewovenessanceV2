import { cookies } from "next/headers";
import { handler, ok } from "@/lib/api/response";
import { CUSTOMER_COOKIE } from "@/lib/auth";

export const POST = handler(async () => {
  (await cookies()).delete(CUSTOMER_COOKIE);
  return ok({ loggedOut: true });
});
