import type { OrderStatus } from "@/domain/types";
import type { BadgeTone } from "@/components/ui/badge";

export const ORDER_FLOW: OrderStatus[] = ["Placed", "Confirmed", "Packed", "Shipped", "Out for delivery", "Delivered"];

export function orderTone(s: OrderStatus): BadgeTone {
  if (s === "Delivered") return "green";
  if (s === "Cancelled" || s === "Returned") return "red";
  if (s === "Shipped" || s === "Out for delivery") return "blue";
  if (s === "Placed") return "amber";
  return "olive";
}

export function OrderTimeline({ status }: { status: OrderStatus }) {
  const idx = ORDER_FLOW.indexOf(status);
  if (idx < 0) return <p className="text-sm text-red-700">Order {status.toLowerCase()}.</p>;
  return (
    <ol className="flex items-center gap-2 text-[10px] uppercase tracking-widest">
      {ORDER_FLOW.map((s, i) => (
        <li key={s} className="flex flex-1 items-center gap-2">
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${i <= idx ? "bg-olive" : "bg-line"}`} />
          <span className={i <= idx ? "text-olive" : "text-muted"}>{s}</span>
          {i < ORDER_FLOW.length - 1 && <span className={`h-px flex-1 ${i < idx ? "bg-olive" : "bg-line"}`} />}
        </li>
      ))}
    </ol>
  );
}
