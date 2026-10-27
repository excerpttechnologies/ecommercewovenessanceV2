// [CHG-12] NEW FILE. WHY: refreshes the success page every few seconds so the order status stays live (used only while the order is not finished).
"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Re-runs the server page every few seconds so order status stays live. */
export function AutoRefresh({ seconds = 20 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds]);
  return null;
}
