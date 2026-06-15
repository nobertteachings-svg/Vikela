import { prisma } from "../../lib/prisma.js";
import { openRealGapsWhere } from "../../lib/gap-query.js";
import { searchKnowledge } from "../rag/search.js";
import type { CopilotCitation } from "./types.js";
import { redactCodeSnippet } from "../../lib/redact-secrets.js";
import { computeFrameworkScoresForOrg } from "../../lib/framework-score.js";

export async function buildCopilotContext(
  orgId: string,
  query: string,
  options?: { gapId?: string }
): Promise<{
  orgName: string;
  orgId: string;
  contextBlock: string;
  citations: CopilotCitation[];
}> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: { frameworks: { include: { framework: true } } },
  });

  if (!org) {
    return { orgName: "Your organization", orgId: "", contextBlock: "", citations: [] };
  }

  let focusGapBlock = "";
  if (options?.gapId) {
    const gap = await prisma.gap.findFirst({
      where: { id: options.gapId, orgId: org.id },
      include: { control: true, repo: true, cloudAccount: true },
    });
    if (gap) {
      focusGapBlock = `
## Focus gap (user asked about this finding)
- ID: ${gap.id}
- Title: ${gap.title}
- Severity: ${gap.severity}
- Source: ${gap.source}
- Control: ${gap.control?.code ?? "none"}
- Repo: ${gap.repo?.fullName ?? "n/a"}
- Cloud: ${gap.cloudProvider ?? "n/a"} ${gap.resourceId ?? ""}
- File: ${gap.filePath ?? "n/a"}${gap.lineNumber ? `:${gap.lineNumber}` : ""}
- Description: ${gap.description}
- Remediation: ${gap.remediation}
${gap.codeSnippet ? `- Code snippet:\n\`\`\`\n${redactCodeSnippet(gap.codeSnippet)}\n\`\`\`` : ""}
`;
    }
  }

  const [gaps, integrations, recentScans, chunks] = await Promise.all([
    prisma.gap.findMany({
      where: openRealGapsWhere(org.id),
      include: { control: true, repo: true },
      orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
      take: 15,
    }),
    prisma.integration.findMany({
      where: { orgId: org.id, isActive: true },
      select: { provider: true, category: true, name: true },
    }),
    prisma.scan.findMany({
      where: { orgId: org.id },
      orderBy: { startedAt: "desc" },
      take: 5,
      select: { scanType: true, status: true, score: true, startedAt: true },
    }),
    searchKnowledge(org.id, query, 8),
  ]);

  const citations: CopilotCitation[] = chunks.map((c) => ({
    chunkId: c.id,
    title: c.title,
    source: c.source,
    excerpt: c.content.slice(0, 280),
  }));

  const frameworkScores = await computeFrameworkScoresForOrg(
    org.id,
    org.frameworks.map((f) => f.frameworkId)
  );

  const frameworkLine =
    org.frameworks
      .map(
        (f) =>
          `${f.framework.name} (${f.status}, score ${frameworkScores.get(f.frameworkId) ?? 0}%)`
      )
      .join(", ") || "SOC 2";

  const gapLines = gaps
    .map(
      (g) =>
        `- [${g.severity}] ${g.title} (id: ${g.id}, source: ${g.source}${g.control ? `, control ${g.control.code}` : ""}${g.repo ? `, repo ${g.repo.fullName}` : ""})\n  ${g.description.slice(0, 200)}\n  Remediation: ${g.remediation.slice(0, 300)}`
    )
    .join("\n");

  const integrationLines = integrations
    .map((i) => `- ${i.provider} (${i.category}): ${i.name}`)
    .join("\n");

  const scanLines = recentScans
    .map(
      (s) =>
        `- ${s.scanType} scan ${s.status}${s.score != null ? ` score ${s.score}%` : ""} at ${s.startedAt.toISOString()}`
    )
    .join("\n");

  const ragLines = chunks
    .map((c) => `### ${c.title} [${c.source}]\n${c.content.slice(0, 600)}`)
    .join("\n\n");

  const contextBlock = `
## Organization
Name: ${org.name}
Frameworks: ${frameworkLine}
${focusGapBlock}
## Connected integrations
${integrationLines || "None"}

## Recent scans
${scanLines || "None"}

## Open compliance gaps (${gaps.length})
${gapLines || "No open gaps"}

## Retrieved knowledge (RAG)
${ragLines || "No matching knowledge chunks"}
`.trim();

  return { orgName: org.name, orgId: org.id, contextBlock, citations };
}

export async function getCopilotSuggestions(orgId: string): Promise<string[]> {
  const gaps = await prisma.gap.findMany({
    where: openRealGapsWhere(orgId),
    orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
    take: 5,
    include: { control: true },
  });

  const suggestions: string[] = [
    "What should we fix first for SOC 2?",
    "What evidence do we need for CC6.1?",
    "Summarize our open critical gaps",
  ];

  for (const g of gaps.slice(0, 3)) {
    suggestions.push(`How do I fix: ${g.title}?`);
    if (g.control?.code) {
      suggestions.push(`Why did we fail ${g.control.code}?`);
    }
  }

  return [...new Set(suggestions)].slice(0, 8);
}
