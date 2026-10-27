import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
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
    <div className="mx-auto max-w-site px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-semibold">Checkout</h1>
          <p className="mt-1 text-sm text-muted">Complete your order in a few simple steps</p>
        </div>
        <p className="flex items-center gap-2.5 text-xs">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><ShieldCheck className="h-5 w-5" /></span>
          <span><span className="block font-semibold text-olive">100% Secure Checkout</span><span className="text-muted">Your data is safe with us</span></span>
        </p>
      </div>
      <CheckoutForm
        customer={customer ? { name: customer.name, mobile: customer.mobile, email: customer.email, addresses: customer.addresses } : null}
        codEnabled={settings.commerce?.codEnabled ?? true}
        razorpayEnabled={settings.commerce?.razorpayEnabled === true}
        razorpayConfigured={razorpayConfigured}
      />
    </div>
  );
}
