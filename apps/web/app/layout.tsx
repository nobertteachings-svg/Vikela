import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-mono/400.css";
import "./globals.css";

const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export const metadata: Metadata = {
  title: "Vikela — Universal Compliance Engine",
  description:
    "Map code, cloud, and identity findings to SOC 2, HIPAA, ISO 27001, GDPR, PCI DSS, FedRAMP, CMMC, and more—one platform for your entire compliance program.",
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
