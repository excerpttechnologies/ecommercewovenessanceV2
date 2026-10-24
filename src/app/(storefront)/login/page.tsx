import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/auth";
import { safeNextPath } from "@/lib/utils";
import { AuthShell } from "@/components/account/auth-shell";
import { LoginForm } from "@/components/account/customer-auth-forms";

export const metadata: Metadata = { title: "Log in", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNextPath((await searchParams).next, "/account");
  if (await getCustomerSession()) redirect(next);
  const carry = next === "/account" ? "" : `?next=${encodeURIComponent(next)}`;
  return (
    <AuthShell
      title="Log in to your account"
      subtitle="Welcome back! Please enter your details."
      switchTo={{ prompt: "New to Woven Essence?", label: "Create an account", href: `/register${carry}` }}
    >
      <LoginForm next={next} />
    </AuthShell>
  );
}
