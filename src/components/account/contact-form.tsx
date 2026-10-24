"use client";
import { useState } from "react";
import { api } from "@/hooks/api";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";

export function ContactForm({ type = "contact" }: { type?: "contact" | "support" }) {
  const [v, setV] = useState({ name: "", mobile: "", email: "", message: "" });
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const support = type === "support";
  if (state === "done") return <p className="rounded-sm border border-line bg-white/60 p-6 text-sm text-olive">{support ? "Thanks — your question has reached our team. We’ll be in touch soon." : "Thank you — we’ll get back to you within a working day."}</p>;
  return (
    <form className="space-y-4 rounded-sm border border-line bg-white/60 p-6" onSubmit={async (e) => { e.preventDefault(); if (support && !v.mobile.trim() && !v.email) { setError("Please provide a mobile number or email address."); setState("error"); return; } setError(""); setState("busy"); try { await api("/api/v1/enquiries", { method: "POST", json: { type, ...v, mobile: v.mobile || undefined, email: v.email || undefined } }); setState("done"); } catch { setError("Could not send. Please try again."); setState("error"); } }}>
      <Field label="Name"><Input required value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></Field>
      <Field label="Mobile"><Input required={!support} type="tel" inputMode="numeric" pattern="[6-9][0-9]{9}" maxLength={10} value={v.mobile} onChange={(e) => setV({ ...v, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) })} /></Field>
      <Field label="Email"><Input type="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} /></Field>
      <Field label={support ? "Question or problem" : "Message"}><Textarea required value={v.message} onChange={(e) => setV({ ...v, message: e.target.value })} /></Field>
      {state === "error" && <p role="alert" className="text-xs text-red-700">{error}</p>}
      <Button type="submit" loading={state === "busy"}>{support ? "Send to our team" : "Send"}</Button>
    </form>
  );
}
