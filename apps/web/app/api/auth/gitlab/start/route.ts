import { NextRequest, NextResponse } from "next/server";
import {
  denyNonAdminOAuthStart,
  oauthReturnPathFromQuery,
} from "@/lib/integration-admin";

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/** Admin-gated GitLab OAuth start proxy. */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const returnPath = oauthReturnPathFromQuery(url.searchParams.get("from"));
  const denied = await denyNonAdminOAuthStart(req, returnPath);
  if (denied) return denied;

  const target = new URL(`${API_URL}/api/v1/auth/gitlab/start`);
  url.searchParams.forEach((value, key) => {
    if (key !== "__clerk_handshake") target.searchParams.set(key, value);
  });

  const res = await fetch(target.toString(), { redirect: "manual" });
  const location = res.headers.get("location");
  if (location) {
    return NextResponse.redirect(location.startsWith("http") ? location : new URL(location, req.url));
  }

  const body = await res.text().catch(() => "");
  const dest = new URL(returnPath, req.url);
  dest.searchParams.set("error", body.slice(0, 120) || "GitLab connect failed to start");
  return NextResponse.redirect(dest);
}
