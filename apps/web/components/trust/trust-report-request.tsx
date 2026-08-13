"use client";

import { useState } from "react";
import { ComplyButton } from "@/components/comply/button";

export function TrustReportRequest({ orgSlug }: { orgSlug: string }) {
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setStatus("error");
      setMessage("Enter a valid work email.");
      return;
    }
    setStatus("loading");
    setMessage(null);
    try {
      const res = await fetch(`/api/v1/public/trust/${encodeURIComponent(orgSlug)}/report-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmed,
          company: company.trim() || undefined,
          website: honeypot,
        }),
      });
      const json = (await res.json()) as {
        data?: { message?: string };
        error?: string;
      };
      if (!res.ok || json.error) {
        setStatus("error");
        setMessage(json.error ?? "Request failed. Try again.");
        return;
      }
      setStatus("sent");
      setMessage(json.data?.message ?? `Request received for ${trimmed}.`);
      setEmail("");
      setCompany("");
    } catch {
      setStatus("error");
      setMessage("Network error. Try again.");
    }
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="mt-4 flex flex-col gap-3">
      {/* Honeypot, leave empty */}
      <input
        type="text"
        name="website"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />
      <label className="block text-sm">
        <span className="text-comply-text-secondary">Work email</span>
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setStatus("idle");
            setMessage(null);
          }}
          placeholder="you@company.com"
          required
          className="comply-input mt-1.5"
        />
      </label>
      <label className="block text-sm">
        <span className="text-comply-text-secondary">Company (optional)</span>
        <input
          type="text"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="Acme Inc"
          className="comply-input mt-1.5"
        />
      </label>
      <div>
        <ComplyButton type="submit" variant="primary" className="text-sm" disabled={status === "loading"}>
          {status === "loading" ? "Sending…" : "Request access"}
        </ComplyButton>
      </div>
      {message ? (
        <p
          className={`text-xs ${status === "error" ? "text-comply-red" : "text-comply-green"}`}
          role="status"
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
