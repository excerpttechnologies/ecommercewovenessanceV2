import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { WhatsAppFloat } from "@/components/layout/whatsapp-float";
import { getSettings } from "@/lib/site-data";

export const dynamic = "force-dynamic";

export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  const free = settings.commerce?.freeShippingAbove;
  return (
    <>
      <Header messages={[free ? `Free shipping on orders above ₹${free.toLocaleString("en-IN")}` : "Free shipping across India", "Handloom certified · Bangalore Urban store", settings.commerce?.codEnabled ? "Cash on delivery available" : "Secure payments"]} />
      <main className="min-h-[60vh]">{children}</main>
      <Footer />
      <WhatsAppFloat number={settings.whatsappNumber} />
    </>
  );
}
