"use client";
import { useState } from "react";
import { api } from "@/hooks/api";

/** NEW: "Ship via Shiprocket" button for the admin order page. */
export function ShipNowButton({ orderNo, onDone }: { orderNo: string; onDone?: () => void }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function ship() {
    setBusy(true);
    setMsg(null);
    try {
      const { data } = await api<{ awbNo?: string | null; alreadyShipped?: boolean }>(
        `/api/v1/admin/orders/${encodeURIComponent(orderNo)}/ship`,
        { method: "POST" },
      );
      setMsg(data.awbNo ? `Sent to Shiprocket. AWB: ${data.awbNo}` : "Sent to Shiprocket. AWB will appear shortly.");
      onDone?.();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-sm border border-line p-4 text-sm">
      <button
        type="button"
        onClick={ship}
        disabled={busy}
        className="rounded-sm bg-olive px-4 py-2 text-xs uppercase tracking-widest text-white disabled:opacity-50"
      >
        {busy ? "Sending…" : "Ship via Shiprocket"}
      </button>
      {msg && <p className="mt-2 text-xs text-muted">{msg}</p>}
    </div>
  );
}
