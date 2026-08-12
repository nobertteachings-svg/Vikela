import { cn } from "@/lib/utils";

const variants = {
  primary: "vikela-btn-primary",
  secondary: "vikela-btn-secondary",
  ghost: "vikela-btn-ghost",
  success: "vikela-btn-success",
} as const;

export function VikelaButton({
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

/** @deprecated Use VikelaButton */
export const ComplyButton = VikelaButton;
