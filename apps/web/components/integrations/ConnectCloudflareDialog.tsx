"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiPost } from "@/lib/api";

export function ConnectCloudflareDialog({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [apiToken, setApiToken] = useState("");
  const [accountId, setAccountId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function connect() {
    if (!apiToken.trim()) {
      setError("API token required");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiPost("/api/v1/integrations/cloudflare/connect", {
        apiToken: apiToken.trim(),
        accountId: accountId.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connect failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl">
        <h2 className="text-lg font-semibold">Connect Cloudflare</h2>
        <p className="mt-2 text-sm text-muted">
          Create an API token in Cloudflare, My Profile, API Tokens. Include Account read, Zone
          read, SSL and Certificates read, and Access read (and WAF/Firewall read if available).
        </p>
        <label className="mt-4 block text-sm font-medium">API token</label>
        <input
          type="password"
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
          value={apiToken}
          onChange={(e) => setApiToken(e.target.value)}
          autoComplete="off"
        />
        <label className="mt-4 block text-sm font-medium">
          Account ID <span className="font-normal text-muted">(optional)</span>
        </label>
        <input
          type="text"
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          placeholder="Defaults to first account on the token"
        />
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={connect} disabled={loading}>
            {loading ? "Connecting…" : "Connect"}
          </Button>
        </div>
      </div>
    </div>
  );
}
