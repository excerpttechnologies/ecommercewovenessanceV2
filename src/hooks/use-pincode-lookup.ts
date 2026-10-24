"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/hooks/api";

interface PincodeLocation {
  pin: string;
  city: string;
  state: string;
}

type LookupStatus = "idle" | "checking" | "valid" | "invalid" | "error";

export function usePincodeLookup(pin: string) {
  const [status, setStatus] = useState<LookupStatus>("idle");
  const [location, setLocation] = useState<PincodeLocation | null>(null);

  useEffect(() => {
    setLocation(null);
    if (!pin) {
      setStatus("idle");
      return;
    }
    if (pin.length !== 6) {
      setStatus("idle");
      return;
    }
    if (!/^[1-9]\d{5}$/.test(pin)) {
      setStatus("invalid");
      return;
    }

    const controller = new AbortController();
    setStatus("checking");
    const timer = window.setTimeout(async () => {
      try {
        const result = (await api<PincodeLocation>(`/api/v1/pincode/lookup?pin=${encodeURIComponent(pin)}`, { signal: controller.signal })).data;
        if (controller.signal.aborted) return;
        setLocation(result);
        setStatus("valid");
      } catch (error) {
        if (controller.signal.aborted) return;
        setStatus(error instanceof ApiError && error.code === "PINCODE_INVALID" ? "invalid" : "error");
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [pin]);

  return { status, location };
}
