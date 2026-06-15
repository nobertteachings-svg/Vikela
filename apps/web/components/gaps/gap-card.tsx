import Link from "next/link";
import { FileCode } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SeverityBadge } from "@/components/shared/severity-badge";
import type { GapSummary } from "@vikela/shared";

export function GapCard({ gap }: { gap: GapSummary }) {
  return (
    <Card className="transition-colors hover:border-zinc-700">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <SeverityBadge severity={gap.severity} />
              <span className="text-xs text-zinc-500">{gap.source}</span>
              {gap.controlCode && (
                <span className="font-mono text-xs text-emerald-500">{gap.controlCode}</span>
              )}
              {gap.cloudProvider && (
                <span className="text-xs text-amber-500">{gap.cloudProvider}</span>
              )}
            </div>
            <h4 className="mt-2 font-medium text-zinc-100">{gap.title}</h4>
            {gap.filePath && (
              <p className="mt-1 flex items-center gap-1 font-mono text-xs text-zinc-500">
                <FileCode className="h-3 w-3" />
                {gap.filePath}
                {gap.lineNumber != null && `:${gap.lineNumber}`}
              </p>
            )}
          </div>
          <Link
            href={`/gaps/${gap.id}`}
            className="shrink-0 text-xs text-emerald-500 hover:text-emerald-400"
          >
            View →
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
