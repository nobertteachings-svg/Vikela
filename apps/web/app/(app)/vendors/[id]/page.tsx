import Link from "next/link";
import { notFound } from "next/navigation";
import {
  IconArrowLeft,
  IconCircleCheck,
  IconFileCertificate,
} from "@tabler/icons-react";
import { Card, CardBody, CardHeader } from "@/components/comply/card";
import { PageHeader } from "@/components/comply/page-header";
import { VendorDetailActions } from "@/components/vendors/vendor-detail-actions";
import { complianceApi } from "@/lib/compliance-api";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  Approved: "border-comply-green/30 bg-comply-green/10 text-comply-green",
  "Review needed": "border-comply-amber/30 bg-comply-amber/10 text-comply-amber-text",
  "Not reviewed": "border-white/[0.12] bg-white/[0.04] text-comply-text-secondary",
  Rejected: "border-comply-red/30 bg-comply-red/10 text-comply-red",
};

export const dynamic = "force-dynamic";

export default async function VendorDetailPage({ params }: { params: { id: string } }) {
  let vendor;
  try {
    vendor = await complianceApi.vendor(params.id);
  } catch {
    notFound();
  }

  const status = (vendor as { status?: string }).status ?? "Not reviewed";
  const risk = (vendor as { risk?: string }).risk ?? vendor.riskLevel;
  const documents = (vendor as { documents?: string[] }).documents ?? [];
  const subprocessors = (vendor as { subprocessors?: string[] }).subprocessors ?? [];
  const score = (vendor as { score?: number | null }).score;
  const questionnaire =
    (vendor as { questionnaire?: string | null }).questionnaire ??
    (vendor as { questionnaireStatus?: string | null }).questionnaireStatus;

  return (
    <div className="comply-page max-w-3xl">
      <Link
        href="/vendors"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-comply-text-secondary hover:text-comply-purple-border"
      >
        <IconArrowLeft size={14} />
        Back to vendors
      </Link>

      <PageHeader
        eyebrow="Third party"
        title={vendor.name}
        description={vendor.category}
        className="border-b-0 pb-2"
      >
        <VendorDetailActions
          vendorId={vendor.id}
          reviewStatus={(vendor as { reviewStatus?: string }).reviewStatus ?? "PENDING"}
        />
      </PageHeader>

      <div className="marketing-panel marketing-panel-highlight relative p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-comply-text-tertiary">
              Risk score
            </p>
            <p className="mt-1 font-mono text-3xl font-semibold text-comply-purple">
              {score ?? "—"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={cn("comply-badge normal-case", STATUS_STYLES[status] ?? STATUS_STYLES["Not reviewed"])}>
              {status}
            </span>
            <span className="comply-badge border-[var(--border-strong)] bg-comply-elevated text-comply-text-secondary normal-case">
              {risk} risk
            </span>
            {(vendor as { soc2?: boolean }).soc2 && (
              <span className="inline-flex items-center gap-1 comply-badge border-comply-green/30 bg-comply-green/10 text-comply-green normal-case">
                <IconFileCertificate size={14} />
                SOC 2
              </span>
            )}
          </div>
        </div>
        {vendor.notes && (
          <p className="mt-4 text-sm leading-relaxed text-comply-text-secondary">{vendor.notes}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card elevated>
          <CardHeader title="Vendor details" />
          <CardBody>
            <dl className="space-y-4">
              {[
                ["Owner", (vendor as { owner?: string }).owner ?? "—"],
                ["Data access", (vendor as { dataAccess?: string }).dataAccess ?? "—"],
                [
                  "Last reviewed",
                  vendor.lastReviewed
                    ? new Date(vendor.lastReviewed).toLocaleDateString()
                    : "Not reviewed",
                ],
                [
                  "Contract renewal",
                  (vendor as { contractRenewal?: string | null }).contractRenewal
                    ? new Date((vendor as { contractRenewal: string }).contractRenewal).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "—",
                ],
                [
                  "Processes customer data",
                  (vendor as { dataProcessing?: boolean }).dataProcessing ? "Yes" : "No",
                ],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-comply-text-tertiary">
                    {label}
                  </dt>
                  <dd className="mt-1 text-sm text-comply-text-primary">{value}</dd>
                </div>
              ))}
            </dl>
          </CardBody>
        </Card>

        <Card elevated>
          <CardHeader title="Questionnaire & documents" />
          <CardBody className="space-y-4">
            {questionnaire ? (
              <>
                <p className="text-sm text-comply-text-secondary">{questionnaire}</p>
                <ul className="space-y-2">
                  {documents.length > 0 ? (
                    documents.map((doc) => (
                      <li
                        key={doc}
                        className="flex items-center gap-2 rounded-md border border-white/[0.06] bg-black/20 px-3 py-2 text-sm text-comply-text-primary"
                      >
                        <IconCircleCheck size={16} className="text-comply-green" />
                        {doc}
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-comply-muted">No documents uploaded</li>
                  )}
                </ul>
                {subprocessors.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-comply-text-tertiary">
                      Subprocessors
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {subprocessors.map((s) => (
                        <span
                          key={s}
                          className="rounded-sm border border-white/[0.08] px-2 py-0.5 text-xs text-comply-text-secondary"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-comply-muted">Questionnaire not started.</p>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
