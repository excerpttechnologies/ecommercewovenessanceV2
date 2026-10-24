"use client";
import { useState } from "react";
import { api } from "@/hooks/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PincodeCheck() {
  const [pin, setPin] = useState("");
  const [res, setRes] = useState<{ serviceable: boolean; etaDays?: number; cod?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div>
      <form className="flex gap-2" onSubmit={async (e) => { e.preventDefault(); setBusy(true); try { setRes((await api<{ serviceable: boolean; etaDays?: number; cod?: boolean }>(`/api/v1/pincode?pin=${pin}`)).data); } finally { setBusy(false); } }}>
        <Input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required placeholder="Enter pincode" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} />
        <Button type="submit" variant="outline" loading={busy}>Check</Button>
      </form>
      {res && (
        <p className={`mt-2 text-xs ${res.serviceable ? "text-olive" : "text-red-700"}`}>
          {res.serviceable ? `Delivery in ${res.etaDays} days${res.cod ? " · COD available" : ""}` : "Sorry, we don't deliver to this pincode yet."}
        </p>
      )}
    </div>
  );
}
