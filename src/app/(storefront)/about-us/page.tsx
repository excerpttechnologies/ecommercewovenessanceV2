import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { businessInfo, e164 } from "@/lib/business";
import { getSettings } from "@/lib/site-data";
import { LegalPage } from "@/components/content/legal-page";

export const metadata: Metadata = pageMetadata({
  title: "About Us",
  description:
    "Woven Essence is the online store of Temple Fabrics, Jayanagar, Bengaluru — handloom sarees, fabrics by the metre and dupattas, delivered across India.",
  path: "/about-us",
});

export default async function AboutUsPage() {
  const settings = await getSettings();
  const info = businessInfo(settings);
  const processingDays = Math.max(1, Math.round(settings.commerce?.processingDays ?? 2));
  const returnDays = Math.max(1, Math.round(settings.commerce?.returnWindowDays ?? 7));

  return (
    <LegalPage
      title="About Us"
      path="/about-us"
      showUpdated={false}
      intro="Woven Essence is the online store of Temple Fabrics, a saree and fabric shop in Jayanagar, Bengaluru."
    >
      <h2>Who we are</h2>
      <p>
        Woven Essence is the online store of Temple Fabrics, a saree and fabric shop in Jayanagar, Bengaluru. The
        website brings our counters to shoppers who cannot visit the store — handloom and silk sarees, fabrics by the
        metre, plain fabrics and dupattas, listed with the details our team checks in person.
      </p>

      <h2>What we offer</h2>
      <ul>
        <li>
          <strong>Sarees</strong> — Kanchipuram, Banarasi, Patola, Mysore silk, cotton and other handloom weaves for
          weddings, festivals and everyday wear.
        </li>
        <li>
          <strong>Fabrics</strong> — silk, Banarasi brocade, chanderi and cotton by the metre, for blouses, lehengas and
          custom outfits.
        </li>
        <li>
          <strong>Plain fabrics</strong> — solid-colour silks and cottons for blouses, linings and contrast pairings.
        </li>
        <li>
          <strong>Dupattas</strong> — silk, Banarasi, chanderi and organza pieces to finish a festive or wedding outfit.
        </li>
        <li>
          <strong>Other traditional pieces</strong> — dhotis, pavadas, saree borders, inskirts, unstitched suits and
          ready-made pieces, as available in store.
        </li>
      </ul>

      <h2>How we choose what we sell</h2>
      <p>
        Each piece is picked for its weave, its drape and its finish. We describe a product by its fabric, weave, craft,
        colour and care, using the details our team confirms in store — so what you read on a product page is what
        reaches you.
      </p>

      <h2>Quality, packing and delivery</h2>
      <p>
        Before dispatch, every order is checked, steamed and packed by hand at our studio. Orders leave us within{" "}
        {processingDays} business {processingDays === 1 ? "day" : "days"}, and we deliver to serviceable pincodes across
        India. You receive an email and a WhatsApp update with tracking once the parcel is on its way.
      </p>

      <h2>Our commitment to you</h2>
      <ul>
        <li>
          Honest product details: we list the fabric, weave and craft of a piece, and we do not make claims about a
          product that we cannot verify.
        </li>
        <li>
          A clear returns process: unused, unwashed pieces with their original tags and invoice can be returned within{" "}
          {returnDays} {returnDays === 1 ? "day" : "days"} of delivery. Read our{" "}
          <Link href="/return-policy">Return Policy</Link> and <Link href="/refund-policy">Refund Policy</Link>.
        </li>
        <li>
          Support you can reach: call <a href={`tel:${e164(info.phone)}`}>{info.phone}</a>, write to{" "}
          <a href={`mailto:${info.email}`}>{info.email}</a> or message us on WhatsApp, {info.hours}.
        </li>
      </ul>

      <h2>Visit us</h2>
      <p>{info.address}</p>
      <p>
        Store hours: {info.hours}. You can also <Link href="/contact-us">contact us</Link> online, or browse the{" "}
        <Link href="/collections">full collection</Link>.
      </p>
    </LegalPage>
  );
}
