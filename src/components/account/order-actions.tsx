"use client";

import { useState } from "react";
import { Gift, Printer } from "lucide-react";

export function InvoiceButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-maroon hover:underline"
    >
      <Printer className="h-4 w-4" /> Invoice
    </button>
  );
}

export function GiftReceiptButton({ orderNo, items }: { orderNo: string; items: string[] }) {
  const [done, setDone] = useState(false);

  async function share() {
    // Gift receipt = order number + item names, no prices
    const text = `Gift receipt\nOrder: ${orderNo}\n${items.map((n) => `• ${n}`).join("\n")}`;
    try {
      if (navigator.share) await navigator.share({ title: "Gift receipt", text });
      else {
        await navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 2000);
      }
    } catch {
      /* user cancelled */
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className="flex w-full items-center justify-center gap-2 rounded-full border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-maroon hover:text-maroon"
    >
      <Gift className="h-4 w-4" /> {done ? "Copied" : "Share gift receipt"}
    </button>
  );
}