import OpenAI from "openai";
import { z } from "zod/v4"; // for z.toJSONSchema (shipped inside zod 3.25+)
import type { Order, OrderStatus } from "@/domain/types";
import { dashboardStats, reports } from "@/lib/admin/stats";
import { hasPermission, type AdminSession } from "@/lib/auth";
import { redactMongoUri } from "@/lib/db";
import { env } from "@/lib/env";
import type { Permission } from "@/models/web/commerce.models";
import { getBarcodeLabels, getOrders } from "@/repositories";

/**
 * Admin AI assistant — server-only. A model served by NVIDIA's API (OpenAI-compatible, NVIDIA_API_KEY)
 * answers staff questions from live store data through read-only tools. A tool is only offered when
 * the signed-in admin holds its permission, so the assistant can never show more than the admin
 * pages would.
 */

const MAX_ITERATIONS = 8; // model requests per question (each tool round-trip is one)
const MAX_ROWS = 25;
const MAX_TOKENS = 8192; // per model request; reasoning models spend part of it on thinking

export interface AssistantTurn {
  role: "user" | "assistant";
  content: string;
}
export type AssistantEvent = { type: "text"; text: string } | { type: "activity"; label: string } | { type: "error"; message: string } | { type: "done" };

const ORDER_STATUSES = ["Placed", "Confirmed", "Packed", "Shipped", "Out for delivery", "Delivered", "Cancelled", "Returned"] as const satisfies readonly OrderStatus[];
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("Calendar date, YYYY-MM-DD (UTC)");
const page = z.coerce.number().int().min(1).optional().describe("Page number, starting at 1");
const limit = z.coerce.number().int().min(1).optional().describe(`Rows per page, at most ${MAX_ROWS}`);
const rows = (n: number | undefined) => Math.min(MAX_ROWS, n ?? 10);
const startOf = (d: string) => new Date(`${d}T00:00:00.000Z`);
const endOf = (d: string) => new Date(`${d}T23:59:59.999Z`);

/** A failed lookup is logged here; the model is only told that it failed, never the database error. */
async function lookup(name: string, fn: () => Promise<unknown>): Promise<string> {
  try {
    return JSON.stringify(await fn());
  } catch (e) {
    console.error(`[admin/assistant] ${name} failed:`, redactMongoUri(String((e as Error)?.message ?? e)));
    return JSON.stringify({ error: "This lookup failed because the data source is unavailable right now." });
  }
}

/** Models often send null or "" for optional arguments they do not use. */
const dropBlanks = (o: unknown) => (o && typeof o === "object" && !Array.isArray(o) ? Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== "")) : o);

interface AssistantTool {
  perm: Permission;
  /** What the admin can ask about (shown in the UI and the system prompt). */
  covers: string;
  /** Shown while the tool runs. */
  activity: string;
  spec: OpenAI.Chat.Completions.ChatCompletionFunctionTool;
  /** Runs the tool on the model's raw JSON arguments; always resolves to a JSON string for the model. */
  call(rawArgs: string): Promise<string>;
}

function readTool<S extends z.ZodType>(def: { perm: Permission; covers: string; activity: string; name: string; description: string; schema: S; run: (input: z.infer<S>) => Promise<unknown> }): AssistantTool {
  const parameters = { ...z.toJSONSchema(def.schema) } as Record<string, unknown>;
  delete parameters.$schema;
  return {
    perm: def.perm,
    covers: def.covers,
    activity: def.activity,
    spec: { type: "function", function: { name: def.name, description: def.description, parameters } },
    async call(rawArgs) {
      let args: unknown;
      try {
        args = dropBlanks(JSON.parse(rawArgs.trim() || "{}"));
      } catch {
        return JSON.stringify({ error: "The arguments were not valid JSON. Call the tool again with a JSON object." });
      }
      const parsed = def.schema.safeParse(args);
      if (!parsed.success) return JSON.stringify({ error: `Invalid arguments — ${parsed.error.issues.map((i) => `${i.path.join(".") || "input"}: ${i.message}`).join("; ")}` });
      return lookup(def.name, () => def.run(parsed.data));
    },
  };
}

/** Customer names, phone numbers and street addresses stay out of what is sent to the model. */
const orderRow = (o: Order) => ({
  orderNo: o.orderNo,
  placedAt: o.createdAt,
  status: o.orderStatus,
  paymentMode: o.paymentMode,
  paymentStatus: o.paymentStatus,
  netAmount: o.netAmount,
  lines: o.items.length,
  units: o.items.reduce((n, i) => n + i.qty, 0),
  city: o.shippingAddress.city,
  state: o.shippingAddress.state,
  awbNo: o.awbNo,
  couponCode: o.couponCode,
});

