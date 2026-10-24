"use client";
import { useState } from "react";
import type { Address } from "@/domain/types";
import { api } from "@/hooks/api";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

const blank: Address = { name: "", phone: "", line1: "", line2: "", city: "", state: "Karnataka", pincode: "", country: "India" };

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
    <div className="space-y-6">
      <ul className="grid gap-3 sm:grid-cols-2">
        {list.map((a, i) => (
          <li key={i} className="rounded-sm border border-line bg-white/60 p-4 text-sm">
            <p className="font-medium">{a.name} {a.isDefault && <span className="ml-2 text-[10px] uppercase tracking-widest text-gold">Default</span>}</p>
            <p className="text-muted">{a.line1}{a.line2 ? `, ${a.line2}` : ""}<br />{a.city}, {a.state} {a.pincode}<br />{a.phone}</p>
            <div className="mt-3 flex gap-3 text-xs uppercase tracking-widest">
              <button onClick={() => { setEditing(i); setDraft(a); }} className="text-olive">Edit</button>
              {!a.isDefault && <button onClick={() => save(list.map((x, j) => ({ ...x, isDefault: j === i })))} className="text-olive">Make default</button>}
              <button onClick={() => save(list.filter((_, j) => j !== i))} className="text-red-700">Delete</button>
            </div>
          </li>
        ))}
        {list.length === 0 && <li className="text-sm text-muted">No saved addresses.</li>}
      </ul>
      <form className="grid gap-3 rounded-sm border border-line bg-white/60 p-5 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); save(editing === null ? [...list, draft] : list.map((a, i) => (i === editing ? draft : a))); }}>
        <h3 className="text-2xl sm:col-span-2">{editing === null ? "Add address" : "Edit address"}</h3>
        <Field label="Name"><Input required value={draft.name ?? ""} onChange={f("name")} /></Field>
        <Field label="Mobile"><Input required pattern="[6-9][0-9]{9}" value={draft.phone ?? ""} onChange={f("phone")} /></Field>
        <div className="sm:col-span-2"><Field label="Line 1"><Input required value={draft.line1} onChange={f("line1")} /></Field></div>
        <div className="sm:col-span-2"><Field label="Line 2"><Input value={draft.line2 ?? ""} onChange={f("line2")} /></Field></div>
        <Field label="City"><Input required value={draft.city} onChange={f("city")} /></Field>
        <Field label="State"><Input required value={draft.state} onChange={f("state")} /></Field>
        <Field label="Pincode"><Input required inputMode="numeric" pattern="[1-9][0-9]{5}" maxLength={6} title="Enter a valid 6-digit Indian PIN code" value={draft.pincode} onChange={f("pincode")} /></Field>
        <div className="flex items-end gap-3"><Button type="submit" variant="secondary" loading={busy}>{editing === null ? "Add" : "Save"}</Button>{editing !== null && <Button type="button" variant="ghost" onClick={() => { setEditing(null); setDraft(blank); }}>Cancel</Button>}</div>
        {error && <p className="text-xs text-red-700 sm:col-span-2">{error}</p>}
      </form>
    </div>
  );
}
