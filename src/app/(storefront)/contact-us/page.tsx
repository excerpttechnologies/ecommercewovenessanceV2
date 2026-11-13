import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import ContactPage from "../contact/page";

/** Same contact page as /contact, published at the URL Razorpay onboarding looks for. */
export const metadata: Metadata = pageMetadata({
  title: "Contact Us",
  description:
    "Questions about a saree, an order or delivery? Call, email or WhatsApp the Woven Essence team at Temple Fabrics, Jayanagar, Bengaluru.",
  path: "/contact",
});

export default function ContactUsPage() {
  return <ContactPage />;
}
