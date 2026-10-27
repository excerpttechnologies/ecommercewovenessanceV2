"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/hooks/api";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { ArrowRight, Eye, EyeOff, Lock, Mail, Phone, User } from "lucide-react";
import { cn } from "@/lib/utils";

const field = "h-12 rounded-lg pl-11";

/** Input with a leading icon. */
function IconInput({ icon: Icon, className, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted" />
      <Input {...props} className={cn(field, className)} />
    </div>
  );
}

function PasswordInput(props: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted" />
      <Input {...props} type={shown ? "text" : "password"} className={cn(field, "pr-11")} />
      <button type="button" onClick={() => setShown((v) => !v)} aria-label={shown ? "Hide password" : "Show password"} aria-pressed={shown} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted hover:text-maroon">
        {shown ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
      </button>
    </div>
  );
}

const submitClass = "h-12 w-full rounded-full text-[15px] shadow-[0_12px_26px_-12px_rgba(219,26,114,0.9)]";

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
    <form className="mt-7 space-y-5" onSubmit={(e) => { e.preventDefault(); submit("/api/v1/auth/login", { email, password }); }}>
      <Field label="Email address"><IconInput icon={Mail} type="email" required autoComplete="email" placeholder="Enter your email address" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
      <Field label="Password"><PasswordInput required autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">{error}</p>}
      <Button type="submit" size="lg" className={submitClass} loading={busy}>Log in {!busy && <ArrowRight className="h-4 w-4" />}</Button>
    </form>
  );
}

export function RegisterForm({ next }: { next: string }) {
  const { busy, error, setError, submit } = useAuthSubmit(next);
  const [v, setV] = useState({ name: "", email: "", phone: "", password: "", confirm: "" });
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value });
  return (
    <form
      className="mt-7 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (v.password !== v.confirm) return setError("Passwords don't match");
        submit("/api/v1/auth/register", { name: v.name, email: v.email, phone: v.phone || undefined, password: v.password });
      }}
    >
      <Field label="Full name"><IconInput icon={User} required minLength={2} maxLength={80} autoComplete="name" placeholder="Enter your full name" value={v.name} onChange={set("name")} /></Field>
      <Field label="Email address"><IconInput icon={Mail} type="email" required autoComplete="email" placeholder="Enter your email address" value={v.email} onChange={set("email")} /></Field>
      <Field label="Phone number (optional)" hint="For delivery updates only">
        <div className="flex gap-2">
          <span className="flex h-12 shrink-0 items-center rounded-lg border border-line bg-[#f7f4f5] px-3.5 text-sm font-medium text-olive">+91</span>
          <div className="min-w-0 flex-1">
            <IconInput icon={Phone} type="tel" inputMode="numeric" autoComplete="tel-national" pattern="[6-9][0-9]{9}" maxLength={10} placeholder="Enter your phone number" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value.replace(/\D/g, "") })} />
          </div>
        </div>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Password"><PasswordInput required minLength={8} maxLength={72} autoComplete="new-password" placeholder="Min 8 characters" value={v.password} onChange={set("password")} /></Field>
        <Field label="Confirm password"><PasswordInput required autoComplete="new-password" placeholder="Type it once more" value={v.confirm} onChange={set("confirm")} /></Field>
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">{error}</p>}
      <Button type="submit" size="lg" className={submitClass} loading={busy}>Create account {!busy && <ArrowRight className="h-4 w-4" />}</Button>
    </form>
  );
}
