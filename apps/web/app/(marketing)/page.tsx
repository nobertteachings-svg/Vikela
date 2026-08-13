import type { Metadata } from "next";
import { LandingPage } from "@/components/marketing/landing-page";

/** Avoid stale static HTML when Railway serves a prior build. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Audit ready in weeks, not months",
  description:
    "Compliance for startups: connect your stack, see gaps across SOC 2, ISO 27001, HIPAA, GDPR, PCI DSS and more, answer security questionnaires, and ship audits without a sales call.",
};

export default function MarketingHomePage() {
  return <LandingPage />;
}
