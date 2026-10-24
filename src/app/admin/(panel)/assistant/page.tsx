"use client";
import { useQuery } from "@tanstack/react-query";
import { Send, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { AssistantEvent } from "@/lib/admin/assistant";
import { api } from "@/hooks/api";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/admin/table";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Markdown } from "@/components/ui/markdown";

interface Message { id: number; role: "user" | "assistant"; content: string; activity?: string; error?: string }
interface Status { hasApiKey: boolean; covers: string[]; maxMessages: number }

const SUGGESTIONS = [
  "Summarise today's sales and what needs attention.",
  "Which orders are waiting to be confirmed or shipped?",
  "How many barcode labels are there by status and by business?",
  "What were the top-selling products in the last 30 days?",
];
const UNAVAILABLE = "The assistant is unavailable. Please try again.";

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const nextId = useRef(1);
  const abort = useRef<AbortController | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const status = useQuery({ queryKey: ["admin", "assistant", "status"], queryFn: async () => (await api<Status>("/api/v1/admin/assistant")).data, staleTime: 5 * 60_000 });

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [messages]);
  useEffect(() => () => abort.current?.abort(), []);

  // Two slots are needed for the next question and its answer.
  const full = messages.length + 2 > (status.data?.maxMessages ?? 60);

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy || full) return;
    // Answers that failed are left out, so the model never sees a half-finished turn.
    const history = [...messages.filter((m) => m.content && !m.error).map(({ role, content }) => ({ role, content })), { role: "user" as const, content: question }];
    const answerId = nextId.current + 1;
    setMessages((all) => [...all, { id: nextId.current, role: "user", content: question }, { id: answerId, role: "assistant", content: "", activity: "Thinking…" }]);
    nextId.current += 2;
    setInput("");
    setBusy(true);
    const patch = (fn: (m: Message) => Message) => setMessages((all) => all.map((m) => (m.id === answerId ? fn(m) : m)));
    const ctrl = new AbortController();
    abort.current = ctrl;
    try {
      const res = await fetch("/api/v1/admin/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ messages: history }), signal: ctrl.signal });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message ?? UNAVAILABLE);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line) continue;
          const e = JSON.parse(line) as AssistantEvent;
          if (e.type === "text") patch((m) => ({ ...m, content: m.content + e.text, activity: undefined }));
          else if (e.type === "activity") patch((m) => ({ ...m, activity: e.label }));
          else if (e.type === "error") patch((m) => ({ ...m, error: e.message }));
        }
      }
    } catch (e) {
      if (!ctrl.signal.aborted) patch((m) => ({ ...m, error: (e as Error).message || UNAVAILABLE }));
    } finally {
      patch((m) => ({ ...m, activity: undefined }));
      setBusy(false);
    }
  }

  const reset = () => {
    abort.current?.abort();
    setMessages([]);
    setInput("");
  };

  return (
    <div>
      <PageHeader title="AI Assistant">
        {messages.length > 0 && <Button variant="outline" size="sm" onClick={reset}>New chat</Button>}
      </PageHeader>
      {status.data && !status.data.hasApiKey && (
        <p className="mb-4 rounded-sm border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          No NVIDIA_API_KEY is set on the server, so the assistant cannot answer yet. Add it to .env.local and restart the server.
        </p>
      )}
      <div className="flex h-[calc(100vh-15rem)] min-h-[24rem] flex-col rounded-sm border border-line">
        <div ref={scroller} aria-live="polite" className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="mx-auto max-w-xl py-6 text-center">
              <p className="font-heading text-2xl text-olive">What would you like to know?</p>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" onClick={() => send(s)} className="rounded-sm border border-line p-3 text-left text-sm text-ink/80 hover:border-gold hover:bg-gold/5">{s}</button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={cn("flex", m.role === "user" && "justify-end")}>
                {m.role === "user" ? (
                  <p className="max-w-[85%] whitespace-pre-wrap rounded-sm bg-olive/10 px-3 py-2 text-sm">{m.content}</p>
                ) : (
                  <div className="max-w-[85%] min-w-0">
                    {m.content && <Markdown source={m.content} className="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0" />}
                    {m.activity && <p className="flex items-center gap-2 text-xs text-muted"><span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />{m.activity}</p>}
                    {m.error && <p role="alert" className="mt-1 rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{m.error}</p>}
                    {!m.content && !m.activity && !m.error && <p className="text-xs text-muted">Stopped.</p>}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-end gap-2 border-t border-line p-3">
          <Textarea
            aria-label="Message"
            rows={2}
            value={input}
            maxLength={8000}
            disabled={full}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(input); } }}
            placeholder={full ? "This chat is full. Start a new chat to continue." : "Ask a question…  (Enter to send, Shift+Enter for a new line)"}
            className="min-h-[3rem] resize-none"
          />
          {busy ? (
            <Button type="button" variant="outline" onClick={() => abort.current?.abort()}><Square className="h-3.5 w-3.5" /> Stop</Button>
          ) : (
            <Button type="submit" disabled={!input.trim() || full}><Send className="h-3.5 w-3.5" /> Send</Button>
          )}
        </form>
      </div>
    </div>
  );
}
