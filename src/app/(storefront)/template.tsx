/** Re-mounts on every storefront navigation, so each page fades in (see .we-page in globals.css). */
export default function StorefrontTemplate({ children }: { children: React.ReactNode }) {
  return <div className="we-page">{children}</div>;
}
