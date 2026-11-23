import Link from "next/link";
import { buttonClass } from "./button";

export function Empty({
  title,
  text,
  href,
  cta,
  icon,
}: {
  title: string;
  text?: string;
  href?: string;
  cta?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-dashed border-line px-6 py-16 text-center">
      {icon && (
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-maroon/5 text-maroon" aria-hidden="true">
          {icon}
        </div>
      )}
      <h3 className="text-2xl">{title}</h3>
      {text && <p className="mt-2 text-sm text-muted">{text}</p>}
      {href && (
        <Link href={href} className={buttonClass("outline", "md", "mt-6")}>
          {cta ?? "Continue shopping"}
        </Link>
      )}
    </div>
  );
}
