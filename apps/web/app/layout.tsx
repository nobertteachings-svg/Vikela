import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-mono/400.css";
import "./globals.css";

const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export const metadata: Metadata = {
  title: "Shieldoq: Universal Compliance Engine",
  description:
    "Map code, cloud, and identity findings to SOC 2, HIPAA, ISO 27001, GDPR, PCI DSS, FedRAMP, CMMC, and more. One platform for your entire compliance program.",
  metadataBase: new URL(process.env.APP_URL ?? "https://www.shieldoq.com"),
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/brand/shieldoq-icon.png", sizes: "1024x1024", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/favicon-32.png"],
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
