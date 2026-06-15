"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, X } from "lucide-react";
import { apiPost, API_URL } from "@/lib/api";

export function ConnectAwsDialog({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [roleArn, setRoleArn] = useState("");
  const [externalId, setExternalId] = useState("");
  const [accountName, setAccountName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function connect() {
    setLoading(true);
    setError(null);
    try {
      await apiPost("/api/v1/integrations/aws/connect", {
        roleArn,
        externalId: externalId || undefined,
        accountName: accountName || undefined,
        scheduleDailyScan: true,
      });
      onSuccess();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connection failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <Card className="w-full max-w-lg">
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Connect AWS Account</h2>
            <button onClick={onClose} className="text-muted hover:text-zinc-200">
              <X className="h-5 w-5" />
            </button>
          </div>

          <p className="mb-4 text-sm text-muted">
            Vikela uses cross-account <strong>AssumeRole</strong> only — we never store your AWS access keys.
          </p>

          <ol className="mb-4 list-decimal space-y-2 pl-5 text-sm text-zinc-300">
            <li>Deploy the CloudFormation stack (creates VikelaScanner role)</li>
            <li>Copy the Role ARN from stack outputs</li>
            <li>Paste below and connect</li>
          </ol>

          <a
            href={`${API_URL}/api/v1/aws/cloudformation-template`}
            className="mb-4 inline-flex items-center gap-2 text-sm text-emerald-500 hover:underline"
          >
            <Download className="h-4 w-4" />
            Download CloudFormation template
          </a>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted">Role ARN *</label>
              <input
                value={roleArn}
                onChange={(e) => setRoleArn(e.target.value)}
                placeholder="arn:aws:iam::123456789012:role/VikelaScanner"
                className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-muted">External ID (optional)</label>
              <input
                value={externalId}
                onChange={(e) => setExternalId(e.target.value)}
                placeholder="vikela-scanner"
                className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-muted">Display name</label>
              <input
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="Production AWS"
                className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
              />
            </div>
          </div>

          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={connect} disabled={!roleArn || loading}>
              {loading ? "Verifying…" : "Connect & scan daily"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
