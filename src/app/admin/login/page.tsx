import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import { AdminLoginForm } from "@/components/admin/login-form";

export const metadata = { title: "Admin login", robots: { index: false } };

export default async function AdminLogin({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getAdminSession()) redirect(next?.startsWith("/admin") ? next : "/admin");
  return (
    <div className="flex min-h-screen items-center justify-center bg-ivory px-4">
      <div className="w-full max-w-sm rounded-sm border border-line bg-white p-8 shadow-sm">
        <p className="font-heading text-3xl text-olive">Woven Essence</p>
        <p className="mb-6 text-[10px] uppercase tracking-[0.25em] text-gold">Admin panel</p>
        <AdminLoginForm next={next?.startsWith("/admin") ? next : "/admin"} />
      </div>
    </div>
  );
}
