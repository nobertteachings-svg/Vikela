import type { Metadata } from "next";
import { LandingPage } from "@/components/marketing/landing-page";

export const metadata: Metadata = {
  title: "Audit-ready in weeks, not months",
  description:
    "Multi-framework compliance automation for startups and scale-ups: connect your stack, see gaps across SOC 2, ISO 27001, HIPAA, GDPR, PCI DSS and more, answer security questionnaires, and ship audits without a sales call.",
};

export default function MarketingHomePage() {
  return <LandingPage />;
}
