import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { BitbucketProvider } from "../services/git/bitbucket/bitbucket.provider.js";

describe("BitbucketProvider.listRepositories", () => {
  it("lists repos per workspace (not deprecated cross-workspace endpoint)", async () => {
    const calls: string[] = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      calls.push(url);
      if (url.includes("/2.0/user/workspaces")) {
        return new Response(
          JSON.stringify({
            values: [{ type: "workspace_access", workspace: { slug: "acme" } }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (url.includes("/2.0/repositories/acme")) {
        return new Response(
          JSON.stringify({
            values: [
              {
                uuid: "{repo-1}",
                name: "app",
                full_name: "acme/app",
                links: { clone: [{ href: "https://bitbucket.org/acme/app.git" }] },
                mainbranch: { name: "main" },
                is_private: true,
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response("unexpected", { status: 500 });
    }) as typeof fetch;

    try {
      const git = new BitbucketProvider("token");
      const repos = await git.listRepositories();
      assert.equal(repos.length, 1);
      assert.equal(repos[0]?.fullName, "acme/app");
      assert.ok(calls.some((u) => u.includes("/2.0/user/workspaces")));
      assert.ok(calls.some((u) => u.includes("/2.0/repositories/acme")));
      assert.ok(!calls.some((u) => /\/2\.0\/repositories\?role=/.test(u)));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
