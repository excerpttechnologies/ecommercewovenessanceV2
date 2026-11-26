// "use client";
// import { useCallback, useRef, useState } from "react";
// import type { CartLine } from "@/lib/pricing";
// import { useToast } from "@/store/toast";
// import { useCart } from "./useCart";

// /** Kept in step with .we-cart-line-out in globals.css. */
// const EXIT_MS = 200;

// /**
//  * Shared remove flow for the drawer and the View Bag page. It fades the line out,
//  * removes it through the existing cart API (PATCH qty 0), then offers a 5s Undo
//  * that restores the exact line — same sku, quantity and original position.
//  */
// export function useCartLineRemoval() {
//   const { remove, update } = useCart();
//   const showToast = useToast((state) => state.show);
//   const [removing, setRemoving] = useState<string[]>([]);
//   const inFlight = useRef(new Set<string>());

//   const removeLine = useCallback(
//     async (line: CartLine, position: number) => {
//       if (inFlight.current.has(line.sku)) return;
//       inFlight.current.add(line.sku);
//       setRemoving((current) => [...current, line.sku]);

//       await new Promise((resolve) => setTimeout(resolve, EXIT_MS));

//       try {
//         await remove.mutateAsync({ sku: line.sku });
//         showToast({
//           message: "Removed from bag",
//           action: {
//             label: "Undo",
//             onClick: () =>
//               update.mutateAsync({
//                 sku: line.sku,
//                 qty: line.qty,
//                 position,
//               }),
//           },
//         });
//       } catch {
//         // The mutation's error state is shown by the calling component; keep the toast short.
//         showToast({ message: "Could not remove item. Please try again." });
//       } finally {
//         inFlight.current.delete(line.sku);
//         setRemoving((current) => current.filter((sku) => sku !== line.sku));
//       }
//     },
//     [remove, showToast, update],
//   );

//   const isRemoving = useCallback((sku: string) => removing.includes(sku), [removing]);

//   return { removeLine, isRemoving, removing, removeError: (remove.error as Error | null) ?? null };
// }


"use client";

import { useCallback, useRef, useState } from "react";
import type { CartLine } from "@/lib/pricing";
import { useToast } from "@/store/toast";
import { useCart } from "./useCart";

/** Kept in step with .we-cart-line-out in globals.css. */
const EXIT_MS = 200;

/**
 * Shared remove flow for the drawer and View Bag page.
 * Removes through the existing cart API (PATCH qty 0),
 * then offers Undo to restore the original quantity.
 */
export function useCartLineRemoval() {
  const { update } = useCart();
  const showToast = useToast((state) => state.show);

  const [removing, setRemoving] = useState<string[]>([]);
  const inFlight = useRef(new Set<string>());

  const removeLine = useCallback(
    async (line: CartLine, _position: number) => {
      if (inFlight.current.has(line.sku)) return;

      inFlight.current.add(line.sku);
      setRemoving((current) => [...current, line.sku]);

      await new Promise((resolve) => setTimeout(resolve, EXIT_MS));

      try {
        await update.mutateAsync({
          sku: line.sku,
          qty: 0,
        });

        showToast({
          message: "Removed from bag",
          action: {
            label: "Undo",
            onClick: () =>
              update.mutateAsync({
                sku: line.sku,
                qty: line.qty,
              }),
          },
        });
      } catch {
        showToast({
          message: "Could not remove item. Please try again.",
        });
      } finally {
        inFlight.current.delete(line.sku);
        setRemoving((current) =>
          current.filter((sku) => sku !== line.sku),
        );
      }
    },
    [update, showToast],
  );

  const isRemoving = useCallback(
    (sku: string) => removing.includes(sku),
    [removing],
  );

  return {
    removeLine,
    isRemoving,
    removing,
    removeError: (update.error as Error | null) ?? null,
  };
}
