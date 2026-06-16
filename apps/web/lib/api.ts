import type { ApiResponse } from "@vikela/shared";
import { getApiUrl } from "./api-url";

const API_URL = getApiUrl();

export function setOrgContext(slug: string, clerkOrgId?: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("vikela_org_slug", slug);
  if (clerkOrgId) localStorage.setItem("vikela_clerk_org_id", clerkOrgId);
}

async function clientHeaders(): Promise<HeadersInit> {
  const { getClientApiHeaders } = await import("./api-auth-client");
  return getClientApiHeaders();
}

function formatNetworkError(e: unknown): string {
  const detail = e instanceof Error ? e.message : "network error";
  if (/failed to fetch/i.test(detail)) {
    return "Cannot reach the API — check that the API service is running and NEXT_PUBLIC_API_URL is set on the Web service, then redeploy";
  }
  return detail;
}

async function parseClientResponse<T>(res: Response): Promise<T> {
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

async function clientFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = await clientHeaders();
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { ...headers, ...(init?.headers as Record<string, string> | undefined) },
      credentials: "include",
    });
  } catch (e) {
    throw new Error(formatNetworkError(e));
  }
  return parseClientResponse<T>(res);
}

export async function apiGet<T>(path: string, opts?: { cache?: RequestCache }): Promise<T> {
  return clientFetch<T>(path, { cache: opts?.cache ?? "no-store" });
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return clientFetch<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body != null ? JSON.stringify(body) : undefined,
  });
}

export async function apiDelete<T>(path: string): Promise<T> {
  return clientFetch<T>(path, { method: "DELETE" });
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  return clientFetch<T>(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: body != null ? JSON.stringify(body) : undefined,
  });
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return clientFetch<T>(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: body != null ? JSON.stringify(body) : undefined,
  });
}

/** Client-side auth headers (async). */
export async function orgHeaders(): Promise<HeadersInit> {
  return clientHeaders();
}

export { API_URL };
