import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-md border border-line bg-white px-3 text-sm text-ink placeholder:text-muted focus:border-maroon focus:outline-none focus:ring-2 focus:ring-maroon/15 disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
});

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn("min-h-[100px] w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-maroon focus:outline-none focus:ring-2 focus:ring-maroon/15", className)}
      {...props}
    />
  );
});

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn("h-10 w-full rounded-md border border-line bg-white px-3 text-sm text-ink focus:border-maroon focus:outline-none focus:ring-2 focus:ring-maroon/15", className)}
      {...props}
    />
  );
});

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1.5 block text-xs font-semibold text-ink/80", className)} {...props} />;
}

export function Field({ label, children, hint, error }: { label: string; children: React.ReactNode; hint?: string; error?: string }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
      {error ? <p className="mt-1 text-xs text-red-700">{error}</p> : hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
