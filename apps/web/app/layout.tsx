import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-mono/400.css";
import "./globals.css";

const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export const metadata: Metadata = {
  title: {
    default: "Vikela — Audit-ready in weeks, not months",
    template: "%s · Vikela",
  },
  description:
    "Compliance automation for startups and scale-ups. Connect your stack, see SOC 2 / ISO 27001 / HIPAA gaps in minutes, and close the deal stuck on a security questionnaire. Self-serve, transparent pricing, free to start.",
  openGraph: {
    title: "Vikela — Get audit-ready in weeks, not months",
    description:
      "Compliance automation built for startup and scale-up teams. Self-serve. Transparent pricing. Free to start.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const body = (
    <html lang="en" className="dark">
      <body className="font-sans">{children}</body>
    </html>
  );

  if (!hasClerk) return body;
  return (
    <ClerkProvider
      signInForceRedirectUrl="/dashboard"
      signInFallbackRedirectUrl="/dashboard"
      signUpForceRedirectUrl="/onboarding/connect-repos"
      signUpFallbackRedirectUrl="/onboarding/connect-repos"
    >
      {body}
    </ClerkProvider>
  );
}
