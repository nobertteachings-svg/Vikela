"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { IconCircleCheck, IconX } from "@tabler/icons-react";

export function BillingCheckoutBanner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const checkout = searchParams.get("checkout");
  const plan = searchParams.get("plan");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (checkout === "success" || checkout === "cancelled") {
      router.refresh();
    }
  }, [checkout, router]);

  function clearQuery() {
    setDismissed(true);
    router.replace(pathname, { scroll: false });
  }

  if (dismissed || !checkout) return null;

  if (checkout === "success") {
    return (
      <div
        className="flex items-start gap-3 rounded-lg border border-comply-green/40 bg-comply-green/10 px-4 py-3"
        role="status"
      >
        <IconCircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-comply-green" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-comply-green">Checkout complete</p>
          <p className="mt-1 text-sm text-comply-text-secondary">
            {plan
              ? `Thanks — your ${plan} subscription is being activated.`
              : "Thanks — your subscription is being activated."}{" "}
            Plan and invoices update once Stripe confirms (usually within a few seconds). Refresh if
            status still shows as complimentary.
          </p>
        </div>
        <button
          type="button"
          onClick={clearQuery}
          className="shrink-0 rounded p-1 text-comply-text-tertiary hover:text-comply-text-primary"
          aria-label="Dismiss"
        >
          <IconX size={16} />
        </button>
      </div>
    );
  }

  if (checkout === "cancelled") {
    return (
      <div
        className="flex items-start gap-3 rounded-lg border border-comply-amber/30 bg-comply-amber/10 px-4 py-3"
        role="status"
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-comply-amber-text">Checkout cancelled</p>
          <p className="mt-1 text-sm text-comply-text-secondary">
            No charge was made. You can start checkout again whenever you&apos;re ready.
          </p>
        </div>
        <button
          type="button"
          onClick={clearQuery}
          className="shrink-0 rounded p-1 text-comply-text-tertiary hover:text-comply-text-primary"
          aria-label="Dismiss"
        >
          <IconX size={16} />
        </button>
      </div>
    );
  }

  return null;
}
