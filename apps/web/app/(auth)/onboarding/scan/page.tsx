import { Suspense } from "react";
import OnboardingScan from "@/components/onboarding/onboarding-scan";

export default function OnboardingScanPage() {
  return (
    <Suspense
      fallback={
        <p className="py-12 text-center text-sm text-comply-text-secondary">Loading scan…</p>
      }
    >
      <OnboardingScan />
    </Suspense>
  );
}
