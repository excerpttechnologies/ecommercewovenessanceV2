// [CHG-13] NEW FILE. WHY: static policy page for /pages/terms. A static folder beats the database [slug] route, so the footer link keeps working.
import type { Metadata } from "next";
import { PolicyLayout } from "@/components/policy/policy-layout";

export const metadata: Metadata = { title: "Terms of service" };

export default function Page() {
  return (
    <PolicyLayout
      title="Terms of service"
      intro="By using wovenessence.in or placing an order, you agree to these terms."
      facts={[{ label: "Currency", value: "Indian Rupees (INR)" }, { label: "Pay by", value: "UPI, cards, netbanking, COD" }, { label: "Governing law", value: "India · Bengaluru courts" }]}
      sections={[
        { heading: "Products and prices", items: ["Handloom pieces can have small natural variations, which are not defects", "Screen colours may differ slightly from the real product", "Prices include GST unless stated", "We may correct a pricing or stock error and cancel the order with a full refund"] },
        { heading: "Orders", items: ["An order is confirmed when online payment succeeds, or when we confirm a cash-on-delivery order", "We may cancel an order if stock runs out, the address is not serviceable, or we suspect misuse, with a full refund of any amount paid"] },
        { heading: "Payments", text: "We accept Razorpay (UPI, cards, netbanking, wallets) and cash on delivery where available. If money is deducted but no order appears, your bank usually reverses it within 5–7 working days. You can also write to us with the payment reference." },
        { heading: "Shipping, returns and refunds", text: "Our Shipping policy and Returns, exchanges and refunds page are part of these terms." },
        { heading: "Your account", text: "Keep your login details safe and give correct information. You are responsible for activity on your account." },
        { heading: "Use of the website", text: "Do not misuse the site or copy our photos, text or designs without written permission. All content belongs to Woven Essence / Temple Fabrics." },
        { heading: "Liability", text: "We are not responsible for delays caused by events outside our control. Our liability for any order is limited to the amount you paid for it." },
      ]}
    />
  );
}
