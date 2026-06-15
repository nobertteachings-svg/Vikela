"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { oktaStartUrl } from "@/lib/integration-oauth";

export function ConnectOktaDialog({
  onClose,
  orgSlug: orgSlugProp,
}: {
  onClose: () => void;
  orgSlug?: string | null;
}) {
  const [domain, setDomain] = useState("");
  const { orgSlug: clerkOrgSlug } = useAuth();
  const orgSlug = orgSlugProp ?? clerkOrgSlug ?? null;

  function connect() {
    const d = domain.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!d) {
      alert("Enter your Okta domain (e.g. dev-123456.okta.com)");
      return;
    }
    window.location.href = oktaStartUrl(d, orgSlug);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl">
        <h2 className="text-lg font-semibold">Connect Okta</h2>
        <p className="mt-2 text-sm text-muted">
          OAuth to your Okta org. Requires OKTA_CLIENT_ID and OKTA_CLIENT_SECRET in API .env.
        </p>
        <label className="mt-4 block text-sm font-medium">Okta domain</label>
        <input
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          placeholder="dev-123456.okta.com"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
        />
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={connect}>Continue to Okta</Button>
        </div>
      </div>
    </div>
  );
}
