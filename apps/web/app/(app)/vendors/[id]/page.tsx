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
import { VendorEditForm } from "@/components/vendors/vendor-edit-form";
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

  const status = vendor.status ?? "Not reviewed";
  const risk = vendor.risk ?? vendor.riskLevel;
  const documents = vendor.documents ?? [];
  const subprocessors = vendor.subprocessors ?? [];
  const score = vendor.score;
  const questionnaire = vendor.questionnaire ?? vendor.questionnaireStatus;
  const renewal = vendor.contractRenewal;
  const website = vendor.website;

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
          reviewStatus={vendor.reviewStatus ?? "PENDING"}
          questionnaireId={vendor.questionnaireId}
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
            <span
              className={cn(
                "comply-badge normal-case",
                STATUS_STYLES[status] ?? STATUS_STYLES["Not reviewed"]
              )}
            >
              {status}
            </span>
            <span className="comply-badge border-[var(--border-strong)] bg-comply-elevated text-comply-text-secondary normal-case">
              {risk} risk
            </span>
            {vendor.soc2 || vendor.soc2Certified ? (
              <span className="inline-flex items-center gap-1 comply-badge border-comply-green/30 bg-comply-green/10 text-comply-green normal-case">
                <IconFileCertificate size={14} />
                SOC 2
              </span>
            ) : null}
          </div>
        </div>
        {vendor.notes ? (
          <p className="mt-4 text-sm leading-relaxed text-comply-text-secondary">{vendor.notes}</p>
        ) : null}
        {website ? (
          <a
            href={website.startsWith("http") ? website : `https://${website}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-sm text-comply-purple-border hover:underline"
          >
            {website}
          </a>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card elevated>
          <CardHeader title="Vendor details" />
          <CardBody>
            <dl className="space-y-4">
              {[
                ["Owner", vendor.owner ?? "—"],
                ["Data access", vendor.dataAccess ?? "—"],
                [
                  "Last reviewed",
                  vendor.lastReviewed
                    ? new Date(vendor.lastReviewed).toLocaleDateString()
                    : "Not reviewed",
                ],
                [
                  "Contract renewal",
                  renewal
                    ? new Date(renewal).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "—",
                ],
                ["Processes customer data", vendor.dataProcessing ? "Yes" : "No"],
                ["Questionnaire", questionnaire ?? "Not started"],
              ].map(([label, value]) => (
                <div key={String(label)}>
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
            <p className="text-sm text-comply-text-secondary">
              {questionnaire ?? "Questionnaire not started."}
            </p>
            <ul className="space-y-2">
              {documents.length > 0 ? (
                documents.map((doc) => (
                  <li
                    key={doc}
                    className="flex items-center gap-2 rounded-md border border-white/[0.06] bg-black/20 px-3 py-2 text-sm text-comply-text-primary"
                  >
                    <IconCircleCheck size={16} className="text-comply-green" />
                    {doc.startsWith("http") ? (
                      <a href={doc} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {doc}
                      </a>
                    ) : (
                      doc
                    )}
                  </li>
                ))
              ) : (
                <li className="text-sm text-comply-muted">No documents listed yet, add them below.</li>
              )}
            </ul>
            {subprocessors.length > 0 ? (
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
            ) : null}
          </CardBody>
        </Card>
      </div>

      <VendorEditForm
        vendorId={vendor.id}
        initial={{
          name: vendor.name,
          category: vendor.category,
          website: vendor.website ?? "",
          owner: vendor.owner ?? "",
          dataAccess: vendor.dataAccess ?? "",
          riskLevel: vendor.riskLevel,
          notes: vendor.notes ?? "",
          contractRenewal: renewal ? renewal.slice(0, 10) : "",
          dataProcessing: Boolean(vendor.dataProcessing),
          soc2Certified: Boolean(vendor.soc2 ?? vendor.soc2Certified),
          documents,
          subprocessors,
        }}
      />
    </div>
  );
}
