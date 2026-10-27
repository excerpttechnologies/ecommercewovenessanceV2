import * as React from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "link" | "danger";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-maroon text-white hover:bg-gold shadow-sm",
  secondary: "bg-olive text-white hover:bg-olive/85",
  outline: "border border-line bg-white text-olive hover:border-maroon hover:text-maroon",
  ghost: "text-olive hover:bg-maroon/5 hover:text-maroon",
  link: "text-maroon underline-offset-4 hover:underline px-0",
  danger: "bg-red-700 text-white hover:bg-red-800",
};
const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-xs",
  md: "h-10 px-5 text-sm",
  lg: "h-12 px-7 text-[15px]",
  icon: "h-10 w-10 p-0",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", loading, disabled, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-[color,background-color,border-color,transform] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon/40 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  );
});

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-[color,background-color,border-color,transform] active:scale-[0.97]",
    variants[variant],
    sizes[size],
    className,
  );
}
