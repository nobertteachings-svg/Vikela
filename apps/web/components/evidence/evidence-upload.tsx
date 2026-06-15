"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ComplyButton } from "@/components/comply/button";
import {
  EvidenceControlPicker,
  type OrgControlOption,
} from "@/components/evidence/evidence-control-picker";
import { API_URL, orgHeaders } from "@/lib/api";
import { useOrgRole } from "@/hooks/use-org-role";

export function EvidenceUpload() {
  const { isAuditor: auditor, isLoaded } = useOrgRole();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedControl, setSelectedControl] = useState<OrgControlOption | null>(null);
  const router = useRouter();

  if (isLoaded && auditor) return null;

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const headers = await orgHeaders();
      const form = new FormData();
      form.append("file", file);
      form.append("title", file.name);
      form.append("type", "OTHER");
      if (selectedControl?.id) {
        form.append("controlId", selectedControl.id);
      }

      const res = await fetch(`${API_URL}/api/v1/evidence`, {
        method: "POST",
        headers: headers as HeadersInit,
        body: form,
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error ?? "Upload failed");
      }
      setSelectedControl(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-4">
      <EvidenceControlPicker value={selectedControl} onChange={setSelectedControl} />
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".pdf,.png,.jpg,.jpeg,.txt,.csv,.json"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleUpload(file);
          e.target.value = "";
        }}
      />
      <ComplyButton
        variant="primary"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? "Uploading…" : "Upload evidence"}
      </ComplyButton>
      {error && <p className="text-xs text-comply-red">{error}</p>}
    </div>
  );
}
