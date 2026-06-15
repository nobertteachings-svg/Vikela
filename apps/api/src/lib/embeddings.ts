/** Text embeddings for RAG — OpenAI when configured, local fallback otherwise. */

const LOCAL_DIMS = 256;

function parseEmbedding(data: unknown): number[] | null {
  if (!Array.isArray(data)) return null;
  const nums = data.filter((v): v is number => typeof v === "number");
  return nums.length === data.length ? nums : null;
}

/** Deterministic local embedding when OpenAI is unavailable (quota, offline, no key). */
export function localEmbedText(text: string, dims = LOCAL_DIMS): number[] {
  const vec = new Float64Array(dims);
  const words = text.toLowerCase().split(/\W+/).filter((w) => w.length > 2);
  for (const word of words) {
    let h = 2166136261;
    for (let i = 0; i < word.length; i++) {
      h ^= word.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    const idx = Math.abs(h) % dims;
    vec[idx] += 1;
  }
  let norm = 0;
  for (let i = 0; i < dims; i++) norm += vec[i]! * vec[i]!;
  norm = Math.sqrt(norm) || 1;
  return Array.from(vec, (v) => v / norm);
}

export async function embedTexts(texts: string[]): Promise<(number[] | null)[]> {
  if (texts.length === 0) return [];

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return texts.map((t) => localEmbedText(t));
  }

  const model = process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";
  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, input: texts.map((t) => t.slice(0, 8000)) }),
    });

    if (!res.ok) {
      const errText = await res.text();
      const quotaHit = errText.includes("insufficient_quota") || errText.includes("quota");
      console.warn(
        quotaHit
          ? "OpenAI embeddings quota exceeded — using local embeddings for RAG."
          : `OpenAI embeddings failed — using local fallback: ${errText.slice(0, 200)}`
      );
      return texts.map((t) => localEmbedText(t));
    }

    const json = (await res.json()) as {
      data?: { embedding: number[] }[];
    };
    const ordered = json.data ?? [];
    return texts.map((t, i) => parseEmbedding(ordered[i]?.embedding) ?? localEmbedText(t));
  } catch (e) {
    console.warn("OpenAI embeddings error — using local fallback:", e);
    return texts.map((t) => localEmbedText(t));
  }
}

export async function embedText(text: string): Promise<number[] | null> {
  const [vec] = await embedTexts([text]);
  return vec;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

export function parseStoredEmbedding(raw: unknown): number[] | null {
  return parseEmbedding(raw);
}
