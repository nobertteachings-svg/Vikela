import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export const metadata: Metadata = {
  title: {
    default: "Vikela. Audit-ready in weeks, not months",
    template: "%s · Vikela",
  },
  description:
    "Multi-framework compliance for startups and scale-ups. Connect your stack, map gaps across SOC 2, ISO, HIPAA, GDPR, PCI DSS and more, and close the deal stuck on a security questionnaire. Self-serve, transparent pricing, free to start.",
  openGraph: {
    title: "Vikela. Get audit-ready in weeks, not months",
    description:
      "One compliance program for every framework your customers ask for. Self-serve. Transparent pricing. Free to start.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const body = (
    <html
      lang="en"
      className={`dark ${sans.variable} ${mono.variable}`}
    >
      <body className="font-sans antialiased">{children}</body>
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
