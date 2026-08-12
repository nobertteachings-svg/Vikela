"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiPost } from "@/lib/api";

export function ConnectNewRelicDialog({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [userApiKey, setUserApiKey] = useState("");
  const [accountId, setAccountId] = useState("");
  const [region, setRegion] = useState("US");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function connect() {
    if (!userApiKey.trim()) {
      setError("User API key required");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiPost("/api/v1/integrations/newrelic/connect", {
        userApiKey: userApiKey.trim(),
        accountId: accountId.trim() || undefined,
        region,
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
        <h2 className="text-lg font-semibold">Connect New Relic</h2>
        <p className="mt-2 text-sm text-muted">
          In New Relic: click your user menu → API keys → Create a key → type{" "}
          <span className="font-medium">User</span> (starts with NRAK-). Account ID is optional if
          the key can see only one account. Match region to your New Relic URL (one.newrelic.com =
          US, one.eu.newrelic.com = EU).
        </p>
        <label className="mt-4 block text-sm font-medium">User API key</label>
        <input
          type="password"
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
          value={userApiKey}
          onChange={(e) => setUserApiKey(e.target.value)}
          placeholder="NRAK-…"
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
          placeholder="Defaults to first account on the key"
        />
        <label className="mt-4 block text-sm font-medium">Region</label>
        <select
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
        >
          <option value="US">US (one.newrelic.com)</option>
          <option value="EU">EU (one.eu.newrelic.com)</option>
        </select>
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
