import Link from "next/link";
import { IconAlertCircle } from "@tabler/icons-react";
import { Card, CardBody } from "./card";
import { ComplyButton } from "./button";

function RecoverySteps() {
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    return (
      <ol className="mt-4 list-decimal list-inside space-y-1.5 text-sm text-comply-text-secondary">
        <li>
          Open the <strong>Web</strong> Railway URL in your browser (not the API URL).
        </li>
        <li>
          On the <strong>Web</strong> service, set{" "}
          <code className="rounded bg-comply-primary px-1.5 py-0.5 font-mono text-xs">
            NEXT_PUBLIC_API_URL=https://your-api.up.railway.app
          </code>{" "}
          (no <code className="font-mono text-xs">/api/v1</code> suffix), then <strong>redeploy</strong>.
        </li>
        <li>
          On the <strong>API</strong> service, wire Postgres/Redis:{" "}
          <code className="rounded bg-comply-primary px-1.5 py-0.5 font-mono text-xs">
            DATABASE_URL=${"{{Postgres.DATABASE_URL}}"}
          </code>
          ,{" "}
          <code className="rounded bg-comply-primary px-1.5 py-0.5 font-mono text-xs">
            REDIS_URL=${"{{Redis.REDIS_URL}}"}
          </code>
          , plus <code className="font-mono text-xs">ENCRYPTION_KEY</code> and Clerk keys.
        </li>
        <li>
          Seed once (API → Shell):{" "}
          <code className="rounded bg-comply-primary px-1.5 py-0.5 font-mono text-xs">npm run db:seed</code>
        </li>
        <li>
          Verify API health:{" "}
          <code className="rounded bg-comply-primary px-1.5 py-0.5 font-mono text-xs">/health</code>
        </li>
      </ol>
    );
  }

  return (
    <ol className="mt-4 list-decimal list-inside space-y-1.5 text-sm text-comply-text-secondary">
      <li>
        Start Docker:{" "}
        <code className="rounded bg-comply-primary px-1.5 py-0.5 font-mono text-xs">
          docker compose up -d postgres redis
        </code>
      </li>
      <li>
        Migrate & seed:{" "}
        <code className="rounded bg-comply-primary px-1.5 py-0.5 font-mono text-xs">npm run db:setup</code>
      </li>
      <li>
        Restart <code className="rounded bg-comply-primary px-1.5 py-0.5 font-mono text-xs">npm run dev</code> — API
        on :3001
      </li>
    </ol>
  );
}

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
          <RecoverySteps />
          <div className="mt-4 flex flex-wrap gap-2">
            <ComplyButton
              variant="ghost"
              className="text-xs px-3 py-1.5"
              onClick={() => {
                if (typeof window !== "undefined") window.location.reload();
              }}
            >
              Retry
            </ComplyButton>
            <Link href="/dashboard" className="comply-btn-ghost text-xs px-3 py-1.5">
              Dashboard
            </Link>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