const TOOLS: AssistantTool[] = [
  readTool({
    perm: "dashboard:read",
    covers: "dashboard KPIs",
    activity: "Reading the dashboard…",
    name: "get_dashboard_summary",
    description:
      "Current dashboard KPIs for website orders: today's and last-30-day orders and revenue, average order value, order counts per status, a 30-day daily series, reviews awaiting moderation, new enquiries, abandoned carts, customer count, stock summary and the top-selling items of the last 30 days. Use it for 'how are we doing' questions and for what needs attention.",
    schema: z.object({}),
    run: () => dashboardStats(),
  }),
  readTool({
    perm: "products:read",
    covers: "products (RetailERP barcode labels)",
    activity: "Searching products…",
    name: "search_products",
    description:
      "Search RetailERP barcode labels — the products listed on the admin Products page. Each row is one printed label: barcode, name, item code, quantity, unit, retail price (INR), ERP status, product group, business, and whether a product photo loads. `q` is a case-insensitive substring match on barcode, item code, old barcode, item name, description and design number. `total` in the result is the number of matching labels, so a search with limit 1 is enough to count. Newest labels come first.",
    schema: z.object({
      q: z.string().max(100).optional().describe("Barcode, item code or part of a name"),
      status: z.string().max(40).optional().describe("Exact ERP status, e.g. IN_STOCK, SOLD, IN_TRANSIT, VOID, HISTORY"),
      uomType: z.string().max(20).optional().describe("Exact unit type: PC or MTR"),
      group: z.string().max(64).optional().describe("Product group id, from get_product_filters"),
      business: z.string().max(64).optional().describe("Business id, from get_product_filters"),
      page,
      limit,
    }),
    run: async (input) => {
      const r = await getBarcodeLabels().list({ ...input, limit: rows(input.limit) });
      return {
        total: r.total,
        page: r.page,
        pages: r.pages,
        items: r.items.map((p) => ({
          barcode: p.barcode,
          name: p.name,
          itemCode: p.itemCode,
          itemName: p.itemName,
          group: p.group,
          business: p.business,
          qty: p.qty,
          uom: p.uom,
          price: p.price,
          offerPrice: p.offerPrice,
          status: p.status,
          hsnCode: p.hsnCode,
          gstPercent: p.gstPercent,
          grcNo: p.grcNo,
          hasPhoto: !!p.image,
          labelsSharingBarcode: p.barcodeLabelCount,
          createdAt: p.createdAt,
        })),
      };
    },
  }),
  readTool({
    perm: "products:read",
    covers: "product counts by status, group, business and unit",
    activity: "Counting products…",
    name: "get_product_filters",
    description:
      "Live counts of RetailERP barcode labels by status, unit type, product group and business, plus the total. Also the source of the group and business ids that search_products filters on. Use it for 'how many' questions about the catalogue.",
    schema: z.object({}),
    run: () => getBarcodeLabels().facets(),
  }),
  readTool({
    perm: "orders:read",
    covers: "website orders",
    activity: "Looking up orders…",
    name: "list_orders",
    description:
      "List website orders, newest first, optionally filtered by status, part of an order number, or a date range on the order date. Returns order number, date, status, payment mode and status, net amount (INR), line and unit counts, destination city and state, AWB number and coupon code. `total` is the number of matching orders. Customer names, phone numbers and street addresses are not included.",
    schema: z.object({
      status: z.enum(ORDER_STATUSES).optional(),
      orderNo: z.string().max(40).optional().describe("Whole or partial order number"),
      from: day.optional(),
      to: day.optional(),
      page,
      limit,
    }),
    run: async ({ status, orderNo, from, to, page, limit }) => {
      const r = await getOrders().list({ status, q: orderNo, from: from ? startOf(from) : undefined, to: to ? endOf(to) : undefined, page, limit: rows(limit) });
      return { total: r.total, page: r.page, pages: r.pages, items: r.items.map(orderRow) };
    },
  }),
  readTool({
    perm: "orders:read",
    covers: "single order details",
    activity: "Opening the order…",
    name: "get_order",
    description:
      "One website order by its exact order number: line items (item code, name, quantity, rate, amount), totals, payment, status history, AWB number and coupon. Customer names, phone numbers and street addresses are not included.",
    schema: z.object({ orderNo: z.string().min(1).max(40) }),
    run: async ({ orderNo }) => {
      const o = await getOrders().getByOrderNo(orderNo.trim());
      if (!o) return { found: false };
      return {
        found: true,
        ...orderRow(o),
        subTotal: o.subTotal,
        discountTotal: o.discountTotal,
        gstTotal: o.gstTotal,
        shippingCharge: o.shippingCharge,
        items: o.items.map((i) => ({ itemCode: i.sku, name: i.name, qty: i.qty, rate: i.rate, amount: i.amount })),
        statusHistory: o.statusHistory?.map((h) => ({ status: h.status, note: h.note, at: h.at })),
      };
    },
  }),
  readTool({
    perm: "reports:read",
    covers: "sales reports",
    activity: "Building the sales report…",
    name: "get_sales_report",
    description:
      "Sales report for website orders in a date range (cancelled orders excluded): orders and revenue per day, by payment mode, by order status, the top 20 products by revenue, coupon usage and the top 10 cities. Defaults to the last 30 days when no dates are given.",
    schema: z.object({ from: day.optional(), to: day.optional() }),
    run: async ({ from, to }) => {
      const end = to ? endOf(to) : new Date();
      const start = from ? startOf(from) : new Date(end.getTime() - 30 * 864e5);
      return { from: start.toISOString(), to: end.toISOString(), ...(await reports(start, end)) };
    },
  }),
];

