"use client";

import { IntegrationCard } from "./IntegrationCard";
import type { ProviderDefinition } from "@vikela/shared";

interface ProviderStatus extends ProviderDefinition {
  connected: boolean;
  resourceCount?: number;
  lastSyncedAt?: string;
  integrationId?: string;
}

export function IntegrationsGrid({
  title,
  providers,
  onConnect,
}: {
  title: string;
  providers: ProviderStatus[];
  onConnect?: (providerId: string) => void;
}) {
  if (!providers.length) return null;

  return (
    <section className="mb-8">
      <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted">
        {title}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {providers.map((p) => (
          <IntegrationCard key={p.id} provider={p} onConnect={onConnect} />
        ))}
      </div>
    </section>
  );
}
