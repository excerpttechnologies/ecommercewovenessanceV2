import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/auth";
import { safeNextPath } from "@/lib/utils";
import { AuthShell } from "@/components/account/auth-shell";
import { RegisterForm } from "@/components/account/customer-auth-forms";

export const metadata: Metadata = { title: "Create an account", robots: { index: false } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNextPath((await searchParams).next, "/account");
  if (await getCustomerSession()) redirect(next);
  const carry = next === "/account" ? "" : `?next=${encodeURIComponent(next)}`;
  return (
    <AuthShell
      title="Create your account"
      subtitle="It takes under a minute. Save favourites and track your orders."
      switchTo={{ prompt: "Already have an account?", label: "Sign in", href: `/login${carry}` }}
    >
      <RegisterForm next={next} />
    </AuthShell>
  );
}
