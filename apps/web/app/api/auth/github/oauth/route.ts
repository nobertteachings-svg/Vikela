import { NextRequest, NextResponse } from "next/server";
import {
  denyNonAdminOAuthStart,
  oauthReturnPathFromQuery,
} from "@/lib/integration-admin";

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/** Proxy classic GitHub OAuth start (fallback when App install is unavailable). */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const returnPath = oauthReturnPathFromQuery(url.searchParams.get("from"));
  const denied = await denyNonAdminOAuthStart(req, returnPath);
  if (denied) return denied;

  const target = new URL(`${API_URL}/api/v1/auth/github/oauth`);
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
    { error: "GitHub OAuth redirect failed", status: res.status, detail: body.slice(0, 200) },
    { status: 502 }
  );
}
