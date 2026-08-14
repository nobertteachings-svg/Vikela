import "server-only";
import type { ApiResponse } from "@vikela/shared";
import { auth } from "@clerk/nextjs/server";
import { assertProductionApiUrl, getServerApiUrl } from "./api-url";
import { resolveDevOrgSlug } from "./dev-org-slug";

const API_URL = getServerApiUrl();

async function parseApiResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let json: ApiResponse<T> & { message?: string };
  try {
    json = JSON.parse(text) as ApiResponse<T> & { message?: string };
  } catch {
    throw new Error(
      res.ok
        ? "API returned invalid JSON"
        : `API ${res.status}: ${text.slice(0, 120) || res.statusText}`
    );
  }

  const message = json.error ?? json.message;
  if (!res.ok || json.error || json.data === null) {
    throw new Error(message ?? `API request failed (${res.status})`);
  }
  if (json.data === undefined) {
    throw new Error(message ?? "API returned no data");
  }
  return json.data;
}

const hasClerk = Boolean(process.env.CLERK_SECRET_KEY);

function devInternalSecret(): string | undefined {
  return process.env.NODE_ENV !== "production"
    ? process.env.INTERNAL_API_SECRET
    : undefined;
}

/** Headers for server-side API calls (RSC, route handlers). */
export async function getServerApiHeaders(): Promise<Record<string, string>> {
  if (!hasClerk) {
    const headers: Record<string, string> = {};
    const devSlug = resolveDevOrgSlug();
    if (devSlug) headers["X-Org-Slug"] = devSlug;
    const internalSecret = devInternalSecret();
    if (internalSecret) {
      headers["X-Shieldoq-Internal-Secret"] = internalSecret;
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

  // Dev: allow internal secret for local API, but never overwrite Clerk org slug/id.
  const internalSecret = devInternalSecret();
  if (internalSecret) {
    headers["X-Shieldoq-Internal-Secret"] = internalSecret;
    if (!session.orgId && !session.orgSlug) {
      const devSlug = resolveDevOrgSlug();
      if (devSlug) headers["X-Org-Slug"] = devSlug;
    }
  }

  return headers;
}

async function serverApiFetch<T>(
  path: string,
  init?: RequestInit & { cache?: RequestCache }
): Promise<T> {
  assertProductionApiUrl();
  const headers = await getServerApiHeaders();
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { ...headers, ...(init?.headers as Record<string, string> | undefined) },
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : "network error";
    throw new Error(
      `Cannot reach API at ${API_URL} (${detail}), check NEXT_PUBLIC_API_URL on the Web service and that the API service is running`
    );
  }
  return parseApiResponse<T>(res);
}

export async function serverApiGet<T>(
  path: string,
  opts?: { cache?: RequestCache }
): Promise<T> {
  return serverApiFetch<T>(path, { cache: opts?.cache ?? "no-store" });
}

export async function serverApiPost<T>(path: string, body?: unknown): Promise<T> {
  return serverApiFetch<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body != null ? JSON.stringify(body) : undefined,
  });
}

export async function serverApiPatch<T>(path: string, body?: unknown): Promise<T> {
  return serverApiFetch<T>(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: body != null ? JSON.stringify(body) : undefined,
  });
}
