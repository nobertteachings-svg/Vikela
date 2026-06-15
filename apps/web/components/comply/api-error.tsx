import Link from "next/link";
import { IconAlertCircle } from "@tabler/icons-react";
import { Card, CardBody } from "./card";
import { ComplyButton } from "./button";

export function ApiError({
  message,
  hint,
}: {
  message: string;
  hint?: string;
}) {
  return (
    <Card className="border-comply-red/30">
      <CardBody className="flex gap-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-comply-red/15 text-comply-red">
          <IconAlertCircle size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-comply-red">{message}</p>
          {hint && <p className="mt-1 text-sm text-comply-text-secondary">{hint}</p>}
          <ol className="mt-4 list-decimal list-inside space-y-1.5 text-sm text-comply-text-secondary">
            <li>
              Start Docker: <code className="rounded bg-comply-primary px-1.5 py-0.5 font-mono text-xs">docker compose up -d postgres redis</code>
            </li>
            <li>
              Migrate & seed: <code className="rounded bg-comply-primary px-1.5 py-0.5 font-mono text-xs">npm run db:setup</code>
            </li>
            <li>Restart <code className="rounded bg-comply-primary px-1.5 py-0.5 font-mono text-xs">npm run dev</code> — API on :3001</li>
          </ol>
          <Link href="/dashboard" className="mt-4 inline-block">
            <ComplyButton variant="ghost" className="text-xs px-3 py-1.5">
              Retry
            </ComplyButton>
          </Link>
        </div>
      </CardBody>
    </Card>
  );
}
