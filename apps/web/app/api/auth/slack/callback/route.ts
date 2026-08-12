import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/** Slack OAuth redirect_uri lands on the web app, then proxies to the API. */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const target = new URL(`${API_URL}/api/v1/auth/slack/callback`);
  url.searchParams.forEach((v, k) => target.searchParams.set(k, v));
  return NextResponse.redirect(target.toString());
}
