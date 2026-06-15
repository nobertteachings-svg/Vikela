import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
  elevated,
}: {
  children: React.ReactNode;
  className?: string;
  elevated?: boolean;
}) {
  return (
    <div className={cn(elevated ? "comply-card-elevated" : "comply-card", className)}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  action,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("comply-card-header", className)}>
      <h2 className="text-sm font-semibold text-comply-text-primary">{title}</h2>
      {action}
    </div>
  );
}

export function CardBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("comply-card-body", className)}>{children}</div>;
}
