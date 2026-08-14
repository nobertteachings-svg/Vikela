"use client";

import { cn } from "@/lib/utils";

const variants = {
  primary: "shieldoq-btn-primary",
  secondary: "shieldoq-btn-secondary",
  ghost: "shieldoq-btn-ghost",
  success: "shieldoq-btn-success",
} as const;

export function ShieldoqButton({
  children,
  variant = "primary",
  className,
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
}) {
  return (
    <button
      disabled={disabled}
      className={cn(variants[variant], disabled && "opacity-50 pointer-events-none", className)}
      {...props}
      type={props.type ?? "button"}
    >
      {children}
    </button>
  );
}

/** @deprecated Use ShieldoqButton */
export const ComplyButton = ShieldoqButton;
