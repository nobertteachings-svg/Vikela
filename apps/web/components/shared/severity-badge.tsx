import { Badge } from "@/components/ui/badge";
import type { Severity } from "@vikela/shared";

const variantMap: Record<Severity, "critical" | "high" | "medium" | "low" | "info"> = {
  CRITICAL: "critical",
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
  INFO: "info",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <Badge variant={variantMap[severity]}>{severity}</Badge>;
}
