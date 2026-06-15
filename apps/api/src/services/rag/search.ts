import { prisma } from "../../lib/prisma.js";
import {
  cosineSimilarity,
  embedText,
  parseStoredEmbedding,
} from "../../lib/embeddings.js";

function scoreChunkKeyword(content: string, title: string, query: string): number {
  const q = query.toLowerCase();
  const words = q.split(/\s+/).filter((w) => w.length > 2);
  let score = 0;
  const text = `${title} ${content}`.toLowerCase();
  if (text.includes(q)) score += 10;
  for (const w of words) {
    if (text.includes(w)) score += 2;
  }
  return score;
}

export async function searchKnowledge(
  orgId: string,
  query: string,
  limit = 8
): Promise<{ id: string; title: string; content: string; source: string }[]> {
  let count = await prisma.knowledgeChunk.count({ where: { orgId } });
  if (count === 0) {
    const { ingestOrgKnowledge } = await import("./ingest.js");
    await ingestOrgKnowledge(orgId);
    count = await prisma.knowledgeChunk.count({ where: { orgId } });
  }

  const chunks = await prisma.knowledgeChunk.findMany({
    where: { orgId },
    take: 300,
  });

  const queryEmbedding = await embedText(query);
  const hasVectors =
    queryEmbedding &&
    chunks.some((c) => parseStoredEmbedding(c.embedding) !== null);

  type Scored = { id: string; title: string; content: string; source: string; score: number };

  const scored: Scored[] = chunks.map((c) => {
    const stored = parseStoredEmbedding(c.embedding);
    if (hasVectors && queryEmbedding && stored) {
      return {
        id: c.id,
        title: c.title,
        content: c.content,
        source: c.source,
        score: cosineSimilarity(queryEmbedding, stored),
      };
    }
    return {
      id: c.id,
      title: c.title,
      content: c.content,
      source: c.source,
      score: scoreChunkKeyword(c.content, c.title, query),
    };
  });

  const ranked = scored.filter((c) => c.score > 0).sort((a, b) => b.score - a.score);
  const top = ranked.length > 0 ? ranked : scored.sort((a, b) => b.score - a.score);

  return top.slice(0, limit).map(({ id, title, content, source }) => ({
    id,
    title,
    content,
    source,
  }));
}
