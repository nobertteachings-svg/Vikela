import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/** Proxy GitHub App install start through the web app (avoids Clerk handshake on :3001). */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const target = new URL(`${API_URL}/api/v1/auth/github/install`);
  url.searchParams.forEach((value, key) => {
    if (key !== "__clerk_handshake") target.searchParams.set(key, value);
  });

  const res = await fetch(target.toString(), { redirect: "manual" });
  const location = res.headers.get("location");
  if (location) {
    return NextResponse.redirect(location);
  }

  const body = await res.text().catch(() => "");
  return NextResponse.json(
    { error: "GitHub install redirect failed", status: res.status, detail: body.slice(0, 200) },
    { status: 502 }
  );
}
