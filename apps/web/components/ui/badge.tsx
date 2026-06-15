import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-emerald-600/20 text-emerald-400",
        outline: "border-zinc-700 text-zinc-300",
        critical: "border-transparent bg-red-500/20 text-red-400",
        high: "border-transparent bg-orange-500/20 text-orange-400",
        medium: "border-transparent bg-amber-500/20 text-amber-400",
        low: "border-transparent bg-blue-500/20 text-blue-400",
        info: "border-transparent bg-zinc-500/20 text-zinc-400",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
