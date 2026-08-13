import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { TrustCenterView } from "@/components/trust/trust-center-view";
import { getServerApiUrl } from "@/lib/api-url";

export const dynamic = "force-dynamic";

type Props = { params: { slug: string } };

type VisitorTrust = {
  name: string;
  slug: string;
  tagline?: string | null;
  updatedAt: string;
  frameworks: Array<{ id: string; name: string; slug?: string; score?: number }>;
  policies: Array<{ id: string; title: string }>;
  shareUrl: string;
};

async function loadVisitorTrust(slug: string): Promise<VisitorTrust | null> {
  const base = getServerApiUrl().replace(/\/+$/, "");
  try {
    const res = await fetch(`${base}/api/v1/public/trust/${encodeURIComponent(slug)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: VisitorTrust; error?: string };
    return json.data ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await loadVisitorTrust(params.slug);
  if (!data) {
    return { title: "Trust center", robots: { index: false, follow: false } };
  }
  return {
    title: `${data.name}. Trust center`,
    description: data.tagline?.trim() || `Security and compliance information for ${data.name}`,
    openGraph: {
      title: `${data.name}. Trust center`,
      description: data.tagline?.trim() || `Security and compliance information for ${data.name}`,
    },
  };
}

export default async function VisitorTrustPage({ params }: Props) {
  const data = await loadVisitorTrust(params.slug);

  if (!data) {
    return (
      <MarketingShell className="px-6 py-16">
        <div className="comply-page mx-auto max-w-md text-center">
          <h1 className="text-2xl font-semibold text-comply-text-primary">Trust center unavailable</h1>
          <p className="mt-2 text-sm text-comply-text-secondary">
            This trust center is not published, or the link is incorrect.
          </p>
        </div>
      </MarketingShell>
    );
  }

  return (
    <MarketingShell className="px-6 py-10 sm:px-8 lg:py-12">
      <div className="mx-auto max-w-3xl">
        <TrustCenterView
          data={{
            name: data.name,
            slug: data.slug,
            tagline: data.tagline,
            updatedAt: data.updatedAt,
            frameworks: data.frameworks,
            policies: data.policies,
          }}
        />
      </div>
    </MarketingShell>
  );
}
