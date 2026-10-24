"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/hooks/api";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

function PasswordInput(props: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={shown ? "text" : "password"} className="pr-16" />
      <button type="button" onClick={() => setShown((v) => !v)} aria-label={shown ? "Hide password" : "Show password"} className="absolute inset-y-0 right-0 px-3 text-xs uppercase tracking-widest text-muted hover:text-olive">
        {shown ? "Hide" : "Show"}
      </button>
    </div>
  );
}

/** POSTs to an auth endpoint, then refreshes cached queries (cart, wishlist, me) and goes to `next`. */
function useAuthSubmit(next: string) {
  const router = useRouter();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(path: string, json: unknown) {
    setBusy(true); setError(null);
    try {
      await api(path, { method: "POST", json });
      qc.invalidateQueries();
      router.push(next);
      router.refresh();
    } catch (e) { setError(e instanceof ApiError ? e.message : "Something went wrong. Please try again."); setBusy(false); }
  }
  return { busy, error, setError, submit };
}

export function LoginForm({ next }: { next: string }) {
  const { busy, error, submit } = useAuthSubmit(next);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return (
    <form className="mt-8 space-y-5" onSubmit={(e) => { e.preventDefault(); submit("/api/v1/auth/login", { email, password }); }}>
      <Field label="Email address"><Input type="email" required autoComplete="email" placeholder="Enter your email address" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
      <Field label="Password"><PasswordInput required autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
      <Button type="submit" size="lg" className="w-full" loading={busy}>Log in</Button>
    </form>
  );
}

export function RegisterForm({ next }: { next: string }) {
  const { busy, error, setError, submit } = useAuthSubmit(next);
  const [v, setV] = useState({ name: "", email: "", phone: "", password: "", confirm: "" });
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value });
  return (
    <form
      className="mt-8 space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (v.password !== v.confirm) return setError("Passwords don't match");
        submit("/api/v1/auth/register", { name: v.name, email: v.email, phone: v.phone || undefined, password: v.password });
      }}
    >
      <Field label="Full name"><Input required minLength={2} maxLength={80} autoComplete="name" placeholder="Enter your full name" value={v.name} onChange={set("name")} /></Field>
      <Field label="Email address"><Input type="email" required autoComplete="email" placeholder="Enter your email address" value={v.email} onChange={set("email")} /></Field>
      <Field label="Phone (optional)" hint="For delivery updates only">
        <div className="flex">
          <span className="flex h-10 items-center rounded-l-sm border border-r-0 border-line bg-line/40 px-3 text-sm text-muted">+91</span>
          <Input type="tel" inputMode="numeric" autoComplete="tel-national" pattern="[6-9][0-9]{9}" maxLength={10} value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value.replace(/\D/g, "") })} className="rounded-l-none" />
        </div>
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Password"><PasswordInput required minLength={8} maxLength={72} autoComplete="new-password" placeholder="Min 8 characters" value={v.password} onChange={set("password")} /></Field>
        <Field label="Confirm password"><Input type="password" required autoComplete="new-password" placeholder="Type it once more" value={v.confirm} onChange={set("confirm")} /></Field>
      </div>
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
      <Button type="submit" size="lg" className="w-full" loading={busy}>Create account</Button>
    </form>
  );
}
