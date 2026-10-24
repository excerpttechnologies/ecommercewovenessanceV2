"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { PERMISSIONS } from "@/models/web/commerce.models";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";

export type FieldType = "text" | "textarea" | "number" | "boolean" | "select" | "json" | "image" | "date" | "tags" | "permissions" | "color" | "mobile";
export interface FieldSpec {
  name: string; // dot path supported (image.desktop)
  label: string;
  type: FieldType;
  options?: { value: string; label: string }[] | (() => { value: string; label: string }[]);
  required?: boolean;
  hint?: string;
  placeholder?: string;
  full?: boolean;
  /** Shown only for create (e.g. password). */
  createOnly?: boolean;
}

export const get = (o: any, path: string) => path.split(".").reduce((a, k) => (a == null ? undefined : a[k]), o);
export const set = (o: any, path: string, v: unknown) => {
  const keys = path.split(".");
  const out = { ...o };
  let cur = out;
  keys.forEach((k, i) => {
    if (i === keys.length - 1) cur[k] = v;
    else {
      cur[k] = { ...(cur[k] ?? {}) };
      cur = cur[k];
    }
  });
  return out;
};

/** Builds a form from a FieldSpec[]; emits a plain object with nested paths resolved. */
export function SpecForm({ fields, initial, onSubmit, submitLabel = "Save", busy, error, mode }: { fields: FieldSpec[]; initial: any; onSubmit: (v: any) => void; submitLabel?: string; busy?: boolean; error?: string | null; mode: "create" | "edit" }) {
  const [v, setV] = useState<any>(initial ?? {});
  const [jsonErr, setJsonErr] = useState<Record<string, string>>({});
  const upd = (name: string, val: unknown) => setV((s: any) => set(s, name, val));
  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (Object.keys(jsonErr).length) return;
        onSubmit(v);
      }}
    >
      {fields.filter((f) => !(f.createOnly && mode === "edit")).map((f) => {
        const val = get(v, f.name);
        const wrap = (el: React.ReactNode) => <div key={f.name} className={f.full || ["textarea", "json", "permissions", "tags"].includes(f.type) ? "sm:col-span-2" : ""}><Field label={f.label} hint={f.hint} error={jsonErr[f.name]}>{el}</Field></div>;
        switch (f.type) {
          case "textarea": return wrap(<Textarea value={val ?? ""} required={f.required} placeholder={f.placeholder} onChange={(e) => upd(f.name, e.target.value)} />);
          case "number": return wrap(<Input type="number" step="any" value={val ?? ""} required={f.required} onChange={(e) => upd(f.name, e.target.value === "" ? undefined : Number(e.target.value))} />);
          case "mobile": return wrap(<Input type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={10} pattern="[6-9][0-9]{9}" title="Enter a valid 10-digit Indian mobile number starting with 6-9" value={val ?? ""} required={f.required} placeholder="10-digit mobile number" onChange={(e) => upd(f.name, e.target.value.replace(/\D/g, "").slice(0, 10))} />);
          case "boolean": return wrap(<label className="flex h-10 items-center gap-2 text-sm"><input type="checkbox" checked={!!val} onChange={(e) => upd(f.name, e.target.checked)} className="h-4 w-4 accent-[var(--we-olive)]" /> {val ? "Yes" : "No"}</label>);
          case "select": {
            const opts = typeof f.options === "function" ? f.options() : (f.options ?? []);
            return wrap(<Select value={val ?? ""} required={f.required} onChange={(e) => upd(f.name, e.target.value || undefined)}><option value="">—</option>{opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select>);
          }
          case "date": return wrap(<Input type="date" value={val ? String(val).slice(0, 10) : ""} onChange={(e) => upd(f.name, e.target.value || null)} />);
          case "color": return wrap(<div className="flex gap-2"><input type="color" value={val ?? "#000000"} onChange={(e) => upd(f.name, e.target.value)} className="h-10 w-12 rounded-sm border border-line" /><Input value={val ?? ""} onChange={(e) => upd(f.name, e.target.value)} /></div>);
          case "image": return wrap(<div className="flex gap-3"><Input value={val ?? ""} required={f.required} placeholder="https://… image URL" onChange={(e) => upd(f.name, e.target.value)} />{val && <img src={val} alt="" className="h-10 w-10 rounded-sm object-cover" />}</div>);
          case "tags": return wrap(<Input value={Array.isArray(val) ? val.join(", ") : (val ?? "")} placeholder="comma, separated" onChange={(e) => upd(f.name, e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} />);
          case "json": return wrap(
            <Textarea
              className="font-mono text-xs"
              defaultValue={JSON.stringify(val ?? (f.name === "rules" || f.name === "skus" ? [] : {}), null, 2)}
              onChange={(e) => {
                try { upd(f.name, JSON.parse(e.target.value)); setJsonErr((s) => { const n = { ...s }; delete n[f.name]; return n; }); }
                catch { setJsonErr((s) => ({ ...s, [f.name]: "Invalid JSON" })); }
              }}
            />,
          );
          case "permissions": {
            const sel: string[] = Array.isArray(val) ? val : [];
            const allSelected = sel.includes("*");
            const groups = Array.from(new Set(PERMISSIONS.map((p) => p.split(":")[0])));
            return wrap(
              <div className="grid gap-2 rounded-sm border border-line p-3 sm:grid-cols-2 md:grid-cols-3">
                {groups.map((g) => (
                  <div key={g}>
                    <p className="mb-1 text-[10px] uppercase tracking-widest text-gold">{g}</p>
                    {PERMISSIONS.filter((p) => p.startsWith(g + ":")).map((p) => (
                      <label key={p} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={allSelected || sel.includes(p)} onChange={(e) => upd(f.name, allSelected ? (e.target.checked ? [...PERMISSIONS] : PERMISSIONS.filter((permission) => permission !== p)) : (e.target.checked ? [...sel, p] : sel.filter((x) => x !== p)))} className="accent-[var(--we-olive)]" />{p.split(":")[1]}</label>
                    ))}
                  </div>
                ))}
              </div>,
            );
          }
          default: return wrap(<Input value={val ?? ""} required={f.required} placeholder={f.placeholder} onChange={(e) => upd(f.name, e.target.value)} />);
        }
      })}
      {error && <p className="text-xs text-red-700 sm:col-span-2">{error}</p>}
      <div className="sm:col-span-2"><Button type="submit" loading={busy}>{submitLabel}</Button></div>
    </form>
  );
}
