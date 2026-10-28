// "use client";
// import { useState } from "react";
// import { api } from "@/hooks/api";
// import { Button } from "@/components/ui/button";
// import { Field, Input } from "@/components/ui/input";

// export function ProfileForm({ initial }: { initial: { name: string; email: string; gstNumber: string } }) {
//   const [v, setV] = useState(initial);
//   const [state, setState] = useState<"idle" | "busy" | "saved" | "error">("idle");
//   return (
//     <form className="mt-4 space-y-3" onSubmit={async (e) => { e.preventDefault(); setState("busy"); try { await api("/api/v1/auth/me", { method: "PATCH", json: { name: v.name || undefined, email: v.email || undefined, gstNumber: v.gstNumber || undefined } }); setState("saved"); } catch { setState("error"); } }}>
//       <Field label="Name"><Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></Field>
//       <Field label="Email"><Input type="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} /></Field>
//       <Field label="GST number (for business invoices)"><Input value={v.gstNumber} onChange={(e) => setV({ ...v, gstNumber: e.target.value })} /></Field>
//       <div className="flex items-center gap-3"><Button type="submit" size="sm" variant="secondary" loading={state === "busy"}>Save</Button>{state === "saved" && <span className="text-xs text-olive">Saved</span>}{state === "error" && <span className="text-xs text-red-700">Could not save</span>}</div>
//     </form>
//   );
// }


//////////////////////////////////////////////////////////////////////////////////

"use client";
import { useState } from "react";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { api } from "@/hooks/api";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

const inputClass = "h-11 rounded-xl bg-[#fdf9fa]";

export function ProfileForm({ initial }: { initial: { name: string; email: string; gstNumber: string } }) {
  const [v, setV] = useState(initial);
  const [state, setState] = useState<"idle" | "busy" | "saved" | "error">("idle");
  return (
    <form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); setState("busy"); try { await api("/api/v1/auth/me", { method: "PATCH", json: { name: v.name || undefined, email: v.email || undefined, gstNumber: v.gstNumber || undefined } }); setState("saved"); } catch { setState("error"); } }}>
      <Field label="Name"><Input className={inputClass} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></Field>
      <Field label="Email"><Input className={inputClass} type="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} /></Field>
      <Field label="GST number" hint="Optional, for business invoices"><Input className={inputClass} value={v.gstNumber} onChange={(e) => setV({ ...v, gstNumber: e.target.value })} /></Field>
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <Button type="submit" className="rounded-full px-6" loading={state === "busy"}>Save changes</Button>
        {state === "saved" && <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Saved</span>}
        {state === "error" && <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700"><CircleAlert className="h-4 w-4" /> Could not save</span>}
      </div>
    </form>
  );
}
