"use client";
import { ArrowRight, Check, Mail } from "lucide-react";
import { useState } from "react";
import { api } from "@/hooks/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** `compact` = footer (square input + attached button); `pill` = white pill with the button inside (newsletter band). */
export function NewsletterForm({ compact, variant }: { compact?: boolean; variant?: "pill" }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("busy");
    try {
      await api("/api/v1/enquiries", { method: "POST", json: { type: "newsletter", email } });
      setState("done");
      setEmail("");
    } catch {
      setState("error");
    }
  };
  const message = state === "done" ? "Thank you! You're on the list for new weaves and offers." : state === "error" ? "Couldn't subscribe right now. Please try again." : "";

  if (variant === "pill") {
    return (
      <div>
        <form onSubmit={submit} className="flex items-center rounded-full bg-white p-1 ring-2 ring-white/60 transition-shadow focus-within:ring-4 focus-within:ring-white/40">
          <Mail className="ml-3.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (state !== "busy") setState("idle");
            }}
            placeholder="Your email address"
            aria-label="Email address"
            className="h-10 min-w-0 flex-1 bg-transparent px-2.5 text-sm text-ink placeholder:text-muted focus:outline-none"
          />
          <button type="submit" disabled={state === "busy"} className="group inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-maroon px-5 text-sm font-semibold text-white transition-colors hover:bg-gold disabled:opacity-70 sm:px-6">
            {state === "busy" ? "Subscribing…" : state === "done" ? <><Check className="h-4 w-4" /> Subscribed</> : <>Subscribe <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></>}
          </button>
        </form>
        <p role="status" aria-live="polite" className="mt-2 min-h-[1.25rem] text-xs text-white/90">{message}</p>
      </div>
    );
  }

  return (
    <div className={compact ? undefined : "mx-auto max-w-md"}>
      <form
        className={cn("flex", compact ? "rounded-md shadow-[0_10px_30px_-18px_rgba(0,0,0,0.35)]" : "gap-2")}
        onSubmit={submit}
      >
        <Input
          type="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state !== "busy") setState("idle");
          }}
          placeholder="Your email address"
          aria-label="Email address"
          className={compact ? "h-14 rounded-r-none border-white bg-white px-5 text-[15px]" : "h-11 border-white bg-white"}
        />
        <Button type="submit" size="md" variant={compact ? "primary" : "secondary"} loading={state === "busy"} className={cn("group shrink-0", compact ? "h-14 rounded-l-none px-6 text-[15px]" : "h-11")}>
          {state === "done" ? <><Check className="h-4 w-4" /> Subscribed</> : <>Subscribe {compact && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}</>}
        </Button>
      </form>
      <p role="status" aria-live="polite" className={cn("mt-2 min-h-[1.25rem] text-xs", compact ? "text-ink/70 max-md:text-white/90" : "text-white/90")}>
        {message}
      </p>
    </div>
  );
}
