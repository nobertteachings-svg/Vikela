import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getServerApiHeaders } from "@/lib/server-api";
import { getServerApiUrl } from "@/lib/api-url";

/** Same-origin proxy so Auth0 connect uses Clerk server session + internal secret (reliable locally). */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session.userId) {
    return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });
  }

  let body: { domain?: string; name?: string };
  try {
    body = (await req.json()) as { domain?: string; name?: string };
  } catch {
    return NextResponse.json({ data: null, error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.domain?.trim()) {
    return NextResponse.json(
      { data: null, error: "domain required (e.g. your-tenant.us.auth0.com)" },
      { status: 400 }
    );
  }

  try {
    const headers = await getServerApiHeaders();
    // Prefer DB slug from env when Clerk slug is the short form.
    if (!headers["X-Org-Slug"] || headers["X-Org-Slug"] === session.orgSlug) {
      headers["X-Org-Slug"] =
        process.env.VIKELA_DEV_ORG_SLUG ?? headers["X-Org-Slug"] ?? "optic-inc-tcwm3o";
    }
    if (session.orgId) {
      headers["X-Clerk-Org-Id"] = session.orgId;
    }

    const apiUrl = getServerApiUrl();
    const res = await fetch(`${apiUrl}/api/v1/identity/auth0/connect`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        domain: body.domain.trim(),
        name: body.name,
      }),
      cache: "no-store",
    });

    const text = await res.text();
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { data: null, error: text.slice(0, 200) || `API ${res.status}` },
        { status: res.status }
      );
    }
    return NextResponse.json(json, { status: res.status });
  } catch (e) {
    return NextResponse.json(
      { data: null, error: e instanceof Error ? e.message : "Auth0 connect failed" },
      { status: 500 }
    );
  }
}
