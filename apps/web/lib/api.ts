import type { ApiResponse } from "@vikela/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function setOrgContext(slug: string, clerkOrgId?: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("vikela_org_slug", slug);
  if (clerkOrgId) localStorage.setItem("vikela_clerk_org_id", clerkOrgId);
}

async function clientHeaders(): Promise<HeadersInit> {
  const { getClientApiHeaders } = await import("./api-auth-client");
  return getClientApiHeaders();
}

export async function apiGet<T>(path: string, opts?: { cache?: RequestCache }): Promise<T> {
  const headers = await clientHeaders();
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

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const headers = await clientHeaders();
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

export async function apiDelete<T>(path: string): Promise<T> {
  const headers = await clientHeaders();
  const res = await fetch(`${API_URL}${path}`, {
    method: "DELETE",
    headers,
  });
  const json = (await res.json()) as ApiResponse<T>;
  if (json.error || json.data === null) {
    throw new Error(json.error ?? "API request failed");
  }
  return json.data;
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  const headers = await clientHeaders();
  const res = await fetch(`${API_URL}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...headers },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json()) as ApiResponse<T>;
  if (json.error || json.data === null) {
    throw new Error(json.error ?? "API request failed");
  }
  return json.data;
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  const headers = await clientHeaders();
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

/** Client-side auth headers (async). */
export async function orgHeaders(): Promise<HeadersInit> {
  return clientHeaders();
}

export { API_URL };
