"use client";
import { useState } from "react";
import { api } from "@/hooks/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function NewsletterForm({ compact }: { compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  return (
    <form
      className={compact ? "flex gap-2" : "mx-auto flex max-w-md gap-2"}
      onSubmit={async (e) => {
        e.preventDefault();
        setState("busy");
        try {
          await api("/api/v1/enquiries", { method: "POST", json: { type: "newsletter", email } });
          setState("done");
          setEmail("");
        } catch {
          setState("error");
        }
      }}
    >
      <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email" className={compact ? "h-9 text-xs" : ""} />
      <Button type="submit" size={compact ? "sm" : "md"} variant="secondary" loading={state === "busy"}>
        {state === "done" ? "Done" : "Join"}
      </Button>
    </form>
  );
}
