import { NextRequest, NextResponse } from "next/server";
import { oauthProxyErrorRedirect } from "@/lib/oauth-callback-fallback";

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/** Complete GitLab OAuth on the API server-side, then redirect the browser to Vikela. */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const state = url.searchParams.get("state");
  const target = new URL(`${API_URL}/api/v1/auth/gitlab/callback`);
  url.searchParams.forEach((v, k) => target.searchParams.set(k, v));

  let res: Response;
  try {
    res = await fetch(target.toString(), { redirect: "manual" });
  } catch {
    return oauthProxyErrorRedirect(
      req,
      state,
      "Cannot reach the API to finish GitLab connect"
    );
  }

  const location = res.headers.get("location");
  if (location) {
    return NextResponse.redirect(location.startsWith("http") ? location : new URL(location, req.url));
  }

  const body = await res.text().catch(() => "");
  return oauthProxyErrorRedirect(
    req,
    state,
    body.slice(0, 120) || "GitLab connect failed"
  );
}
