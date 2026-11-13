import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { businessInfo, e164 } from "@/lib/business";
import { getSettings } from "@/lib/site-data";
import { LegalPage } from "@/components/content/legal-page";

export const metadata: Metadata = pageMetadata({
  title: "Refund Policy",
  description:
    "How refunds work at Woven Essence by Temple Fabrics, Bengaluru: when a refund applies, how to request one, the approval process and how long it takes.",
  path: "/refund-policy",
});

export default async function RefundPolicyPage() {
  const info = businessInfo(await getSettings());

  return (
    <LegalPage
      title="Refund Policy"
      path="/refund-policy"
      intro="This page explains when a refund applies, how to request one, and how the money reaches you."
    >
      <h2>1. Refund eligibility</h2>
      <p>
        Refunds are issued for payments received by us through the website. The amount refunded is the amount actually
        paid for the item, after any coupon discount applied to it. Shipping charges are refunded where the order was
        cancelled before dispatch, or where the fault was ours (a damaged, defective or wrong item). Refunds are made to
        the original payment method for prepaid orders, and by bank transfer or UPI for cash-on-delivery orders.
      </p>

      <h2>2. When a refund is permitted</h2>
      <ul>
        <li>You cancel an order before it is dispatched.</li>
        <li>We cancel an order because a piece is unavailable, a pricing error is found, or we cannot deliver to your pincode.</li>
        <li>Payment was captured but the order was not confirmed — for example, a failed or interrupted checkout.</li>
        <li>You were charged twice for the same order, or paid for an order that was already paid another way.</li>
        <li>
          A return is approved under our <Link href="/return-policy">Return Policy</Link>, including damaged, defective or
          wrong items.
        </li>
        <li>An exchange is approved for a piece of lower value, and the difference is due to you.</li>
      </ul>

      <h2>3. How to request a refund</h2>
      <p>
        Write to <a href={`mailto:${info.email}`}>{info.email}</a> or call{" "}
        <a href={`tel:${e164(info.phone)}`}>{info.phone}</a> with your order number and the reason for the request. For a
        return, you can also start from <Link href="/account/orders">Account → Orders</Link>. If the request relates to a
        payment, please include the payment date, amount and transaction reference so we can trace it quickly.
      </p>

      <h2>4. Refund approval process</h2>
      <p>
        We check each request against the order, the payment record and — for returns — the condition of the piece once
        it reaches us. We confirm the outcome by email or WhatsApp. For returns, the refund is approved only after the
        item has been received and inspected. If a request is not approved, we tell you the reason and, where possible,
        offer an exchange instead.
      </p>

      <h2>5. Refund processing timeline</h2>
      <p>
        Once a refund is approved, we initiate it within 3 business days. Your bank or payment provider then takes
        another 5&ndash;7 working days to credit the amount, depending on the method used. Cash-on-delivery refunds are
        transferred to the bank account or UPI ID you provide, and may take a little longer while the details are
        verified.
      </p>

      <h2>6. Refund to the original payment method</h2>
      <p>
        Prepaid refunds are sent back through the same method you paid with — the same card, UPI handle or net-banking
        account — through our payment gateway. We cannot send a prepaid refund to a different card or account. If the
        original method has expired or been closed, contact your bank first; if that is not workable, write to us and we
        will help.
      </p>

      <h2>7. Failed or duplicate payments</h2>
      <p>
        If a payment fails but the amount is debited, your bank usually reverses it automatically within 5&ndash;7 working
        days. If the amount is not returned, send us the transaction reference and we will raise it with our payment
        gateway. Duplicate charges for the same order are refunded in full once verified. We never ask for your card
        number, CVV, UPI PIN or OTP — please do not share those with anyone.
      </p>

      <h2>8. Cancelled orders</h2>
      <p>
        Orders cancelled before dispatch are refunded in full, including any shipping charge. Orders cancelled after
        dispatch are handled as returns, so the refund follows the{" "}
        <Link href="/return-policy">Return Policy</Link>. If an order is cancelled by us because a piece is unavailable,
        the full amount is refunded.
      </p>

      <h2>9. Refund status and communication</h2>
      <p>
        We message you at each step: when the request is received, when it is approved, and when the refund has been
        initiated. You can also check the status under <Link href="/account/orders">Account → Orders</Link>. If the
        amount has not appeared after 7 working days from our refund confirmation, contact us with your order number and
        we will follow up with the gateway or your bank.
      </p>

      <h2>10. Customer support</h2>
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
