// [CHG-13] NEW FILE. WHY: static policy page for /pages/returns. A static folder beats the database [slug] route, so the footer link keeps working.
import type { Metadata } from "next";
import { PolicyLayout } from "@/components/policy/policy-layout";

export const metadata: Metadata = { title: "Returns, exchanges & refunds" };

export default function Page() {
  return (
    <PolicyLayout
      title="Returns, exchanges & refunds"
      intro="We want you to love what you buy. If something is not right, here is how it works."
      facts={[{ label: "Exchange window", value: "7 days from delivery" }, { label: "Refund time", value: "5–7 working days" }, { label: "Damaged item", value: "Report within 48 hours" }]}
      sections={[
        { heading: "Exchanges and returns", items: ["Request within 7 days of delivery", "Item must be unused and unwashed, with tags and original packaging", "Not returnable: blouse-stitched sarees, custom or made-to-order items, fall and pico done sarees, final-sale items"] },
        { heading: "Damaged or wrong item", text: "Write to us within 48 hours of delivery with an unboxing video or photos. We send a replacement or a full refund, including shipping." },
        { heading: "How to request", items: ["Email hello@wovenessence.in or call 099163 11500 with your order number and a photo", "We confirm and arrange pickup or tell you where to send it", "After we receive and check the item, we process your exchange or refund"] },
        { heading: "Cancellation", items: ["Cancel before dispatch by contacting us. After dispatch, use the return process", "If you close the payment window without paying, the order is cancelled automatically and you are not charged"] },
        { heading: "Refunds", items: ["Online payments go back to the original payment method (UPI, card, netbanking or wallet) within 5–7 working days after approval; your bank may take a few more days to show it", "Cash on delivery orders are refunded by bank transfer or UPI within 5–7 working days after approval", "If money was deducted but the order failed, it is usually returned automatically in 5–7 working days. Contact us with the payment reference if not"] },
        { heading: "Return shipping", text: "Free for damaged, defective or wrong items. For other returns the customer pays the return courier unless we say otherwise." },
      ]}
    />
  );
}
