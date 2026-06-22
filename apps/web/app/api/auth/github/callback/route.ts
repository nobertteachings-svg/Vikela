import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/** Complete GitHub OAuth on the API server-side, then redirect the browser to Vikela. */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const target = new URL(`${API_URL}/api/v1/auth/github/callback`);
  url.searchParams.forEach((v, k) => target.searchParams.set(k, v));

  let res: Response;
  try {
    res = await fetch(target.toString(), { redirect: "manual" });
  } catch {
    return NextResponse.redirect(
      new URL(
        `/onboarding/connect-repos?error=${encodeURIComponent("Cannot reach the API to finish GitHub connect")}`,
        req.url
      )
    );
  }

  const location = res.headers.get("location");
  if (location) {
    return NextResponse.redirect(location.startsWith("http") ? location : new URL(location, req.url));
  }

  const body = await res.text().catch(() => "");
  const fallback = `/onboarding/connect-repos?error=${encodeURIComponent(
    body.slice(0, 120) || "GitHub connect failed"
  )}`;
  return NextResponse.redirect(new URL(fallback, req.url));
}
