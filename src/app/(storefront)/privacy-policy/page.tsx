import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { businessInfo, e164, whatsAppHref } from "@/lib/business";
import { getSettings } from "@/lib/site-data";
import { LegalPage } from "@/components/content/legal-page";

export const metadata: Metadata = pageMetadata({
  title: "Privacy Policy",
  description:
    "How Woven Essence by Temple Fabrics collects, uses and protects the information you share when you browse wovenessence.in or place an order — including payment, delivery and cookie practices.",
  path: "/privacy-policy",
});

export default async function PrivacyPolicyPage() {
  const settings = await getSettings();
  const info = businessInfo(settings);
  const onlinePayments = settings.commerce?.razorpayEnabled !== false;

  return (
    <LegalPage
      title="Privacy Policy"
      path="/privacy-policy"
      intro="This policy explains what information Woven Essence collects when you visit wovenessence.in or place an order, why we collect it, who we share it with, and the choices you have."
    >
      <h2>1. Introduction</h2>
      <p>
        This website, <strong>https://wovenessence.in/</strong>, is operated by {settings.legalName ?? "Temple Fabrics"},
        Jayanagar, Bengaluru, trading under the brand Woven Essence (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;). We
        collect, use, store and protect customer information as described in this policy. It applies to everyone who
        visits the website, creates an account, contacts us or places an order, whether as a guest or a registered
        customer.
      </p>
      <p>
        By using the website you agree to this policy. If you do not agree with it, please do not use the site or place
        an order.         our <Link href="/terms-and-conditions">Terms &amp; Conditions</Link> and{" "}
        <Link href="/refund-policy">Refund Policy</Link> apply alongside it.
      </p>

      <h2>2. Information we collect</h2>
      <p>We only collect what we need to sell you a product, deliver it and support you afterwards.</p>
      <h3>Information you give us</h3>
      <ul>
        <li>Your name, mobile number and email address.</li>
        <li>Billing and delivery addresses, including pincode.</li>
        <li>Our messages to and from you — contact-form enquiries, product questions, WhatsApp messages and support requests.</li>
        <li>Account details, including your password (stored only as a one-way hash, never in readable form).</li>
      </ul>
      <h3>Order and payment information</h3>
      <ul>
        <li>Products, quantities and prices in your order, the order number, date, value and status.</li>
        <li>Delivery and tracking information for your parcels.</li>
        <li>
          The payment method you choose, the amount paid, the payment status, and the payment or order reference
          returned by our payment gateway.
        </li>
      </ul>
      <p>
        Please note that we do <strong>not</strong> receive or store your full card number, CVV, UPI PIN, net-banking
        password or OTP. Those are entered on our payment gateway&rsquo;s own secure interface. Never share them with
        anyone who contacts you claiming to be from Woven Essence.
      </p>
      <h3>Technical information</h3>
      <ul>
        <li>Browser, device type and the pages you view on the site.</li>
        <li>IP address and basic security logs used to operate and protect the website.</li>
        <li>Cookies and session identifiers needed to keep you logged in and keep your shopping bag (see section 7).</li>
      </ul>

      <h2>3. Why we use your information</h2>
      <ul>
        <li>To create and manage your account and keep your addresses and order history available to you.</li>
        <li>To process your order, confirm payment, pack and dispatch the parcel, and arrange delivery.</li>
        <li>To send transactional updates about your order by email and WhatsApp — confirmation, dispatch, delivery and, where relevant, returns or refunds.</li>
        <li>To answer your enquiries and provide customer support.</li>
        <li>To handle returns, exchanges, cancellations and refunds under our published policies.</li>
        <li>To detect and prevent fraudulent or abusive activity, and to keep the website secure.</li>
        <li>To maintain the accounting, tax and order records we are required to keep by law.</li>
        <li>To understand how the site is used so we can fix problems and improve it.</li>
      </ul>
      <p>
        We do not send marketing or promotional messages without a clear basis for doing so. If we do send them, every
        message includes a way to stop receiving them, and you can also ask us to stop at any time using the contact
        details in section 12.
      </p>

      <h2>4. Payment gateway and third-party providers</h2>
      <p>
        {onlinePayments
          ? "Online payments on this website are processed by Razorpay, our payment gateway partner. When you pay online you are taken to, or interact with, Razorpay's payment interface, and your payment details are handled by Razorpay under its own terms and privacy policy. We receive only the information needed to confirm and reconcile the order: the amount, the payment status, the method selected and the transaction or order reference."
          : "Payments on this website are currently collected through the payment methods offered at checkout. We receive only the information needed to confirm and reconcile the order: the amount, the payment status and the transaction reference."}{" "}
        We do not store card, UPI or net-banking credentials.
      </p>
      <p>We also share the minimum necessary information with the other providers that help us run the store:</p>
      <ul>
        <li>
          <strong>Courier and logistics partners</strong> — your name, delivery address, mobile number, order contents
          and the payment mode (for cash on delivery) so the parcel can be shipped, tracked and, where needed, returned.
        </li>
        <li>
          <strong>Messaging providers</strong> — your mobile number, used by the WhatsApp Business service to deliver
          order updates and, if you choose to log in with a WhatsApp code, your one-time login code.
        </li>
        <li>
          <strong>Email and hosting providers</strong> — the infrastructure that serves the website and delivers order
          emails.
        </li>
        <li>
          <strong>Our own business systems</strong> — the retail and inventory system used to keep stock and prices
          accurate and to process your order.
        </li>
      </ul>
      <p>
        We do not sell your personal information, and we do not share it for anyone else&rsquo;s advertising. We may
        disclose information where we are legally required to, or where it is necessary to establish, exercise or
        defend a legal claim.
      </p>

      <h2>5. Data storage and security</h2>
      <p>
        The website is served over HTTPS, and access to customer and order data is limited to the people and systems
        that need it to fulfil your order or support you. Account passwords are stored as hashes, administrative access
        to the store is authenticated and role-based, and our servers and databases are protected by access controls
        and network restrictions. Order and payment records are retained for accounting and dispute resolution.
      </p>
      <p>
        No website can guarantee absolute security. If we ever become aware of a security incident affecting your
        information, we will take steps to contain it and inform affected customers and, where required, the
        authorities.
      </p>

      <h2>6. How long we keep information</h2>
      <p>
        We keep personal information only for as long as it is needed for the purpose it was collected for — fulfilling
        your order, supporting you afterwards, maintaining accounting and tax records, resolving disputes and meeting
        legal obligations. Order and payment records are generally kept for the period required by Indian tax and
        accounting rules. When information is no longer needed we delete it or remove the details that identify you.
      </p>

      <h2>7. Cookies and similar technologies</h2>
      <p>
        Cookies are small text files a website stores in your browser. We use them for things the store cannot work
        without:
      </p>
      <ul>
        <li>Keeping you logged in to your account between pages.</li>
        <li>Remembering your shopping bag and checkout details during a visit.</li>
        <li>Remembering preferences such as your selected store or recently viewed items.</li>
        <li>Protecting forms and checkout from abuse.</li>
      </ul>
      <p>
        This website does not currently run third-party advertising networks, advertising pixels or third-party
        analytics trackers. If that changes, this policy will be updated before such tools are used.
      </p>
      <p>
        You can block or delete cookies in your browser settings. Blocking the essential cookies will stop login, the
        shopping bag and checkout from working correctly.
      </p>

      <h2>8. Your rights and choices</h2>
      <p>You can ask us to:</p>
      <ul>
        <li>Tell you what personal information we hold about you and why.</li>
        <li>Correct information that is inaccurate or out of date.</li>
        <li>Help you access, update or close your account.</li>
        <li>Delete information where we are not required to keep it.</li>
        <li>Stop sending you optional marketing messages.</li>
        <li>Answer any question or complaint about how we handle your information.</li>
      </ul>
      <p>
        Write to <a href={`mailto:${info.email}`}>{info.email}</a> or call{" "}
        <a href={`tel:${e164(info.phone)}`}>{info.phone}</a> with the request and the mobile number or email used on
        your account. We may ask you to verify your identity before acting. Some records — for example invoices and
        completed order records — must be retained for legal, tax or dispute-resolution reasons even after an account is
        closed.
      </p>

      <h2>9. Children&rsquo;s privacy</h2>
      <p>
        This website is intended for adults shopping for themselves or their family. We do not knowingly collect
        personal information from children, and orders should be placed by a person aged 18 or over, or under the
        supervision of a parent or guardian. If you believe a child has given us personal information, contact us and we
        will remove it.
      </p>

      <h2>10. Links to other websites</h2>
      <p>
        The site may link to third-party pages, such as our social media profiles or a courier&rsquo;s tracking page.
        Those sites are governed by their own privacy policies, and we are not responsible for how they handle your
        information.
      </p>

      <h2>11. Changes to this policy</h2>
      <p>
        We may update this policy when our services, the tools we use or the law change. The current version is always
        published on this page with its last-updated date, and it applies from the moment it is published. Please review
        it before placing a new order.
      </p>

      <h2>12. Privacy contact</h2>
      <p>
        <strong>Woven Essence Customer Support</strong>
        <br />
        Phone: <a href={`tel:${e164(info.phone)}`}>{info.phone}</a>
        <br />
        WhatsApp:{" "}
        <a href={whatsAppHref(info.phone)} target="_blank" rel="noreferrer">
          Chat with us on WhatsApp
        </a>
        <br />
        Email: <a href={`mailto:${info.email}`}>{info.email}</a>
        <br />
        Address: {info.address}
        <br />
        Hours: {info.hours}
        <br />
        Website: https://wovenessence.in/
      </p>
      <p>
        You can also use our <Link href="/contact-us">contact page</Link>. We aim to acknowledge privacy requests within
        a few business days and to resolve them promptly.
      </p>
    </LegalPage>
  );
}
