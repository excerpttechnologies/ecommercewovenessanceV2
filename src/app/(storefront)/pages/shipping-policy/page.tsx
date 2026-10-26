// [CHG-13] NEW FILE. WHY: static policy page for /pages/shipping-policy. A static folder beats the database [slug] route, so the footer link keeps working.
import type { Metadata } from "next";
import { PolicyLayout } from "@/components/policy/policy-layout";

export const metadata: Metadata = { title: "Shipping policy" };

export default function Page() {
  return (
    <PolicyLayout
      title="Shipping policy"
      intro="We ship across India from Bengaluru."
      facts={[{ label: "Dispatch", value: "Within 2 working days" }, { label: "Free shipping", value: "Above ₹4,999" }, { label: "Cash on delivery", value: "On eligible pincodes" }]}
      sections={[
        { heading: "Dispatch time", items: ["In-stock orders are dispatched within 2 working days of confirmation", "Blouse stitching or made-to-order items take longer; we tell you the date before dispatch"] },
        { heading: "Delivery time", items: ["Karnataka and nearby cities: usually 2–4 working days after dispatch", "Rest of India: usually 4–8 working days after dispatch", "Remote locations can take longer"] },
        { heading: "Shipping charges", text: "Shipping is free on orders above ₹4,999. Below that, the charge is shown at checkout before you pay." },
        { heading: "Cash on delivery", text: "Available on eligible pincodes. Please keep the exact amount ready when the parcel arrives." },
        { heading: "Tracking", text: "After dispatch you receive courier and tracking details by SMS or email. You can also use Track order on our website." },
        { heading: "Delivery problems", items: ["Check the parcel at delivery. If it is damaged or opened, tell the courier and write to us within 48 hours with photos", "If delivery fails repeatedly, the parcel returns to us and prepaid orders are refunded after we confirm the return shipping cost"] },
        { heading: "Delivery area", text: "We deliver to serviceable pincodes only. Checkout tells you if yours is not served." },
      ]}
    />
  );
}
