import "server-only";
import type { ApiResponse } from "@vikela/shared";
import { auth } from "@clerk/nextjs/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const hasClerk = Boolean(process.env.CLERK_SECRET_KEY);

function devInternalSecret(): string | undefined {
  return process.env.NODE_ENV !== "production"
    ? process.env.INTERNAL_API_SECRET
    : undefined;
}

/** Headers for server-side API calls (RSC, route handlers). */
export async function getServerApiHeaders(): Promise<Record<string, string>> {
  if (!hasClerk) {
    const headers: Record<string, string> = {
      "X-Org-Slug": process.env.VIKELA_DEV_ORG_SLUG ?? "demo",
    };
    const internalSecret = devInternalSecret();
    if (internalSecret) {
      headers["X-Vikela-Internal-Secret"] = internalSecret;
    }
    return headers;
  }

  const session = await auth();
  if (!session.userId) {
    throw new Error("Unauthorized");
  }

  const headers: Record<string, string> = {};

  if (session.orgId) {
    headers["X-Clerk-Org-Id"] = session.orgId;
  }
  if (session.orgSlug) {
    headers["X-Org-Slug"] = session.orgSlug;
  }

  const token = await session.getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Dev fallback: use seeded demo org when Clerk org is not in Vikela yet (webhook not forwarded).
  const internalSecret = devInternalSecret();
  if (internalSecret) {
    headers["X-Vikela-Internal-Secret"] = internalSecret;
    headers["X-Org-Slug"] = process.env.VIKELA_DEV_ORG_SLUG ?? "demo";
  }

  return headers;
}

export async function serverApiGet<T>(
  path: string,
  opts?: { cache?: RequestCache }
): Promise<T> {
  const headers = await getServerApiHeaders();
  const res = await fetch(`${API_URL}${path}`, {
    headers,
    cache: opts?.cache ?? "no-store",
  });
  const json = (await res.json()) as ApiResponse<T>;
  if (json.error || json.data === null) {
    throw new Error(json.error ?? "API request failed");
  }
  return json.data;
}

export async function serverApiPost<T>(path: string, body?: unknown): Promise<T> {
  const headers = await getServerApiHeaders();
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json()) as ApiResponse<T>;
  if (json.error || json.data === null) {
    throw new Error(json.error ?? "API request failed");
  }
  return json.data;
}

export async function serverApiPatch<T>(path: string, body?: unknown): Promise<T> {
  const headers = await getServerApiHeaders();
  const res = await fetch(`${API_URL}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...headers },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json()) as ApiResponse<T>;
  if (json.error || json.data === null) {
    throw new Error(json.error ?? "API request failed");
  }
  return json.data;
}
