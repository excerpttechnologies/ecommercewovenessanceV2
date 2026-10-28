// "use client";
// import { useState } from "react";
// import type { Address } from "@/domain/types";
// import { api } from "@/hooks/api";
// import { Button } from "@/components/ui/button";
// import { Field, Input } from "@/components/ui/input";

// const blank: Address = { name: "", phone: "", line1: "", line2: "", city: "", state: "Karnataka", pincode: "", country: "India" };

// export function AddressBook({ initial }: { initial: Address[] }) {
//   const [list, setList] = useState(initial);
//   const [editing, setEditing] = useState<number | null>(null);
//   const [draft, setDraft] = useState<Address>(blank);
//   const [busy, setBusy] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   async function save(next: Address[]) {
//     setBusy(true); setError(null);
//     try {
//       const r = (await api<{ addresses: Address[] }>("/api/v1/account/addresses", { method: "PUT", json: { addresses: next } })).data;
//       setList(r.addresses); setEditing(null); setDraft(blank);
//     } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
//   }
//   const f = (k: keyof Address) => (e: React.ChangeEvent<HTMLInputElement>) => {
//     const value = k === "pincode" ? e.target.value.replace(/\D/g, "").slice(0, 6) : e.target.value;
//     setDraft({ ...draft, [k]: value });
//   };

//   return (
//     <div className="space-y-6">
//       <ul className="grid gap-3 sm:grid-cols-2">
//         {list.map((a, i) => (
//           <li key={i} className="rounded-lg border border-line bg-white/60 p-4 text-sm">
//             <p className="font-medium">{a.name} {a.isDefault && <span className="ml-2 text-[10px] uppercase tracking-wider text-gold">Default</span>}</p>
//             <p className="text-muted">{a.line1}{a.line2 ? `, ${a.line2}` : ""}<br />{a.city}, {a.state} {a.pincode}<br />{a.phone}</p>
//             <div className="mt-3 flex gap-3 text-xs uppercase tracking-wider">
//               <button onClick={() => { setEditing(i); setDraft(a); }} className="text-olive">Edit</button>
//               {!a.isDefault && <button onClick={() => save(list.map((x, j) => ({ ...x, isDefault: j === i })))} className="text-olive">Make default</button>}
//               <button onClick={() => save(list.filter((_, j) => j !== i))} className="text-red-700">Delete</button>
//             </div>
//           </li>
//         ))}
//         {list.length === 0 && <li className="text-sm text-muted">No saved addresses.</li>}
//       </ul>
//       <form className="grid gap-3 rounded-lg border border-line bg-white/60 p-5 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); save(editing === null ? [...list, draft] : list.map((a, i) => (i === editing ? draft : a))); }}>
//         <h3 className="text-2xl sm:col-span-2">{editing === null ? "Add address" : "Edit address"}</h3>
//         <Field label="Name"><Input required value={draft.name ?? ""} onChange={f("name")} /></Field>
//         <Field label="Mobile"><Input required pattern="[6-9][0-9]{9}" value={draft.phone ?? ""} onChange={f("phone")} /></Field>
//         <div className="sm:col-span-2"><Field label="Line 1"><Input required value={draft.line1} onChange={f("line1")} /></Field></div>
//         <div className="sm:col-span-2"><Field label="Line 2"><Input value={draft.line2 ?? ""} onChange={f("line2")} /></Field></div>
//         <Field label="City"><Input required value={draft.city} onChange={f("city")} /></Field>
//         <Field label="State"><Input required value={draft.state} onChange={f("state")} /></Field>
//         <Field label="Pincode"><Input required inputMode="numeric" pattern="[1-9][0-9]{5}" maxLength={6} title="Enter a valid 6-digit Indian PIN code" value={draft.pincode} onChange={f("pincode")} /></Field>
//         <div className="flex items-end gap-3"><Button type="submit" variant="secondary" loading={busy}>{editing === null ? "Add" : "Save"}</Button>{editing !== null && <Button type="button" variant="ghost" onClick={() => { setEditing(null); setDraft(blank); }}>Cancel</Button>}</div>
//         {error && <p className="text-xs text-red-700 sm:col-span-2">{error}</p>}
//       </form>
//     </div>
//   );
// }

////////////////////////////////////////////////////////////////

"use client";
import { useState } from "react";
import { CircleAlert, MapPin, Pencil, Phone, Plus, Star, Trash2 } from "lucide-react";
import type { Address } from "@/domain/types";
import { api } from "@/hooks/api";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { AccountCard, AccountCardTitle } from "@/components/account/account-card";
import { cn } from "@/lib/utils";

const blank: Address = { name: "", phone: "", line1: "", line2: "", city: "", state: "Karnataka", pincode: "", country: "India" };
const inputClass = "h-11 rounded-xl bg-[#fdf9fa]";

