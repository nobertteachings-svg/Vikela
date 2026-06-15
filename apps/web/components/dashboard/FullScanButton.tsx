"use client";

import { useState } from "react";
import { IconScan } from "@tabler/icons-react";
import { ComplyButton } from "@/components/comply/button";
import { API_URL, orgHeaders } from "@/lib/api";
import { useOrgRole } from "@/hooks/use-org-role";

export function FullScanButton() {
  const { isAuditor: auditor, isLoaded } = useOrgRole();
  const [loading, setLoading] = useState(false);

  if (isLoaded && auditor) return null;

  async function runFullScan() {
    setLoading(true);
    try {
      const headers = await orgHeaders();
      const res = await fetch(`${API_URL}/api/v1/scans/full`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ async: true }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      alert("Full compliance scan queued (code + cloud + identity). Refresh in a few minutes.");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Scan failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ComplyButton variant="secondary" onClick={runFullScan} disabled={loading} className="text-sm">
      <IconScan size={18} />
      {loading ? "Queuing…" : "Run full scan"}
    </ComplyButton>
  );
}
