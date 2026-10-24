import type { NextRequest } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/api/body";
import { handler, ok } from "@/lib/api/response";
import { getWebConnection } from "@/lib/db";
import { EnquiryModel } from "@/models/web/commerce.models";

export const dynamic = "force-dynamic";

/** POST /api/v1/enquiries — contact form, newsletter signup, product enquiry */
export const POST = handler(async (req: NextRequest) => {
  const b = await parseBody(
    req,
    z.object({
      type: z.enum(["contact", "support", "product", "whatsapp", "newsletter"]).default("contact"),
      name: z.string().max(100).optional(),
      mobile: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile").optional(),
      email: z.string().email().optional(),
      message: z.string().max(2000).optional(),
      sku: z.string().max(60).optional(),
    }).superRefine((data, ctx) => {
      if (data.type !== "support") return;
      if (!data.name?.trim()) ctx.addIssue({ code: "custom", path: ["name"], message: "Name is required" });
      if (!data.message?.trim()) ctx.addIssue({ code: "custom", path: ["message"], message: "Message is required" });
      if (!data.mobile?.trim() && !data.email) ctx.addIssue({ code: "custom", path: ["mobile"], message: "Provide a mobile number or email" });
    }),
  );
  if (!b.ok) return b.res;
  const M = EnquiryModel(await getWebConnection());
  if (b.data.type === "newsletter" && b.data.email) {
    const exists = await M.exists({ type: "newsletter", email: b.data.email });
    if (exists) return ok({ subscribed: true, duplicate: true });
  }
  await M.create(b.data);
  return ok({ received: true }, undefined, { status: 201 });
});