export function AddressBook({ initial }: { initial: Address[] }) {
  const [list, setList] = useState(initial);
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState<Address>(blank);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(next: Address[]) {
    setBusy(true); setError(null);
    try {
      const r = (await api<{ addresses: Address[] }>("/api/v1/account/addresses", { method: "PUT", json: { addresses: next } })).data;
      setList(r.addresses); setEditing(null); setDraft(blank);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  const f = (k: keyof Address) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = k === "pincode" ? e.target.value.replace(/\D/g, "").slice(0, 6) : e.target.value;
    setDraft({ ...draft, [k]: value });
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <AccountCard>
        <AccountCardTitle icon={MapPin} title="Saved addresses" subtitle={list.length ? `${list.length} address${list.length === 1 ? "" : "es"}` : undefined} />
        {list.length === 0 ? (
          <p className="rounded-xl border border-dashed border-maroon/20 bg-maroon/[0.03] px-4 py-8 text-center text-sm text-muted">No saved addresses yet. Add one below.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {list.map((a, i) => (
              <li key={i} className={cn("flex flex-col rounded-xl border p-4 text-sm transition-colors", a.isDefault ? "border-maroon/40 bg-maroon/[0.03]" : "border-line/70", editing === i && "ring-2 ring-maroon/30")}>
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-ink">{a.name}</p>
                  {a.isDefault && <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-maroon px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white"><Star className="h-3 w-3 fill-current" />Default</span>}
                </div>
                <p className="mt-1.5 flex-1 leading-relaxed text-muted">{a.line1}{a.line2 ? `, ${a.line2}` : ""}<br />{a.city}, {a.state} {a.pincode}</p>
                {a.phone && <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-ink/75"><Phone className="h-3.5 w-3.5 text-maroon/70" />{a.phone}</p>}
                <div className="mt-3 flex flex-wrap gap-2 border-t border-line/70 pt-3 text-xs font-semibold">
                  <button type="button" onClick={() => { setEditing(i); setDraft(a); }} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-ink/80 hover:bg-maroon/[0.06] hover:text-maroon"><Pencil className="h-3.5 w-3.5" />Edit</button>
                  {!a.isDefault && <button type="button" disabled={busy} onClick={() => save(list.map((x, j) => ({ ...x, isDefault: j === i })))} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-ink/80 hover:bg-maroon/[0.06] hover:text-maroon disabled:opacity-50"><Star className="h-3.5 w-3.5" />Make default</button>}
                  <button type="button" disabled={busy} onClick={() => save(list.filter((_, j) => j !== i))} className="ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-red-700 hover:bg-red-50 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" />Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </AccountCard>

      <AccountCard>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); save(editing === null ? [...list, draft] : list.map((a, i) => (i === editing ? draft : a))); }}>
          <div className="sm:col-span-2">
            <AccountCardTitle icon={editing === null ? Plus : Pencil} title={editing === null ? "Add address" : "Edit address"} subtitle={editing === null ? "Save an address for faster checkout" : undefined} />
          </div>
          <Field label="Name"><Input className={inputClass} required value={draft.name ?? ""} onChange={f("name")} /></Field>
          <Field label="Mobile"><Input className={inputClass} required pattern="[6-9][0-9]{9}" value={draft.phone ?? ""} onChange={f("phone")} /></Field>
          <div className="sm:col-span-2"><Field label="Line 1"><Input className={inputClass} required value={draft.line1} onChange={f("line1")} /></Field></div>
          <div className="sm:col-span-2"><Field label="Line 2"><Input className={inputClass} value={draft.line2 ?? ""} onChange={f("line2")} /></Field></div>
          <Field label="City"><Input className={inputClass} required value={draft.city} onChange={f("city")} /></Field>
          <Field label="State"><Input className={inputClass} required value={draft.state} onChange={f("state")} /></Field>
          <Field label="Pincode"><Input className={inputClass} required inputMode="numeric" pattern="[1-9][0-9]{5}" maxLength={6} title="Enter a valid 6-digit Indian PIN code" value={draft.pincode} onChange={f("pincode")} /></Field>
          <div className="flex items-end gap-3">
            <Button type="submit" className="h-11 rounded-full px-6" loading={busy}>{editing === null ? <><Plus className="h-4 w-4" />Add address</> : "Save address"}</Button>
            {editing !== null && <Button type="button" variant="ghost" className="h-11 rounded-full" onClick={() => { setEditing(null); setDraft(blank); }}>Cancel</Button>}
          </div>
          {error && <p className="flex items-center gap-1.5 text-xs font-medium text-red-700 sm:col-span-2"><CircleAlert className="h-4 w-4" />{error}</p>}
        </form>
      </AccountCard>
    </div>
  );
}
