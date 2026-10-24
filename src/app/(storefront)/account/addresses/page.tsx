import { getCustomerSession } from "@/lib/auth";
import { getCustomers } from "@/repositories";
import { AddressBook } from "@/components/account/address-book";

export const metadata = { title: "Addresses", robots: { index: false } };

export default async function AddressesPage() {
  const s = (await getCustomerSession())!;
  const c = await getCustomers().getById(s.sub);
  return <AddressBook initial={c?.addresses ?? []} />;
}
