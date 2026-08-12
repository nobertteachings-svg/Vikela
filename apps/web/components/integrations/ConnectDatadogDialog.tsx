"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiPost } from "@/lib/api";

const SITES = [
  { value: "datadoghq.com", label: "US1 (datadoghq.com)" },
  { value: "us3.datadoghq.com", label: "US3 (us3.datadoghq.com)" },
  { value: "us5.datadoghq.com", label: "US5 (us5.datadoghq.com)" },
  { value: "datadoghq.eu", label: "EU (datadoghq.eu)" },
  { value: "ap1.datadoghq.com", label: "AP1 (ap1.datadoghq.com)" },
  { value: "ddog-gov.com", label: "US1-FED (ddog-gov.com)" },
];

export function ConnectDatadogDialog({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [apiKey, setApiKey] = useState("");
  const [appKey, setAppKey] = useState("");
  const [site, setSite] = useState("datadoghq.com");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function connect() {
    if (!apiKey.trim()) {
      setError("API key required");
      return;
    }
    if (!appKey.trim()) {
      setError("Application key required");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiPost("/api/v1/integrations/datadog/connect", {
        apiKey: apiKey.trim(),
        appKey: appKey.trim(),
        site,
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
        <h2 className="text-lg font-semibold">Connect Datadog</h2>
        <p className="mt-2 text-sm text-muted">
          In Datadog: Organization Settings → API Keys (create/copy API key) and Application Keys
          (create/copy Application key). Pick the site that matches your Datadog org URL.
        </p>
        <label className="mt-4 block text-sm font-medium">API key</label>
        <input
          type="password"
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          autoComplete="off"
        />
        <label className="mt-4 block text-sm font-medium">Application key</label>
        <input
          type="password"
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
          value={appKey}
          onChange={(e) => setAppKey(e.target.value)}
          autoComplete="off"
        />
        <label className="mt-4 block text-sm font-medium">Site</label>
        <select
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          value={site}
          onChange={(e) => setSite(e.target.value)}
        >
          {SITES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
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
