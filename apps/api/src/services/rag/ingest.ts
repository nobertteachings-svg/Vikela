import { prisma } from "../../lib/prisma.js";
import { embedTexts } from "../../lib/embeddings.js";
import { openRealGapsWhere } from "../../lib/gap-query.js";

export async function ingestOrgKnowledge(orgId: string): Promise<number> {
  await prisma.knowledgeChunk.deleteMany({ where: { orgId } });

  const chunks: {
    title: string;
    content: string;
    source: string;
    sourceId?: string;
  }[] = [];

  const gaps = await prisma.gap.findMany({
    where: openRealGapsWhere(orgId),
    include: { control: true },
    orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
    take: 50,
  });
  for (const g of gaps) {
    chunks.push({
      title: `Gap: ${g.title}`,
      content: `${g.title}\n${g.description}\nSeverity: ${g.severity}\nSource: ${g.source}\nRemediation: ${g.remediation}\nControl: ${g.control?.code ?? "none"}`,
      source: "gap",
      sourceId: g.id,
    });
  }

  const controls = await prisma.orgControl.findMany({
    where: { orgId },
    include: { control: true },
    take: 60,
  });
  for (const oc of controls) {
    chunks.push({
      title: `Control ${oc.control.code}`,
      content: `${oc.control.code} ${oc.control.title}\n${oc.control.description}\nGuidance: ${oc.control.guidance}\nTest: ${oc.control.testProcedure}\nStatus: ${oc.status}`,
      source: "control",
      sourceId: oc.id,
    });
  }

  const policies = await prisma.policy.findMany({ where: { orgId }, take: 20 });
  for (const p of policies) {
    chunks.push({
      title: `Policy: ${p.title}`,
      content: `${p.title}\nType: ${p.type}\nStatus: ${p.status}\n${p.content.slice(0, 4000)}`,
      source: "policy",
      sourceId: p.id,
    });
  }

  const evidence = await prisma.evidence.findMany({
    where: { orgId },
    include: { control: { include: { control: true } } },
    take: 30,
  });
  for (const e of evidence) {
    chunks.push({
      title: `Evidence: ${e.title}`,
      content: `${e.title}\n${e.description ?? ""}\nType: ${e.type}\nControl: ${e.control?.control.code ?? "unlinked"}`,
      source: "evidence",
      sourceId: e.id,
    });
  }

  if (chunks.length === 0) return 0;

  const texts = chunks.map((c) => `${c.title}\n${c.content}`.slice(0, 8000));
  const embeddings = await embedTexts(texts);

  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i]!;
    await prisma.knowledgeChunk.create({
      data: {
        orgId,
        title: c.title,
        content: c.content,
        source: c.source,
        sourceId: c.sourceId,
        embedding: embeddings[i] ?? undefined,
      },
    });
  }

  return chunks.length;
}
