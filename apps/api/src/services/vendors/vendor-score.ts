import type { ReviewStatus, RiskLevel } from "@prisma/client";

/** Deterministic vendor risk score (0–100) for inventory dashboards. */
export function computeVendorScore(input: {
  riskLevel: RiskLevel | string;
  soc2Certified: boolean;
  dataProcessing: boolean;
  reviewStatus: ReviewStatus | string;
  questionnaireStatus: string | null | undefined;
}): number {
  let score = 70;

  switch (input.riskLevel) {
    case "LOW":
      score += 15;
      break;
    case "MEDIUM":
      break;
    case "HIGH":
      score -= 15;
      break;
    case "CRITICAL":
      score -= 30;
      break;
  }

  if (input.soc2Certified) score += 12;
  else if (input.dataProcessing) score -= 10;

  const q = (input.questionnaireStatus ?? "").toLowerCase();
  if (q.includes("complete") || q.includes("approved")) score += 8;
  else if (q.includes("progress") || q.includes("review")) score += 3;
  else if (input.dataProcessing) score -= 5;

  if (input.reviewStatus === "APPROVED") score += 5;
  if (input.reviewStatus === "REJECTED") score -= 20;
  if (input.reviewStatus === "PENDING") score -= 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}
