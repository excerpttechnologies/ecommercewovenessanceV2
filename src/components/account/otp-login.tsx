"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Mail, MessageCircle, Phone } from "lucide-react";
import { api, ApiError } from "@/hooks/api";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { COUNTRY_CODES } from "@/lib/whatsapp/phone";

const field = "h-12 rounded-lg pl-11";

const messageFor = (e: unknown) => {
  if (e instanceof ApiError) return e.message;
  return "Something went wrong. Please try again.";
};

/**
 * WhatsApp OTP login, rendered inside the existing AuthShell/LoginForm card.
 * The email + password form stays the default; this is a compact alternative.
 */
export function OtpLogin({ next, onBack }: { next: string; onBack?: () => void }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [countryCode, setCountryCode] = useState("91");
  const [mobile, setMobile] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [requiresName, setRequiresName] = useState(false);
  const [step, setStep] = useState<"mobile" | "code">("mobile");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [expiresIn, setExpiresIn] = useState(0);

  // Resend + expiry countdowns. The code itself is never shown in the browser.
  const counting = cooldown > 0 || expiresIn > 0;
  useEffect(() => {
    if (!counting) return;
    const timer = window.setInterval(() => {
      setCooldown((value) => (value > 0 ? value - 1 : 0));
      setExpiresIn((value) => (value > 0 ? value - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [counting]);

  async function send() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = (
        await api<{ expiresInSec: number; resendAfterSec: number }>("/api/v1/auth/otp/send", {
          method: "POST",
          json: { mobile, countryCode },
        })
      ).data;
      setStep("code");
      setCode("");
      setRequiresName(false);
      setName("");
      setCooldown(result.resendAfterSec);
      setExpiresIn(result.expiresInSec);
      setNotice("OTP sent successfully to your WhatsApp number.");
    } catch (e) {
      setError(messageFor(e));
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    if (cooldown > 0 || busy) return;
    await send();
  }

  async function verify() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await api("/api/v1/auth/otp/verify", {
        method: "POST",
        json: {
          mobile,
          countryCode,
          code,
          name: name.trim() ? name.trim() : undefined,
        },
      });
      qc.invalidateQueries();
      router.push(next);
      router.refresh();
    } catch (e) {
      // New number: the server asks for the minimum registration detail before
      // consuming the code. The same (still valid) code is submitted again.
      if (e instanceof ApiError && (e.code === "REGISTRATION_REQUIRED" || (e.details as { requiresName?: boolean } | undefined)?.requiresName)) {
        setRequiresName(true);
        setError("Please enter your name to finish creating your account.");
        setBusy(false);
        return;
      }
      setError(messageFor(e));
      setBusy(false);
    }
  }

  const expiry = `${Math.floor(expiresIn / 60)}:${String(expiresIn % 60).padStart(2, "0")}`;

  return (
    <form
      className="mt-7 space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (step === "mobile") void send();
        else void verify();
      }}
    >
      <div className="flex items-center gap-2 rounded-lg bg-[#f7f4f5] px-3 py-2 text-xs text-olive">
        <MessageCircle className="h-4 w-4 shrink-0" />
        <span>Log in with the WhatsApp number linked to your account.</span>
      </div>

      <Field label="Mobile number" hint={step === "mobile" ? "We'll send a 6-digit code on WhatsApp." : undefined}>
        <div className="flex gap-2">
          <Select
            aria-label="Country code"
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            disabled={step === "code" || busy}
            className="h-12 w-[132px] shrink-0 rounded-lg"
          >
            {COUNTRY_CODES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.label}
              </option>
            ))}
          </Select>
          <div className="relative min-w-0 flex-1">
            <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted" />
            <Input
              required
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={15}
              placeholder="Enter your mobile number"
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
              disabled={step === "code" || busy}
              className={field}
            />
          </div>
        </div>
      </Field>

      {step === "code" && (
        <>
          <Field
            label="6-digit WhatsApp code"
            hint={expiresIn > 0 ? `Code expires in ${expiry} · sent to +${countryCode} ${mobile}` : "This code has expired. Request a new one."}
          >
            <Input
              required
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="h-12 rounded-lg text-center text-lg tracking-[0.5em]"
            />
          </Field>

          {requiresName && (
            <Field label="Your name" hint="Required once, so we can create your customer account.">
              <Input
                required
                minLength={2}
                maxLength={80}
                autoComplete="name"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 rounded-lg"
              />
            </Field>
          )}

          <div className="flex items-center justify-between gap-3 text-xs">
            <button
              type="button"
              onClick={() => {
                setStep("mobile");
                setCode("");
                setError(null);
                setNotice(null);
                setRequiresName(false);
                setCooldown(0);
                setExpiresIn(0);
              }}
              className="font-medium text-muted hover:text-maroon"
            >
              Change number
            </button>
            <button
              type="button"
              onClick={() => void resend()}
              disabled={cooldown > 0 || busy}
              className="font-semibold text-maroon underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:text-muted disabled:no-underline"
            >
              {cooldown > 0 ? `Resend OTP in ${cooldown}s` : "Resend OTP"}
            </button>
          </div>
        </>
      )}

      {notice && <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-xs text-green-800">{notice}</p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">{error}</p>}

      <Button type="submit" size="lg" className="h-12 w-full rounded-full text-[15px] shadow-[0_12px_26px_-12px_rgba(219,26,114,0.9)]" loading={busy}>
        {step === "mobile" ? "Send OTP" : "Verify OTP"} {!busy && <ArrowRight className="h-4 w-4" />}
      </Button>

      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="mx-auto flex items-center gap-2 text-xs font-medium text-muted hover:text-maroon"
        >
          <Mail className="h-4 w-4" /> Use email and password instead
        </button>
      ) : null}
    </form>
  );
}