const toolsFor = (session: AdminSession) => TOOLS.filter((t) => hasPermission(session, t.perm));

/** What this admin may ask about — drives the page intro. */
export const assistantCovers = (session: AdminSession) => toolsFor(session).map((t) => t.covers);

function systemPrompt(session: AdminSession, tools: AssistantTool[]): string {
  return `You are the assistant built into the Woven Essence admin panel, the back office of a saree and fabric retailer (Temple Fabrics) whose catalogue comes from the RetailERP system. You are talking with a signed-in member of staff, ${session.name} (role: ${session.role}), who uses you to get quick answers about the store without clicking through the admin pages.

Answer from live data. Look things up with the tools instead of relying on memory or guessing, and when a question needs figures the tools cannot give you, say what is missing instead of estimating. Never invent order numbers, barcodes, counts or amounts. This is an interactive chat, so keep answers short: lead with the answer, then only the detail that helps.

What you can look up in this conversation: ${tools.length ? tools.map((t) => t.covers).join("; ") : "nothing — this person's role has no data access through the assistant"}. The tools you have reflect what this person is permitted to see. If they ask about an area you have no tool for, tell them it is outside what the assistant can show for their role and name the admin page where they can check.

Everything here is read-only. You cannot change orders, products, prices, stock or settings. When asked to change something, explain which admin page does it: Orders (/admin/orders), Products (/admin/products), Inventory & sync (/admin/inventory), Coupons (/admin/coupons), Settings (/admin/settings).

Facts about the data that staff often misread:
- A "product" is a RetailERP barcode label, one row per printed label, so product counts are label counts. Barcodes are not always unique, and one item code can be shared by many labels.
- Name, price, quantity, status and photos are owned by RetailERP and are not editable from the website.
- Orders and sales figures cover website orders only, not in-store RetailERP sales.
- Order lookups deliberately leave out customer names, phone numbers and street addresses. Send staff to the Orders page for those.
- Dates are UTC. Amounts are Indian rupees: write them as ₹ with Indian digit grouping (₹1,25,000).

The chat window renders only paragraphs, **bold**, bullet lists, numbered lists and links. It does not render tables, headings or code blocks, so present rows as a short list. Link to admin pages with relative links such as [Orders](/admin/orders).

Today's date is ${new Date().toISOString().slice(0, 10)}.`;
}

class NotConfigured extends Error {}

let nvidia: OpenAI | undefined;
/** NVIDIA's API speaks the OpenAI chat-completions protocol, so the OpenAI SDK is pointed at it. */
function client(): OpenAI {
  if (!env.NVIDIA_API_KEY) throw new NotConfigured("NVIDIA_API_KEY is not set");
  return (nvidia ??= new OpenAI({ apiKey: env.NVIDIA_API_KEY, baseURL: env.NVIDIA_BASE_URL }));
}

/**
 * Some reasoning models write their thinking inline as <think>…</think>. This passes visible text
 * through and drops those spans, coping with tags split across stream chunks.
 */
function thinkFilter(onText: (text: string) => void, onThinking: () => void) {
  const OPEN = "<think>";
  const CLOSE = "</think>";
  let pending = "";
  let thinking = false;
  /** Length of the longest tail of `s` that could be the start of `tag`. */
  const partial = (s: string, tag: string) => {
    for (let n = Math.min(tag.length - 1, s.length); n > 0; n--) if (tag.startsWith(s.slice(-n))) return n;
    return 0;
  };
  return {
    push(chunk: string) {
      pending += chunk;
      for (;;) {
        const tag = thinking ? CLOSE : OPEN;
        const at = pending.indexOf(tag);
        if (at === -1) break;
        if (!thinking && at > 0) onText(pending.slice(0, at));
        pending = pending.slice(at + tag.length);
        thinking = !thinking;
        if (thinking) onThinking();
      }
      const keep = partial(pending, thinking ? CLOSE : OPEN);
      if (!thinking && pending.length > keep) onText(pending.slice(0, pending.length - keep));
      pending = pending.slice(pending.length - keep);
    },
    flush() {
      if (!thinking && pending) onText(pending);
      pending = "";
    },
  };
}

