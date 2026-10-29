import { permanentRedirect } from "next/navigation";

/** The menu's /new-arrivals link opens the New Arrivals collection (29-10-2026). */
export default function NewArrivalsPage() {
  permanentRedirect("/collections/new-arrivals");
}
