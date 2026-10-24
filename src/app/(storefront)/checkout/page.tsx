import type { Metadata } from "next";
import { getCustomerSession } from "@/lib/auth";
import { getSettings } from "@/lib/site-data";
import { getCustomers } from "@/repositories";
import { CheckoutForm } from "@/components/cart/checkout-form";
import { isRazorpayConfigured } from "@/lib/payments";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  const [session, settings] = await Promise.all([getCustomerSession(), getSettings()]);
  const customer = session ? await getCustomers().getById(session.sub) : null;
  const razorpayConfigured = isRazorpayConfigured();
  return (
    <div className="mx-auto max-w-site px-4 py-8 sm:px-6">
      <h1 className="we-rule text-4xl">Checkout</h1>
      <CheckoutForm
        customer={customer ? { name: customer.name, mobile: customer.mobile, email: customer.email, addresses: customer.addresses } : null}
        codEnabled={settings.commerce?.codEnabled ?? true}
        razorpayEnabled={settings.commerce?.razorpayEnabled === true}
        razorpayConfigured={razorpayConfigured}
      />
    </div>
  );
}
