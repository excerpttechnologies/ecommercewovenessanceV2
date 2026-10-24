"use client";
import { Badge } from "@/components/ui/badge";
import { ResourcePage } from "@/components/admin/resource-page";

interface E { _id: string; type: string; name?: string; mobile?: string; email?: string; message?: string; sku?: string; status: "new" | "in_progress" | "closed"; createdAt?: string }
const tone = { new: "amber", in_progress: "blue", closed: "muted" } as const;

export default function EnquiriesPage() {
  return (
    <ResourcePage<E>
      resource="enquiries"
      title="Enquiries & newsletter"
      canCreate={false}
      filters={[
        { key: "type", label: "Type", options: ["contact", "support", "product", "whatsapp", "newsletter"].map((v) => ({ value: v, label: v === "support" ? "help request" : v })) },
        { key: "status", label: "Status", options: ["new", "in_progress", "closed"].map((v) => ({ value: v, label: v })) },
      ]}
      columns={[
        { key: "createdAt", label: "Date", render: (r) => (r.createdAt ? new Date(r.createdAt).toLocaleString("en-IN") : "") },
        { key: "type", label: "Type", render: (r) => <Badge tone="gold">{r.type}</Badge> },
        { key: "name", label: "Contact", render: (r) => <>{r.name}<span className="block text-xs text-muted">{[r.mobile, r.email].filter(Boolean).join(" · ")}</span></> },
        { key: "message", label: "Message", render: (r) => <span className="line-clamp-2 text-xs">{r.sku ? <b>Item Code {r.sku}: </b> : null}{r.message}</span> },
        { key: "status", label: "Status", render: (r) => <Badge tone={tone[r.status]}>{r.status}</Badge> },
      ]}
      fields={[{ name: "status", label: "Status", type: "select", options: ["new", "in_progress", "closed"].map((v) => ({ value: v, label: v })) }]}
      rowActions={(r, mutate) => (
        <span className="flex justify-end gap-2 text-xs uppercase tracking-widest">
          {r.status === "new" && <button onClick={() => mutate(r._id, { status: "in_progress" })} className="text-olive">Start</button>}
          {r.status !== "closed" && <button onClick={() => mutate(r._id, { status: "closed" })} className="text-muted">Close</button>}
        </span>
      )}
    />
  );
}
