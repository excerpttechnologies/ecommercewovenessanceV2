"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError } from "@/hooks/api";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

export function OtpLogin({ next }: { next: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [mobile, setMobile] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [step, setStep] = useState<"mobile" | "code">("mobile");
  const [devOtp, setDevOtp] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setBusy(true); setError(null);
    try {
      const r = (await api<{ devOtp?: string }>("/api/v1/auth/otp/send", { method: "POST", json: { mobile } })).data;
      setDevOtp(r.devOtp);
      setStep("code");
    } catch (e) { setError(e instanceof ApiError ? e.message : "Could not send OTP"); }
    finally { setBusy(false); }
  }
  async function verify() {
    setBusy(true); setError(null);
    try {
      await api("/api/v1/auth/otp/verify", { method: "POST", json: { mobile, code, name: name || undefined } });
      qc.invalidateQueries();
      router.push(next);
      router.refresh();
    } catch (e) { setError(e instanceof ApiError ? e.message : "Could not verify"); setBusy(false); }
  }

  return (
    <form className="mt-8 space-y-4" onSubmit={(e) => { e.preventDefault(); step === "mobile" ? send() : verify(); }}>
      <Field label="Mobile number">
        <div className="flex">
          <span className="flex h-10 items-center rounded-l-sm border border-r-0 border-line bg-line/40 px-3 text-sm text-muted">+91</span>
          <Input required inputMode="numeric" pattern="[6-9][0-9]{9}" maxLength={10} value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))} disabled={step === "code"} className="rounded-l-none" />
        </div>
      </Field>
      {step === "code" && (
        <>
          <Field label="6-digit code" hint={devOtp ? `Dev mode — your code is ${devOtp}` : "Sent by SMS · valid for 5 minutes"}>
            <Input required autoFocus inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} className="tracking-[0.5em]" />
          </Field>
          <Field label="Your name (first time only)"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
        </>
      )}
      {error && <p className="text-xs text-red-700">{error}</p>}
      <Button type="submit" size="lg" className="w-full" loading={busy}>{step === "mobile" ? "Send OTP" : "Verify & continue"}</Button>
      {step === "code" && <button type="button" onClick={() => { setStep("mobile"); setCode(""); }} className="block w-full text-center text-xs uppercase tracking-widest text-muted">Change number</button>}
    </form>
  );
}
