"use client";

import { useState } from "react";
import { apiPost } from "@/lib/api";

type CheckoutPlan = "STARTER" | "GROWTH";

export function BillingStripeActions({
  stripeConfigured,
  currentPlan,
  hasStripeSubscription = false,
}: {
  stripeConfigured: boolean;
  currentPlan: string;
  hasStripeSubscription?: boolean;
}) {
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function checkout(plan: CheckoutPlan) {
    if (!stripeConfigured) {
      setMessage("Stripe is not configured. Set STRIPE_SECRET_KEY and price IDs.");
      return;
    }
    setLoading(plan);
    setMessage(null);
    try {
      const result = await apiPost<{ url: string; via?: string; message?: string }>(
        "/api/v1/billing/checkout",
        { plan }
      );
      if (result.url) {
        window.location.href = result.url;
        return;
      }
      setMessage(result.message ?? "No checkout URL returned");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setLoading(null);
    }
  }

  async function openPortal() {
    if (!stripeConfigured) {
      setMessage("Stripe is not configured.");
      return;
    }
    setLoading("portal");
    setMessage(null);
    try {
      const { url } = await apiPost<{ url: string }>("/api/v1/billing/portal", {});
      if (url) {
        window.location.href = url;
        return;
      }
      setMessage("No portal URL returned");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Billing portal unavailable");
    } finally {
      setLoading(null);
    }
  }

  if (!stripeConfigured) return null;

  const plan = currentPlan.toUpperCase();
  const showStarter = plan !== "STARTER" || !hasStripeSubscription;
  const showGrowth = plan !== "GROWTH" || !hasStripeSubscription;
  const starterLabel =
    plan === "STARTER" && !hasStripeSubscription
      ? "Activate Starter"
      : hasStripeSubscription
        ? "Switch to Starter"
        : "Upgrade to Starter";
  const growthLabel =
    plan === "GROWTH" && !hasStripeSubscription
      ? "Activate Growth"
      : hasStripeSubscription && plan === "STARTER"
        ? "Upgrade to Growth"
        : hasStripeSubscription
          ? "Switch to Growth"
          : "Upgrade to Growth";

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        {showStarter ? (
          <button
            type="button"
            disabled={loading !== null}
            onClick={() => void checkout("STARTER")}
            className="comply-btn-secondary text-sm"
          >
            {loading === "STARTER" ? "Loading…" : starterLabel}
          </button>
        ) : null}
        {showGrowth ? (
          <button
            type="button"
            disabled={loading !== null}
            onClick={() => void checkout("GROWTH")}
            className="comply-btn-primary text-sm"
          >
            {loading === "GROWTH" ? "Loading…" : growthLabel}
          </button>
        ) : null}
        <button
          type="button"
          disabled={loading !== null}
          onClick={() => void openPortal()}
          className="comply-btn-secondary text-sm"
        >
          {loading === "portal" ? "Loading…" : "Manage subscription"}
        </button>
      </div>
      {message ? (
        <p className="max-w-md text-right text-xs text-comply-amber" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}

/** Compact CTA for plan comparison cards. */
export function BillingPlanCheckoutButton({
  plan,
  label,
  stripeConfigured,
  disabled,
}: {
  plan: CheckoutPlan;
  label: string;
  stripeConfigured: boolean;
  disabled?: boolean;
}) {
  const [loading, setLoading] = useState(false);

  async function onClick() {
    if (!stripeConfigured || disabled) return;
    setLoading(true);
    try {
      const result = await apiPost<{ url: string }>("/api/v1/billing/checkout", { plan });
      if (result.url) window.location.href = result.url;
    } catch (e) {
      alert(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setLoading(false);
    }
  }

  if (!stripeConfigured) return null;

  return (
    <button
      type="button"
      disabled={disabled || loading}
      onClick={() => void onClick()}
      className="comply-btn-primary mt-5 h-9 w-full text-xs"
    >
      {loading ? "Loading…" : label}
    </button>
  );
}

type PortalFlow = "portal" | "payment_method_update";

/** Opens Stripe Customer Portal (optionally deep-linked to payment method update). */
export function BillingPortalButton({
  stripeConfigured,
  flow = "portal",
  label,
  className = "comply-btn-secondary text-sm",
}: {
  stripeConfigured: boolean;
  flow?: PortalFlow;
  label: string;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function openPortal() {
    if (!stripeConfigured) {
      setMessage("Stripe is not configured.");
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const body = flow === "portal" ? {} : { flow };
      const { url } = await apiPost<{ url: string }>("/api/v1/billing/portal", body);
      if (url) {
        window.location.href = url;
        return;
      }
      setMessage("No portal URL returned");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Billing portal unavailable");
    } finally {
      setLoading(false);
    }
  }

  if (!stripeConfigured) return null;

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={loading}
        onClick={() => void openPortal()}
        className={className}
      >
        {loading ? "Loading…" : label}
      </button>
      {message ? (
        <p className="text-xs text-comply-amber" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
