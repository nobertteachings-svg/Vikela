import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { GithubProvider } from "../services/git/github/github.provider.js";

describe("GithubProvider.listRepositories", () => {
  it("returns empty list when installation endpoint succeeds with no repos", async () => {
    const calls: string[] = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      calls.push(url);
      if (url.includes("/installation/repositories")) {
        return new Response(JSON.stringify({ repositories: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("unexpected", { status: 500 });
    }) as typeof fetch;

    try {
      const git = new GithubProvider("install-token");
      const repos = await git.listRepositories();
      assert.deepEqual(repos, []);
      assert.ok(calls.some((u) => u.includes("/installation/repositories")));
      assert.ok(!calls.some((u) => u.includes("/user/repos")));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("falls through to /user/repos when installation endpoint fails (OAuth)", async () => {
    const calls: string[] = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      calls.push(url);
      if (url.includes("/installation/repositories")) {
        return new Response("Not Found", { status: 404 });
      }
      if (url.includes("/user/repos")) {
        return new Response(
          JSON.stringify([
            {
              id: 1,
              name: "demo",
              full_name: "acme/demo",
              clone_url: "https://github.com/acme/demo.git",
              default_branch: "main",
              private: true,
            },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response("unexpected", { status: 500 });
    }) as typeof fetch;

    try {
      const git = new GithubProvider("oauth-token");
      const repos = await git.listRepositories();
      assert.equal(repos.length, 1);
      assert.equal(repos[0]?.fullName, "acme/demo");
      assert.equal(repos[0]?.isPrivate, true);
      assert.ok(calls.some((u) => u.includes("/user/repos")));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
