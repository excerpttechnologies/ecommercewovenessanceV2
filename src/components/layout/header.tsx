
// import { Logo } from "@/components/Logo";
// import { getMenu, getSettings, getStores } from "@/lib/site-data";
// import { Suspense } from "react";
// import { HeaderClient } from "./header-client";

// /** Server shell: loads menu/settings/stores once per request and hands them to the client header. */
// export async function Header({ messages = [] }: { messages?: string[] }) {
//   const [settings, menu, stores] = await Promise.all([getSettings(), getMenu(), getStores().catch(() => [])]);
//   return (
//     <Suspense>
//     <HeaderClient
//       menu={menu}
//       messages={messages}
//       stores={stores.map((s) => ({ id: s.id, name: s.name, city: s.city }))}
//       currencies={settings.supportedCurrencies ?? ["INR"]}
//       tagline={settings.tagline ?? ""}
//       logo={<Logo settings={settings} height={72} className="block ml-3 sm:ml-6" />}
//       whatsapp={settings.whatsappNumber ?? ""}
//     />
//     </Suspense>
//   );
// }


import { Logo } from "@/components/Logo";
import { businessInfo } from "@/lib/business";
import { getMenu, getSettings } from "@/lib/site-data";
import { Suspense } from "react";
import { HeaderClient } from "./header-client";

/**
 * Server shell:
 * Loads menu, settings and the physical store details once per request
 * and passes the required data to the client header.
 */
export async function Header({
  messages = [],
}: {
  messages?: string[];
}) {
  const [settings, menu] = await Promise.all([
    getSettings(),
    getMenu(),
  ]);
  const { address, phone, hours } = businessInfo(settings);

  return (
    <Suspense>
      <HeaderClient
        menu={menu}
        messages={messages}
        store={{ address, phone, hours }}
        tagline={settings.tagline ?? ""}
        logo={
          <Logo
            settings={settings}
            height={72}
            className="block ml-3 sm:ml-6"
          />
        }
        whatsapp={settings.whatsappNumber ?? ""}
      />
    </Suspense>
  );
}
