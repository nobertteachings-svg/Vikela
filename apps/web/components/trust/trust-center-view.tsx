import { Card, CardBody, CardHeader } from "@/components/comply/card";
import { PageHeader } from "@/components/comply/page-header";
import { TrustReportRequest } from "@/components/trust/trust-report-request";

export type TrustCenterViewData = {
  name: string;
  slug: string;
  tagline?: string | null;
  updatedAt: string;
  frameworks: Array<{ id: string; name: string; score?: number }>;
  policies: Array<{ id: string; title: string }>;
};

/** Visitor-facing trust center (no admin chrome). */
export function TrustCenterView({ data }: { data: TrustCenterViewData }) {
  const updated = new Date(data.updatedAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="comply-page max-w-3xl space-y-6">
      <PageHeader
        eyebrow="Trust center"
        title={`${data.name}`}
        description={
          data.tagline?.trim()
            ? data.tagline
            : `Security and compliance posture · Updated ${updated}`
        }
      />

      <Card elevated>
        <CardHeader title="Compliance frameworks" />
        <CardBody>
          {data.frameworks.length === 0 ? (
            <p className="text-sm text-comply-text-secondary">
              Framework certifications are in progress.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {data.frameworks.map((f) => (
                <span
                  key={f.id}
                  className="comply-badge border-comply-purple-border/40 bg-comply-purple/15 text-comply-purple-border normal-case"
                >
                  {f.name}
                  {typeof f.score === "number" && f.score > 0 ? ` · ${f.score}%` : ""}
                </span>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <Card elevated>
        <CardHeader title="Published policies" />
        <CardBody className="p-0 pb-1">
          {data.policies.length === 0 ? (
            <p className="px-6 py-4 text-sm text-comply-text-secondary">
              Policy documents will appear here when published.
            </p>
          ) : (
            <ul className="divide-y divide-white/[0.06]">
              {data.policies.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-2 px-6 py-3 text-sm text-comply-text-primary"
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-comply-green" />
                  {p.title}
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card elevated>
        <CardHeader title="Request a compliance report" />
        <CardBody>
          <p className="text-sm text-comply-text-secondary">
            Leave your work email and the {data.name} team will follow up about report access.
          </p>
          <TrustReportRequest orgSlug={data.slug} />
        </CardBody>
      </Card>

      <p className="text-center text-[11px] text-comply-text-tertiary">Updated {updated}</p>
    </div>
  );
}
