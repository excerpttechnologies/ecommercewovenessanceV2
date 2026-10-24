import Link from "next/link";
import { buttonClass } from "./button";

export function Empty({ title, text, href, cta }: { title: string; text?: string; href?: string; cta?: string }) {
  return (
    <div className="rounded-md border border-dashed border-line px-6 py-16 text-center">
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
