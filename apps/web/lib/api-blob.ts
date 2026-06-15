import type { ApiResponse } from "@vikela/shared";
import { API_URL, orgHeaders } from "./api";

function filenameFromDisposition(disposition: string, fallback: string): string {
  const match = disposition.match(/filename="([^"]+)"/);
  return match?.[1] ?? fallback;
}

export async function apiGetBlob(
  path: string,
  fallbackFilename = "download"
): Promise<{ blob: Blob; filename: string }> {
  const headers = await orgHeaders();
  const res = await fetch(`${API_URL}${path}`, {
    method: "GET",
    headers: headers as HeadersInit,
  });

  if (!res.ok) {
    let message = "Download failed";
    try {
      const json = (await res.json()) as ApiResponse<unknown>;
      if (json.error) message = json.error;
    } catch {
      message = res.statusText || message;
    }
    throw new Error(message);
  }

  const disposition = res.headers.get("Content-Disposition") ?? "";
  const filename = filenameFromDisposition(disposition, fallbackFilename);
  const blob = await res.blob();
  return { blob, filename };
}

export async function apiPostBlob(
  path: string,
  body: unknown
): Promise<{ blob: Blob; filename: string }> {
  const headers = await orgHeaders();
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let message = "Export failed";
    try {
      const json = (await res.json()) as ApiResponse<unknown>;
      if (json.error) message = json.error;
    } catch {
      message = res.statusText || message;
    }
    throw new Error(message);
  }

  const disposition = res.headers.get("Content-Disposition") ?? "";
  const filename = filenameFromDisposition(disposition, "audit-export.zip");
  const blob = await res.blob();
  return { blob, filename };
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
