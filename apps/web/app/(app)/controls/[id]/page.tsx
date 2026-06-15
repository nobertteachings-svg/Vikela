import { notFound } from "next/navigation";
import {
  ControlDetailPageContent,
  type ControlDetail,
} from "@/components/controls/control-detail-page";
import { complianceApi } from "@/lib/compliance-api";

export const dynamic = "force-dynamic";

function toControlDetail(raw: Record<string, unknown>): ControlDetail {
  const frameworks =
    (raw.frameworks as { slug: string; name: string; requirement?: string }[]) ?? [];
  const gaps =
    (raw.gaps as { id: string; title: string; severity: string; status: string }[]) ?? [];

  return {
    id: String(raw.id),
    code: String(raw.code),
    title: String(raw.title),
    description: String(raw.description ?? ""),
    category: String(raw.category ?? "General"),
    guidance: raw.guidance != null ? String(raw.guidance) : null,
    status: String(raw.status ?? "NOT_STARTED"),
    evidenceCount: typeof raw.evidenceCount === "number" ? raw.evidenceCount : undefined,
    openGapCount: typeof raw.openGapCount === "number" ? raw.openGapCount : gaps.length,
    frameworks,
    gaps,
  };
}

export default async function ControlDetailPage({ params }: { params: { id: string } }) {
  try {
    const raw = await complianceApi.control(params.id);
    return <ControlDetailPageContent control={toControlDetail(raw)} />;
  } catch {
    notFound();
  }
}
