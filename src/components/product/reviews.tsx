"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { useState } from "react";
import { api } from "@/hooks/api";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";

interface Review { id: string; customerName: string; rating: number; title?: string; body: string; createdAt?: string; isVerifiedPurchase?: boolean }

export function Reviews({ sku }: { sku: string }) {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["reviews", sku], queryFn: async () => (await api<{ items: Review[]; avg: number; count: number }>(`/api/v1/reviews?sku=${encodeURIComponent(sku)}`)).data });
  const [form, setForm] = useState({ customerName: "", rating: 5, title: "", body: "" });
  const [open, setOpen] = useState(false);
  const submit = useMutation({
    mutationFn: async () => api("/api/v1/reviews", { method: "POST", json: { sku, ...form } }),
    onSuccess: () => {
      setOpen(false);
      setForm({ customerName: "", rating: 5, title: "", body: "" });
      qc.invalidateQueries({ queryKey: ["reviews", sku] });
    },
  });
  return (
    <section id="reviews" className="mt-16 border-t border-line pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="we-rule text-3xl">Reviews</h2>
          {data && data.count > 0 && (
            <p className="mt-3 flex items-center gap-2 text-sm text-muted">
              <Stars n={Math.round(data.avg)} /> {data.avg.toFixed(1)} · {data.count} review{data.count === 1 ? "" : "s"}
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>Write a review</Button>
      </div>
      {open && (
        <form className="mt-6 grid gap-4 rounded-sm border border-line bg-white/60 p-5 md:grid-cols-2" onSubmit={(e) => { e.preventDefault(); submit.mutate(); }}>
          <Field label="Your name"><Input required value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} /></Field>
          <Field label="Rating">
            <div className="flex gap-1 pt-2">{[1, 2, 3, 4, 5].map((n) => <button type="button" key={n} onClick={() => setForm({ ...form, rating: n })} aria-label={`${n} stars`}><Star className={`h-6 w-6 ${n <= form.rating ? "fill-gold text-gold" : "text-line"}`} /></button>)}</div>
          </Field>
          <Field label="Title"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <div className="md:col-span-2"><Field label="Review"><Textarea required minLength={10} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></Field></div>
          <div className="md:col-span-2 flex items-center gap-4">
            <Button type="submit" loading={submit.isPending}>Submit</Button>
            <p className="text-xs text-muted">Reviews are published after moderation.</p>
            {submit.isSuccess && <p className="text-xs text-olive">Thank you — your review is awaiting approval.</p>}
            {submit.isError && <p className="text-xs text-red-700">{(submit.error as Error).message}</p>}
          </div>
        </form>
      )}
      <ul className="mt-8 grid gap-6 md:grid-cols-2">
        {data?.items.map((r) => (
          <li key={r.id} className="rounded-sm border border-line p-5">
            <div className="flex items-center justify-between"><Stars n={r.rating} />{r.isVerifiedPurchase && <span className="text-[10px] uppercase tracking-widest text-olive">Verified purchase</span>}</div>
            {r.title && <p className="mt-2 font-medium">{r.title}</p>}
            <p className="mt-1 text-sm text-ink/80">{r.body}</p>
            <p className="mt-3 text-xs text-muted">{r.customerName}{r.createdAt ? ` · ${new Date(r.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}` : ""}</p>
          </li>
        ))}
        {data && data.items.length === 0 && <li className="text-sm text-muted">No reviews yet — be the first.</li>}
      </ul>
    </section>
  );
}

function Stars({ n }: { n: number }) {
  return <span className="inline-flex gap-0.5">{[1, 2, 3, 4, 5].map((i) => <Star key={i} className={`h-3.5 w-3.5 ${i <= n ? "fill-gold text-gold" : "text-line"}`} />)}</span>;
}
