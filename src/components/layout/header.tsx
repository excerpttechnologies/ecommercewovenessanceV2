import { Logo } from "@/components/Logo";
import { getMenu, getSettings, getStores } from "@/lib/site-data";
import { HeaderClient } from "./header-client";

/** Server shell: loads menu/settings/stores once per request and hands them to the client header. */
export async function Header() {
  const [settings, menu, stores] = await Promise.all([getSettings(), getMenu(), getStores().catch(() => [])]);
  return (
    <HeaderClient
      menu={menu}
      stores={stores.map((s) => ({ id: s.id, name: s.name, city: s.city }))}
      currencies={settings.supportedCurrencies ?? ["INR"]}
      tagline={settings.tagline ?? ""}
      logo={<Logo settings={settings} height={48} className="inline-block origin-left scale-[1.3] lg:scale-[1.6]" />}
      whatsapp={settings.whatsappNumber ?? ""}
    />
  );
}
