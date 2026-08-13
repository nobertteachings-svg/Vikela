"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export function ConnectAuth0Dialog({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { orgId, isLoaded } = useAuth();
  const [domain, setDomain] = useState("dev-vp6l00tedl0kugrw.us.auth0.com");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function connect() {
    const d = domain.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!d) {
      setError("Enter your Auth0 domain (e.g. your-tenant.us.auth0.com)");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (!isLoaded) {
        throw new Error("Session still loading, wait a moment and try again.");
      }
      if (!orgId) {
        throw new Error(
          "No workspace selected, use the org switcher (top bar) to select Optic Inc, then try again."
        );
      }

      // Same-origin proxy (server Clerk session), avoids flaky cross-origin Bearer to :3001.
      const res = await fetch("/api/integrations/auth0/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ domain: d }),
      });
      const text = await res.text();
      let json: { data?: unknown; error?: string };
      try {
        json = JSON.parse(text) as { data?: unknown; error?: string };
      } catch {
        throw new Error(res.ok ? "Invalid API response" : `API ${res.status}: ${text.slice(0, 160)}`);
      }
      if (!res.ok || json.error) {
        throw new Error(json.error ?? `Auth0 connect failed (${res.status})`);
      }

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
        <h2 className="text-lg font-semibold">Connect Auth0</h2>
        <p className="mt-2 text-sm text-muted">
          Uses an Auth0 Machine-to-Machine app (Management API, <code>read:users</code>). Set{" "}
          <code>AUTH0_MANAGEMENT_CLIENT_ID</code> / <code>AUTH0_MANAGEMENT_CLIENT_SECRET</code> on
          the API.
        </p>
        <label className="mt-4 block text-sm font-medium">Auth0 domain</label>
        <input
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          placeholder="your-tenant.us.auth0.com"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
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
