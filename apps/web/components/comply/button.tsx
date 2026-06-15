import { cn } from "@/lib/utils";

const variants = {
  primary: "comply-btn-primary",
  secondary: "comply-btn-secondary",
  ghost: "comply-btn-ghost",
  success: "comply-btn-success",
} as const;

export function ComplyButton({
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
      type="button"
      disabled={disabled}
      className={cn(variants[variant], disabled && "opacity-50 pointer-events-none", className)}
      {...props}
    >
      {children}
    </button>
  );
}