/**
 * Answer the last user message in `history`, emitting text as it is generated.
 * Throws on API failure — map it with assistantErrorMessage().
 */
export async function runAssistant(session: AdminSession, history: AssistantTurn[], emit: (e: AssistantEvent) => void, signal: AbortSignal): Promise<void> {
  const tools = toolsFor(session);
  const byName = new Map(tools.map((t) => [t.spec.function.name, t]));
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [{ role: "system", content: systemPrompt(session, tools) }, ...history];

  let wroteText = false;
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const stream = await client().chat.completions.create(
      { model: env.NVIDIA_MODEL, messages, ...(tools.length ? { tools: tools.map((t) => t.spec) } : {}), temperature: 0.2, max_tokens: MAX_TOKENS, stream: true },
      { signal },
    );

    let text = "";
    let finish: string | null = null;
    const calls: { id: string; name: string; args: string }[] = [];
    const visible = thinkFilter(
      (t) => {
        if (!text && wroteText) emit({ type: "text", text: "\n\n" }); // a new paragraph after a tool round-trip
        text += t;
        wroteText = true;
        emit({ type: "text", text: t });
      },
      () => emit({ type: "activity", label: "Thinking…" }),
    );
    for await (const chunk of stream) {
      const choice = chunk.choices[0];
      if (!choice) continue;
      if (choice.finish_reason) finish = choice.finish_reason;
      const delta = choice.delta;
      if (!delta) continue;
      // Reasoning models stream their thinking in a separate, non-standard field.
      if ((delta as { reasoning_content?: string | null }).reasoning_content && !text) emit({ type: "activity", label: "Thinking…" });
      if (delta.content) visible.push(delta.content);
      for (const part of delta.tool_calls ?? []) {
        const call = (calls[part.index] ??= { id: "", name: "", args: "" });
        if (part.id) call.id = part.id;
        if (part.function?.name) {
          call.name += part.function.name;
          emit({ type: "activity", label: byName.get(call.name)?.activity ?? "Looking that up…" });
        }
        if (part.function?.arguments) call.args += part.function.arguments;
      }
    }
    visible.flush();

    const pending = calls.filter((c) => c?.name);
    if (finish === "content_filter") {
      emit({ type: "text", text: `${wroteText ? "\n\n" : ""}I can't help with that request.` });
      return;
    }
    if (!pending.length) break;
    // A tool call cut off by the token limit has incomplete arguments; never run it.
    if (finish === "length") break;

    pending.forEach((c, n) => (c.id ||= `call_${i}_${n}`));
    messages.push({ role: "assistant", content: text || null, tool_calls: pending.map((c) => ({ id: c.id, type: "function" as const, function: { name: c.name, arguments: c.args || "{}" } })) });
    const results = await Promise.all(pending.map((c) => byName.get(c.name)?.call(c.args) ?? JSON.stringify({ error: `There is no tool named ${c.name}.` })));
    pending.forEach((c, n) => messages.push({ role: "tool", tool_call_id: c.id, content: results[n] }));
    if (signal.aborted) return;
  }
  if (!wroteText) emit({ type: "text", text: "I couldn't finish looking that up. Try a narrower question." });
}

/** SDK error -> a message safe to show an admin. The cause is logged, never sent to the browser. */
export function assistantErrorMessage(err: unknown): string {
  console.error("[admin/assistant]", redactMongoUri(String((err as Error)?.message ?? err)));
  const notSetUp = "The AI assistant is not set up yet: NVIDIA_API_KEY is missing or not valid. Add it to .env.local and restart the server.";
  if (err instanceof NotConfigured || err instanceof OpenAI.AuthenticationError || err instanceof OpenAI.PermissionDeniedError) return notSetUp;
  if (err instanceof OpenAI.NotFoundError) return `The model "${env.NVIDIA_MODEL}" is not available on the NVIDIA API. Set NVIDIA_MODEL to a model from build.nvidia.com and restart the server.`;
  if (err instanceof OpenAI.RateLimitError) return "The assistant is busy right now (NVIDIA rate limit). Please try again in a minute.";
  if (err instanceof OpenAI.BadRequestError) return "The assistant could not process this conversation. Start a new chat; if it keeps happening, the model set in NVIDIA_MODEL may not support tool calling.";
  if (err instanceof OpenAI.APIConnectionError) return "Could not reach the NVIDIA API. Check the server's internet connection and try again.";
  if (err instanceof OpenAI.APIError) return "The NVIDIA API is having trouble. Please try again shortly.";
  return "Something went wrong. Please try again.";
}
