// import type { OrderStatus } from "@/domain/types";
// import type { BadgeTone } from "@/components/ui/badge";

// export const ORDER_FLOW: OrderStatus[] = ["Placed", "Confirmed", "Packed", "Shipped", "Out for delivery", "Delivered"];

// export function orderTone(s: OrderStatus): BadgeTone {
//   if (s === "Delivered") return "green";
//   if (s === "Cancelled" || s === "Returned") return "red";
//   if (s === "Shipped" || s === "Out for delivery") return "blue";
//   if (s === "Placed") return "amber";
//   return "olive";
// }

// export function OrderTimeline({ status }: { status: OrderStatus }) {
//   const idx = ORDER_FLOW.indexOf(status);
//   if (idx < 0) return <p className="text-sm text-red-700">Order {status.toLowerCase()}.</p>;
//   return (
//     <ol className="flex items-center gap-2 text-[10px] uppercase tracking-wider">
//       {ORDER_FLOW.map((s, i) => (
//         <li key={s} className="flex flex-1 items-center gap-2">
//           <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${i <= idx ? "bg-maroon" : "bg-line"}`} />
//           <span className={i <= idx ? "text-olive" : "text-muted"}>{s}</span>
//           {i < ORDER_FLOW.length - 1 && <span className={`h-px flex-1 ${i < idx ? "bg-maroon" : "bg-line"}`} />}
//         </li>
//       ))}
//     </ol>
//   );
// }

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


import { Check, CircleX } from "lucide-react";
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

/** Step tracker: numbered dots joined by a progress line; done steps get a tick, the current one a halo. */
export function OrderTimeline({ status }: { status: OrderStatus }) {
  const idx = ORDER_FLOW.indexOf(status);
  if (idx < 0) {
    return (
      <p className="flex items-center gap-2.5 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
        <CircleX className="h-5 w-5 shrink-0" /> This order was {status.toLowerCase()}.
      </p>
    );
  }
  return (
    <ol className="grid grid-cols-6">
      {ORDER_FLOW.map((s, i) => {
        const done = i <= idx;
        return (
          <li key={s} className="relative flex flex-col items-center text-center">
            {i > 0 && <span aria-hidden className={`absolute right-1/2 top-3.5 h-0.5 w-full -translate-y-1/2 ${i <= idx ? "bg-maroon" : "bg-line"}`} />}
            <span className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold ${done ? "bg-maroon text-white" : "border-2 border-line bg-white text-muted"} ${i === idx ? "ring-4 ring-maroon/15" : ""}`}>
              {i < idx ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span className={`mt-2 px-0.5 text-[10px] leading-tight sm:text-[11px] ${done ? "font-semibold text-ink" : "text-muted"}`}>{s}</span>
          </li>
        );
      })}
    </ol>
  );
}
