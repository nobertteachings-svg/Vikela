const DEFAULT_API_URL = "http://localhost:3001";

/** Base API URL without trailing slash. Server may use API_URL; browser uses NEXT_PUBLIC_API_URL. */
export function getApiUrl(): string {
  const raw =
    process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_URL;
  return raw.replace(/\/+$/, "");
}

export function assertProductionApiUrl(): void {
  if (process.env.NODE_ENV !== "production") return;

  const url = getApiUrl();
  if (url.includes("localhost") || url.includes("127.0.0.1")) {
    throw new Error(
      "API URL not configured for production — set NEXT_PUBLIC_API_URL on the Web service to your Railway API domain (e.g. https://api-xxx.up.railway.app), then redeploy"
    );
  }
  if (url.endsWith("/api/v1") || url.endsWith("/api")) {
    throw new Error(
      "NEXT_PUBLIC_API_URL must be the API base URL without /api or /api/v1 suffix"
    );
  }
}

export function assertProductionWebEnv(): void {
  if (process.env.NODE_ENV !== "production") return;

  assertProductionApiUrl();

  if (!process.env.CLERK_SECRET_KEY?.trim()) {
    throw new Error("CLERK_SECRET_KEY is required on the Web service in production");
  }
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim()) {
    throw new Error(
      "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is required on the Web service in production (redeploy after setting)"
    );
  }
}
