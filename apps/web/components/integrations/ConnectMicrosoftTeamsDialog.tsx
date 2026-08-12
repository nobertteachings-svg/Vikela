"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiPost } from "@/lib/api";

export function ConnectMicrosoftTeamsDialog({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function connect() {
    if (!webhookUrl.trim()) {
      setError("Webhook URL required");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiPost("/api/v1/integrations/microsoft-teams/connect", {
        webhookUrl: webhookUrl.trim(),
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
        <h2 className="text-lg font-semibold">Connect Microsoft Teams</h2>
        <p className="mt-2 text-sm text-muted">
          In Teams: open a channel → ⋯ → Connectors / Manage channel → Workflows → create an{" "}
          <span className="font-medium">Incoming Webhook</span> (or “Post to a channel when a
          webhook request is received”). Copy the URL and paste it here. A short test message will
          be posted on connect.
        </p>
        <label className="mt-4 block text-sm font-medium">Incoming Webhook URL</label>
        <input
          type="url"
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
          placeholder="https://….webhook.office.com/webhookb2/…"
          autoComplete="off"
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
