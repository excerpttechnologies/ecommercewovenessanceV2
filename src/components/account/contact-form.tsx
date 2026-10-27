"use client";
import { ArrowRight, CheckCircle2, Mail, MessageSquare, Phone, Send, User } from "lucide-react";
import { useState } from "react";
import { api } from "@/hooks/api";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const MESSAGE_MAX = 500;

/** Modern layout: icon + label above the control. Classic layout: the shared Field. */
function Row({ modern, icon: Icon, label, children }: { modern?: boolean; icon: React.ComponentType<{ className?: string }>; label: string; children: React.ReactNode }) {
  if (!modern) return <Field label={label}>{children}</Field>;
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-2 text-[13px] font-medium text-olive"><Icon className="h-4 w-4 text-ink/60" />{label}</span>
      {children}
    </label>
  );
}

/** `modern` drops the boxed frame and lays the fields out two-up, for the homepage help panel. */
export function ContactForm({ type = "contact", modern }: { type?: "contact" | "support"; modern?: boolean }) {
  const [v, setV] = useState({ name: "", mobile: "", email: "", message: "" });
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const support = type === "support";
  const doneText = support ? "Thanks — your question has reached our team. We’ll be in touch soon." : "Thank you — we’ll get back to you within a working day.";
  if (state === "done") {
    return modern
      ? <p className="flex items-start gap-3 rounded-lg bg-emerald-50 p-5 text-sm text-emerald-900"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />{doneText}</p>
      : <p className="rounded-lg border border-line bg-white/60 p-6 text-sm text-olive">{doneText}</p>;
  }
  const field = modern ? "h-11 rounded-lg border-transparent bg-[#f7f4f5] focus:bg-white" : undefined;
  return (
    <form
      className={modern ? "grid gap-4 sm:grid-cols-2" : "space-y-4 rounded-lg border border-line bg-white/60 p-6"}
      onSubmit={async (e) => { e.preventDefault(); if (support && !v.mobile.trim() && !v.email) { setError("Please provide a mobile number or email address."); setState("error"); return; } setError(""); setState("busy"); try { await api("/api/v1/enquiries", { method: "POST", json: { type, ...v, mobile: v.mobile || undefined, email: v.email || undefined } }); setState("done"); } catch { setError("Could not send. Please try again."); setState("error"); } }}
    >
      <Row modern={modern} icon={User} label="Name"><Input required value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} placeholder={modern ? "Your name" : undefined} className={field} /></Row>
      <Row modern={modern} icon={Phone} label="Mobile"><Input required={!support} type="tel" inputMode="numeric" pattern="[6-9][0-9]{9}" maxLength={10} value={v.mobile} onChange={(e) => setV({ ...v, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) })} placeholder={modern ? "10-digit mobile number" : undefined} className={field} /></Row>
      <div className={modern ? "sm:col-span-2" : undefined}>
        <Row modern={modern} icon={Mail} label="Email"><Input type="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} placeholder={modern ? "you@example.com" : undefined} className={field} /></Row>
      </div>
      <div className={modern ? "sm:col-span-2" : undefined}>
        <Row modern={modern} icon={MessageSquare} label={support ? "Question or problem" : "Message"}>
          <div className="relative">
            <Textarea required maxLength={modern ? MESSAGE_MAX : undefined} value={v.message} onChange={(e) => setV({ ...v, message: e.target.value })} placeholder={modern ? "Tell us about the saree, your order or what isn't working…" : undefined} className={modern ? "min-h-[96px] rounded-lg border-transparent bg-[#f7f4f5] pb-6 focus:bg-white" : undefined} />
            {modern && <span className="pointer-events-none absolute bottom-2 right-3 text-[11px] text-muted" aria-live="polite">{v.message.length}/{MESSAGE_MAX}</span>}
          </div>
        </Row>
      </div>
      {state === "error" && <p role="alert" className={cn("text-xs text-red-700", modern && "sm:col-span-2")}>{error}</p>}
      <Button type="submit" loading={state === "busy"} className={modern ? "group h-11 w-full rounded-lg bg-gradient-to-r from-[#e2648f] to-maroon shadow-[0_12px_24px_-14px_rgba(219,26,114,0.9)] sm:col-span-2" : undefined}>
        {modern && <Send className="h-4 w-4" />}{support ? "Send to our team" : "Send"}
        {modern && <ArrowRight className="ml-auto h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
      </Button>
    </form>
  );
}
