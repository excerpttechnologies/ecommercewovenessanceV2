"use client";
import { useState } from "react";
import { api } from "@/hooks/api";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

export function ProfileForm({ initial }: { initial: { name: string; email: string; gstNumber: string } }) {
  const [v, setV] = useState(initial);
  const [state, setState] = useState<"idle" | "busy" | "saved" | "error">("idle");
  return (
    <form className="mt-4 space-y-3" onSubmit={async (e) => { e.preventDefault(); setState("busy"); try { await api("/api/v1/auth/me", { method: "PATCH", json: { name: v.name || undefined, email: v.email || undefined, gstNumber: v.gstNumber || undefined } }); setState("saved"); } catch { setState("error"); } }}>
      <Field label="Name"><Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></Field>
      <Field label="Email"><Input type="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} /></Field>
      <Field label="GST number (for business invoices)"><Input value={v.gstNumber} onChange={(e) => setV({ ...v, gstNumber: e.target.value })} /></Field>
      <div className="flex items-center gap-3"><Button type="submit" size="sm" variant="secondary" loading={state === "busy"}>Save</Button>{state === "saved" && <span className="text-xs text-olive">Saved</span>}{state === "error" && <span className="text-xs text-red-700">Could not save</span>}</div>
    </form>
  );
}
