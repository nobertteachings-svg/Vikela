import Link from "next/link";
import { IconArrowRight } from "@tabler/icons-react";
import { COMPLIANCE_FRAMEWORKS } from "@vikela/shared/framework-catalog";
import { ApiError } from "@/components/comply/api-error";
import { PageHeader } from "@/components/comply/page-header";
import { Card, CardBody } from "@/components/comply/card";
import { ProgressBar } from "@/components/comply/progress-bar";
import { FrameworkEnrollButton } from "@/components/frameworks/framework-enroll-button";
import { complianceApi } from "@/lib/compliance-api";
import { cn } from "@/lib/utils";

export default async function FrameworksPage() {
  let frameworks;
  try {
    const rows = await complianceApi.frameworks();
    const bySlug = new Map(rows.map((f) => [f.slug, f]));
    frameworks = COMPLIANCE_FRAMEWORKS.map((cat) => bySlug.get(cat.slug)).filter(Boolean) as typeof rows;
  } catch (e) {
    return (
      <div className="comply-page">
        <PageHeader title="Frameworks" description="SOC 2, HIPAA, ISO, and more." />
        <ApiError message={e instanceof Error ? e.message : "Failed to load frameworks"} />
      </div>
    );
  }

  return (
    <div className="comply-page">
      <PageHeader
        eyebrow="Compliance"
        title="Frameworks"
        description="Monitor readiness and control coverage for each compliance framework."
      />

      <div className="grid gap-5 md:grid-cols-2">
        {frameworks.map((fw) => {
          const catalogOnly = fw.controlCount === 0;

          return (
            <Card
              key={fw.id}
              elevated={!catalogOnly || fw.enrolled}
              className={cn(
                "transition-transform",
                catalogOnly
                  ? "opacity-75"
                  : "hover:-translate-y-0.5"
              )}
            >
              <CardBody>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-comply-text-primary">{fw.name}</h2>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {fw.enrolled && (
                        <span className="comply-badge border-comply-green/40 bg-comply-green/15 normal-case tracking-normal text-comply-green">
                          Enabled
                        </span>
                      )}
                      {catalogOnly && !fw.enrolled && (
                        <span className="comply-badge border-[var(--border-strong)] bg-comply-elevated normal-case tracking-normal text-comply-text-tertiary">
                          Not enabled
                        </span>
                      )}
                    </div>
                  </div>
                  {!catalogOnly && (
                    <span className="font-mono text-2xl font-semibold text-comply-purple">{fw.score}%</span>
                  )}
                </div>
                {fw.description && (
                  <p className="mt-3 text-sm leading-relaxed text-comply-text-secondary line-clamp-2">
                    {fw.description}
                  </p>
                )}
                {!catalogOnly ? (
                  <>
                    <div className="mt-5">
                      <ProgressBar
                        label="Readiness"
                        value={fw.score}
                        suffix={`${fw.controlCount} controls`}
                      />
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
                      <div className="flex gap-4">
                        <Link
                          href={`/controls?framework=${fw.slug}`}
                          className="comply-link inline-flex items-center gap-1 text-xs font-medium"
                        >
                          View controls <IconArrowRight size={12} />
                        </Link>
                        <Link
                          href={`/gaps?framework=${fw.slug}`}
                          className="comply-link text-xs font-medium"
                        >
                          View gaps
                        </Link>
                      </div>
                      <FrameworkEnrollButton framework={fw} />
                    </div>
                  </>
                ) : (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
                    <p className="text-xs text-comply-text-tertiary">
                      Enable this framework to add it to your compliance program.
                    </p>
                    <FrameworkEnrollButton framework={fw} />
                  </div>
                )}
              </CardBody>
            </Card>
          );
        })}

      </div>
    </div>
  );
}
