"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError } from "@/hooks/api";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

function loginErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return "Login failed. Please try again.";
  if (error.status === 401) return "Incorrect email or password.";
  if (error.status === 422) return "Enter a valid email address and password.";
  if (error.status >= 500) return "Admin login is temporarily unavailable. Please try again.";
  return error.message;
}

export function AdminLoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); setBusy(true); setError(null); try { await api("/api/v1/admin/auth/login", { method: "POST", json: { email, password } }); router.push(next); router.refresh(); } catch (err) { setError(loginErrorMessage(err)); setBusy(false); } }}>
      <Field label="Email"><Input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
      <Field label="Password"><Input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
      {error && <p className="text-xs text-red-700">{error}</p>}
      <Button type="submit" className="w-full" loading={busy}>Log in</Button>
    </form>
  );
}
