import { cn } from "@/lib/utils";

export function DataTable({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("comply-table-wrap", className)}>
      <table className="comply-table">{children}</table>
    </div>
  );
}
