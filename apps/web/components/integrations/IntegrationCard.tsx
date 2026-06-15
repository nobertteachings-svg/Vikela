"use client";

import { CheckCircle2, Circle, Link2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProviderBadge } from "./ProviderBadge";
import type { ProviderDefinition } from "@vikela/shared";

export interface IntegrationCardProps {
  provider: ProviderDefinition & {
    connected: boolean;
    resourceCount?: number;
    lastSyncedAt?: string;
    integrationId?: string;
  };
  onConnect?: (providerId: string) => void;
}

export function IntegrationCard({ provider, onConnect }: IntegrationCardProps) {
  return (
    <Card className="transition-colors hover:border-zinc-700">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <ProviderBadge name={provider.name} brandColor={provider.brandColor} />
            <p className="mt-2 text-xs text-muted line-clamp-2">{provider.description}</p>
            {provider.connected ? (
              <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-500">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Connected
                {provider.resourceCount != null && provider.resourceCount > 0 && (
                  <span className="text-muted">
                    · {provider.resourceCount} {provider.category === "GIT" ? "repos" : provider.category === "CLOUD" ? "accounts" : "resources"}
                  </span>
                )}
              </div>
            ) : (
              <div className="mt-3 flex items-center gap-1.5 text-xs text-zinc-500">
                <Circle className="h-3.5 w-3.5" />
                Not connected
              </div>
            )}
          </div>
        </div>
        {!provider.connected && (
          <Button
            variant="outline"
            size="sm"
            className="mt-4 w-full gap-2"
            onClick={() => onConnect?.(provider.id)}
          >
            <Link2 className="h-3.5 w-3.5" />
            Connect
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
