import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { businessInfo, e164 } from "@/lib/business";
import { getSettings } from "@/lib/site-data";
import { LegalPage } from "@/components/content/legal-page";

export const metadata: Metadata = pageMetadata({
  title: "Terms & Conditions",
  description:
    "The terms that apply when you browse wovenessence.in or place an order with Woven Essence by Temple Fabrics, Bengaluru — pricing, payment, delivery, returns and support.",
  path: "/terms-and-conditions",
});

export default async function TermsPage() {
  const info = businessInfo(await getSettings());

  return (
    <LegalPage
      title="Terms & Conditions"
      path="/terms-and-conditions"
      intro="These terms apply to your use of wovenessence.in and to every order placed through it. Please read them before you shop."
    >
      <h2>1. Introduction and acceptance</h2>
      <p>
        This website is operated by Temple Fabrics (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;), Jayanagar,
        Bengaluru, under the brand Woven Essence. By browsing the site, creating an account or placing an order, you
        agree to these Terms &amp; Conditions and to our{" "}
        <Link href="/refund-policy">Refund Policy</Link> and <Link href="/return-policy">Return Policy</Link>. If you do
        not agree with them, please do not use the site.
      </p>

      <h2>2. Website usage</h2>
      <p>
        You may use the site for lawful, personal shopping only. You must not attempt to disrupt or gain unauthorised
        access to it, copy its content or images for commercial use, or use automated tools to scrape prices, product
        data or stock information.
      </p>

      <h2>3. Customer eligibility</h2>
      <p>
        By placing an order you confirm that you are at least 18 years old, or that you are using the site under the
        supervision of a parent or guardian, and that the payment method you use is yours or is used with the
        cardholder&rsquo;s permission.
      </p>

      <h2>4. Account registration and responsibilities</h2>
      <p>
        You can shop as a guest or create an account. When you create an account, please give accurate contact and
        delivery details and keep your password private. You are responsible for orders placed and activity carried out
        through your account. Tell us immediately if you believe someone else has access to it.
      </p>

      <h2>5. Product descriptions and availability</h2>
      <p>
        We describe each piece by its fabric, weave, craft, colour and care as confirmed at our store. Photographs are
        indicative: handloom and hand-finished pieces vary slightly in shade, motif placement and finish, and screen
        settings affect how a colour appears. All products are subject to availability, and a piece may sell out in store
        before an online order is confirmed.
      </p>

      <h2>6. Product pricing and payment</h2>
      <p>
        Prices are shown in Indian Rupees and are inclusive of applicable GST. Shipping charges, if any, are shown at
        checkout before you pay. Online payments are processed by our payment gateway partner through UPI, credit card,
        debit card, net banking and other methods it supports; cash on delivery is offered where available. We do not
        store your card or UPI credentials.
      </p>

      <h2>7. Order placement and confirmation</h2>
      <p>
        Placing an order is an offer to buy. Your order is confirmed once the payment is received (or, for cash on
        delivery, once we accept it) and you receive a confirmation message with an order number. If a piece turns out
        to be unavailable, a pricing or description error is found, or we cannot deliver to your pincode, we may decline
        or cancel the order and refund any amount paid.
      </p>

      <h2>8. Order cancellation</h2>
      <p>
        You can cancel an order free of charge any time before it is dispatched by calling{" "}
        <a href={`tel:${e164(info.phone)}`}>{info.phone}</a> or writing to{" "}
        <a href={`mailto:${info.email}`}>{info.email}</a> with your order number. Once a parcel has been dispatched, it
        is treated as a return and the <Link href="/return-policy">Return Policy</Link> applies.
      </p>

      <h2>9. Shipping and delivery</h2>
      <p>
        We dispatch orders from Bengaluru to serviceable pincodes across India. Dispatch and delivery timelines are
        estimates, not guarantees, and can be affected by courier delays, weather, strikes or festival volumes. Please
        make sure someone is available at the delivery address; repeated failed delivery attempts may lead to the parcel
        being returned to us.
      </p>

      <h2>10. Returns and refunds</h2>
      <p>
        Returns are accepted under the conditions set out in our <Link href="/return-policy">Return Policy</Link>, and
        refunds are processed as described in our <Link href="/refund-policy">Refund Policy</Link>. Those two pages form
        part of these terms.
      </p>

      <h2>11. Intellectual property</h2>
      <p>
        The Woven Essence name, logo, page copy, product photographs and site design belong to us or are used with
        permission. You may not reproduce, republish or use them for commercial purposes without our written consent.
      </p>

      <h2>12. Limitation of liability</h2>
      <p>
        To the extent permitted by law, our liability for any claim relating to an order is limited to the amount you
        paid for that order. We are not liable for indirect or consequential loss, or for delays and failures caused by
        events outside our reasonable control.
      </p>

      <h2>13. Website content and accuracy</h2>
      <p>
        We work to keep product details, prices and stock accurate, but errors can occur. We may correct errors and
        update content at any time. The site may occasionally be unavailable for maintenance, and links to third-party
        sites are provided for convenience only — we are not responsible for their content.
      </p>

      <h2>14. Privacy and customer information</h2>
      <p>
        We collect the information needed to process your order and support you afterwards — your name, contact details,
        delivery address and order history. We use it to fulfil orders, arrange delivery, handle returns and send order
        updates, and we share it only with the partners who help us do that (payment gateway, courier and communication
        providers). We do not sell your information. To review or correct your details, write to{" "}
        <a href={`mailto:${info.email}`}>{info.email}</a>.
      </p>

      <h2>15. Changes to these terms</h2>
      <p>
        We may update these terms to reflect changes in our services or the law. The current version is always published
        on this page with its last-updated date, and it applies from the moment it is published.
      </p>

      <h2>16. Customer support and contact details</h2>
      <p>
        {info.address}
        <br />
        Phone: <a href={`tel:${e164(info.phone)}`}>{info.phone}</a>
        <br />
        Email: <a href={`mailto:${info.email}`}>{info.email}</a>
        <br />
        Hours: {info.hours}
        <br />
        You can also use our <Link href="/contact-us">contact page</Link>.
      </p>

      <h2>17. Governing law and jurisdiction</h2>
      <p>
        These terms are governed by the laws of India. Any dispute arising out of your use of this website or an order
        is subject to the jurisdiction of the courts at Bengaluru, Karnataka.
      </p>
    </LegalPage>
  );
}
