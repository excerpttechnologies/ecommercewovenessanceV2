import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { businessInfo, e164 } from "@/lib/business";
import { getSettings } from "@/lib/site-data";
import { LegalPage } from "@/components/content/legal-page";

export const metadata: Metadata = pageMetadata({
  title: "Return Policy",
  description:
    "How returns work at Woven Essence by Temple Fabrics, Bengaluru: what can be returned, the return window, damaged or wrong items, exchanges and refunds.",
  path: "/return-policy",
});

export default async function ReturnPolicyPage() {
  const settings = await getSettings();
  const info = businessInfo(settings);
  const returnDays = Math.max(1, Math.round(settings.commerce?.returnWindowDays ?? 7));

  return (
    <LegalPage
      title="Return Policy"
      path="/return-policy"
      intro="This page explains what can be returned, how to start a return, and what happens after we receive the piece."
    >
      <h2>1. Return eligibility</h2>
      <p>
        Unused, unwashed pieces with their original tags, packaging and invoice can be returned within {returnDays}{" "}
        {returnDays === 1 ? "day" : "days"} of delivery. The return window is counted from the delivery date recorded by
        the courier.
      </p>

      <h2>2. Products eligible for return</h2>
      <ul>
        <li>Sarees, dupattas, fabrics by the metre and other pieces that are unused and in their original condition.</li>
        <li>Pieces with their original tags, packaging and invoice intact.</li>
        <li>Pieces received damaged, defective or different from what was ordered.</li>
      </ul>

      <h2>3. Products that cannot be returned</h2>
      <ul>
        <li>Pieces that have been washed, worn, altered, stitched or customised.</li>
        <li>Blouse-stitched sarees, and any piece cut, stitched or tailored to your measurements.</li>
        <li>Fabrics cut to your length, and cut pieces from the fabric counters.</li>
        <li>Pieces returned without their tags, packaging or invoice.</li>
      </ul>

      <h2>4. Conditions for accepting a return</h2>
      <p>
        The piece must reach us in the condition it was sent, with no stains, perfume, make-up marks, damage or signs of
        use. Please pack it securely, ideally in the original packaging, and include the invoice or a note with your
        order number. Returns that do not meet these conditions cannot be accepted and will be sent back to you.
      </p>

      <h2>5. Damaged or defective products</h2>
      <p>
        If a parcel arrives damaged, tampered with or with a defective piece, photograph the parcel and the product and
        contact us within 48 hours of delivery. We will arrange a replacement or a full refund, including return
        shipping. Keep the outer packaging until the issue is resolved.
      </p>

      <h2>6. Wrong product received</h2>
      <p>
        If the piece you received is not what you ordered, tell us within 48 hours with photographs of the item, its tag
        and the invoice. We will arrange a pickup and send the correct piece where it is still available, or refund you
        in full if it is not.
      </p>

      <h2>7. How to submit a return request</h2>
      <p>
        Start a return from <Link href="/account/orders">Account → Orders</Link>, or send your order number and product
        code to <a href={`mailto:${info.email}`}>{info.email}</a> or call{" "}
        <a href={`tel:${e164(info.phone)}`}>{info.phone}</a>. Our team replies with the pickup details or the return
        address.
      </p>

      <h2>8. Proof and order details required</h2>
      <p>
        For every return we need your order number, the product code or name, and the reason for the return. For
        damaged, defective or wrong items, please also share photographs of the piece, the tag and the outer parcel, and
        a short description of what went wrong.
      </p>

      <h2>9. Return approval process</h2>
      <p>
        We review the request and confirm by email or WhatsApp whether it has been approved. Approved returns are
        inspected when they reach us; if the piece does not match the condition described, we will contact you before
        deciding the next step.
      </p>

      <h2>10. Return shipping</h2>
      <p>
        Where reverse pickup is available at your pincode, our team arranges it. If pickup is not available, we share the
        return address and confirm any shipping cost with you before you send the parcel. Return shipping is at our cost
        when the item was damaged, defective or wrong; for other approved returns, any applicable charge is confirmed
        with you in advance. Please do not send a parcel back without speaking to us first, as unannounced returns can
        be refused at the door.
      </p>

      <h2>11. Exchanges and replacements</h2>
      <p>
        Exchanges are offered for another piece of equal or higher value, subject to availability. Any price difference
        is payable by you, or refunded to you if the replacement is of lower value. Replacement is offered for damaged,
        defective or wrong items where the same piece is still in stock; otherwise a refund is issued.
      </p>

      <h2>12. Refund after an approved return</h2>
      <p>
        Once the returned piece reaches us and passes inspection, the refund is initiated within 3 business days.
        Prepaid orders are refunded to the original payment source, and cash-on-delivery orders are refunded to a bank
        account or UPI ID you provide. Please read our <Link href="/refund-policy">Refund Policy</Link> for the full
        timeline.
      </p>

      <h2>13. Customer support</h2>
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
    </LegalPage>
  );
}
