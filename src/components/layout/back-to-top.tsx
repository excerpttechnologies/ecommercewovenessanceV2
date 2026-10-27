"use client";
import { ArrowUp } from "lucide-react";

export function BackToTop() {
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })}
      aria-label="Back to top"
      className="group flex h-10 w-10 items-center justify-center rounded-full border border-brass/50 text-[#e8c27a] transition-all hover:-translate-y-0.5 hover:border-maroon hover:bg-maroon hover:text-white"
    >
      <ArrowUp className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" />
    </button>
  );
}
