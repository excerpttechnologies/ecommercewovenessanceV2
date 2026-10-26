// [CHG-13] NEW FILE. WHY: static policy page for /pages/privacy-policy. A static folder beats the database [slug] route, so the footer link keeps working.
import type { Metadata } from "next";
import { PolicyLayout } from "@/components/policy/policy-layout";

export const metadata: Metadata = { title: "Privacy policy" };

export default function Page() {
  return (
    <PolicyLayout
      title="Privacy policy"
      intro="Woven Essence, run by Temple Fabrics in Bengaluru, collects only what it needs to deliver your order. We never sell your data."
      facts={[{ label: "Card details", value: "Never stored by us" }, { label: "Payments by", value: "Razorpay" }, { label: "Data sold", value: "Never" }]}
      sections={[
        { heading: "What we collect", items: ["Name, mobile number and email", "Delivery address and pincode", "Order items, amounts, payment mode and status", "Messages sent through the contact form or WhatsApp"] },
        { heading: "How we use it", items: ["Confirm, pack, ship and deliver your order", "Send order updates by SMS, email or WhatsApp", "Handle returns, exchanges, refunds and support", "Improve our website and products"] },
        { heading: "Payments", text: "Online payments are processed by Razorpay. Card, UPI and netbanking details are entered on Razorpay’s secure window. We never see or store them." },
        { heading: "Sharing", text: "We share only what is needed with delivery partners (name, address, phone) and with Razorpay for payment. We do not sell personal data." },
        { heading: "Cookies", text: "We use cookies to keep your bag and login working and to understand site usage. If you block them, the bag and checkout may not work." },
        { heading: "Your choices", text: "Write to hello@wovenessence.in to view, correct or delete your data. We keep order records as long as the law requires." },
        { heading: "Security", text: "We use secure https connections and limit who can see customer data." },
      ]}
    />
  );
}
