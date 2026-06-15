"use client";

import { useState } from "react";
import { apiPost } from "@/lib/api";

export function BillingStripeActions({
  stripeConfigured,
  currentPlan,
}: {
  stripeConfigured: boolean;
  currentPlan: string;
}) {
  const [loading, setLoading] = useState<string | null>(null);

  async function checkout(plan: "STARTER" | "GROWTH") {
    if (!stripeConfigured) {
      alert("Stripe is not configured. Set STRIPE_SECRET_KEY and price IDs.");
      return;
    }
    setLoading(plan);
    try {
      const { url } = await apiPost<{ url: string }>("/api/v1/billing/checkout", { plan });
      if (url) window.location.href = url;
    } catch (e) {
      alert(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setLoading(null);
    }
  }

  async function openPortal() {
    setLoading("portal");
    try {
      const { url } = await apiPost<{ url: string }>("/api/v1/billing/portal");
      if (url) window.location.href = url;
    } catch (e) {
      alert(e instanceof Error ? e.message : "Billing portal unavailable");
    } finally {
      setLoading(null);
    }
  }

  if (!stripeConfigured) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {currentPlan !== "STARTER" && (
        <button
          type="button"
          disabled={loading !== null}
          onClick={() => checkout("STARTER")}
          className="comply-btn-secondary text-sm"
        >
          {loading === "STARTER" ? "Loading…" : "Upgrade to Starter"}
        </button>
      )}
      {currentPlan !== "GROWTH" && (
        <button
          type="button"
          disabled={loading !== null}
          onClick={() => checkout("GROWTH")}
          className="comply-btn-primary text-sm"
        >
          {loading === "GROWTH" ? "Loading…" : "Upgrade to Growth"}
        </button>
      )}
      <button
        type="button"
        disabled={loading !== null}
        onClick={openPortal}
        className="comply-btn-secondary text-sm"
      >
        {loading === "portal" ? "Loading…" : "Manage subscription"}
      </button>
    </div>
  );
}
