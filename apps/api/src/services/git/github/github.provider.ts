import { createHmac, timingSafeEqual } from "crypto";
import type { IGitProvider } from "../provider.interface.js";
import type {
  BranchProtection,
  Collaborator,
  CommitInfo,
  GitFileListing,
  PRComment,
  RemoteRepo,
} from "../types.js";
import { GIT_MAX_LIST_FILES } from "../list-limits.js";

const GITHUB_API = "https://api.github.com";

export class GithubProvider implements IGitProvider {
  constructor(private readonly token: string) {}

  private headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };
  }

  private async fetch<T>(path: string, init?: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25_000);
    try {
      const res = await fetch(`${GITHUB_API}${path}`, {
        ...init,
        signal: controller.signal,
        headers: { ...this.headers(), ...init?.headers },
      });
      if (res.status === 403 || res.status === 429) {
        const retryAfter = Number(res.headers.get("retry-after") ?? "2");
        const waitMs = Number.isFinite(retryAfter) ? Math.min(retryAfter * 1000, 10_000) : 2000;
        await new Promise((r) => setTimeout(r, waitMs));
        const retry = await fetch(`${GITHUB_API}${path}`, {
          ...init,
          headers: { ...this.headers(), ...init?.headers },
        });
        if (!retry.ok) {
          throw new Error(`GitHub API ${path}: ${retry.status} ${await retry.text()}`);
        }
        if (retry.status === 204) return {} as T;
        return retry.json() as Promise<T>;
      }
      if (!res.ok) {
        throw new Error(`GitHub API ${path}: ${res.status} ${await res.text()}`);
      }
      if (res.status === 204) return {} as T;
      return res.json() as Promise<T>;
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        throw new Error(`GitHub API ${path}: timed out after 25s`);
      }
      throw e;
    } finally {
      clearTimeout(timeout);
    }
  }

  async listRepositories(): Promise<RemoteRepo[]> {
    try {
      // Installation tokens: return granted repos even when empty, do not fall through to /user/repos.
      const installRepos = await this.fetchAllPages<{
        id: number;
        name: string;
        full_name: string;
        clone_url: string;
        default_branch: string;
        private: boolean;
      }>("/installation/repositories?per_page=100", "repositories");

      return installRepos.map((r) => this.mapRepo(r));
    } catch {
      // OAuth user tokens cannot call /installation/repositories, list user repos instead.
    }

    const userRepos = await this.fetchAllPages<{
      id: number;
      name: string;
      full_name: string;
      clone_url: string;
      default_branch: string;
      private: boolean;
    }>("/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member");

    return userRepos.map((r) => this.mapRepo(r));
  }

  private async fetchAllPages<T>(initialPath: string, nestedKey?: string): Promise<T[]> {
    const items: T[] = [];
    let path: string | null = initialPath;

    while (path) {
      const pagePath = path;
      const res: Response = await fetch(`${GITHUB_API}${pagePath}`, { headers: this.headers() });
      if (!res.ok) {
        throw new Error(`GitHub API ${pagePath}: ${res.status} ${await res.text()}`);
      }

      const json = (await res.json()) as T[] | Record<string, T[]>;
      const pageItems = Array.isArray(json)
        ? json
        : nestedKey && nestedKey in json
          ? (json[nestedKey] ?? [])
          : [];

      items.push(...pageItems);

      const link: string | null = res.headers.get("link");
      const nextMatch = link?.match(/<([^>]+)>;\s*rel="next"/);
      const next: string | undefined = nextMatch?.[1];
      if (!next) break;

      const nextUrl = new URL(next);
      path = `${nextUrl.pathname}${nextUrl.search}`;
    }

    return items;
  }

  private mapRepo(r: {
    id: number;
    name: string;
    full_name: string;
    clone_url: string;
    default_branch: string;
    private: boolean;
  }): RemoteRepo {
    return {
      externalId: String(r.id),
      name: r.name,
      fullName: r.full_name,
      cloneUrl: r.clone_url,
      defaultBranch: r.default_branch ?? "main",
      isPrivate: r.private,
    };
  }

  async getDefaultBranchSha(repoFullName: string, branch: string): Promise<string> {
    const ref = await this.fetch<{ object: { sha: string } }>(
      `/repos/${repoFullName}/git/ref/heads/${branch}`
    );
    return ref.object.sha;
  }

  async getFileContent(repoFullName: string, filePath: string, ref: string): Promise<string> {
    const data = await this.fetch<{ content: string; encoding: string }>(
      `/repos/${repoFullName}/contents/${filePath}?ref=${ref}`
    );
    if (data.encoding === "base64") {
      return Buffer.from(data.content.replace(/\n/g, ""), "base64").toString("utf8");
    }
    return data.content;
  }

  async listFiles(repoFullName: string, ref: string): Promise<GitFileListing> {
    const sha = ref.length === 40 && /^[a-f0-9]+$/.test(ref)
      ? ref
      : await this.getDefaultBranchSha(repoFullName, ref);

    const tree = await this.fetch<{ tree: Array<{ path: string; type: string }> }>(
      `/repos/${repoFullName}/git/trees/${sha}?recursive=1`
    );
    const files = tree.tree
      .filter((t) => t.type === "blob")
      .map((t) => t.path)
      .slice(0, GIT_MAX_LIST_FILES);
    return { files };
  }

  async getCommits(repoFullName: string, limit: number): Promise<CommitInfo[]> {
    const commits = await this.fetch<
      Array<{ sha: string; commit: { message: string; author: { name: string; date: string } } }>
    >(`/repos/${repoFullName}/commits?per_page=${limit}`);
    return commits.map((c) => ({
      sha: c.sha,
      message: c.commit.message,
      author: c.commit.author.name,
      date: c.commit.author.date,
    }));
  }

  async commentOnPR(repoFullName: string, prNumber: number, comment: PRComment): Promise<void> {
    await this.fetch(`/repos/${repoFullName}/issues/${prNumber}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: comment.body }),
    });
  }

  async commentOnPRReview(
    repoFullName: string,
    prNumber: number,
    comment: PRComment
  ): Promise<void> {
    if (!comment.path || !comment.line || !comment.commitSha) {
      await this.commentOnPR(repoFullName, prNumber, comment);
      return;
    }

    await this.fetch(`/repos/${repoFullName}/pulls/${prNumber}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body: comment.body,
        path: comment.path,
        line: comment.line,
        side: comment.side ?? "RIGHT",
        commit_id: comment.commitSha,
      }),
    });
  }

  async getPRFiles(repoFullName: string, prNumber: number): Promise<string[]> {
    const files = await this.fetch<Array<{ filename: string }>>(
      `/repos/${repoFullName}/pulls/${prNumber}/files`
    );
    return files.map((f) => f.filename);
  }

  verifyWebhookSignature(payload: string, sig: string, secret: string): boolean {
    if (!secret || !sig) return false;
    const expected = `sha256=${createHmac("sha256", secret).update(payload).digest("hex")}`;
    try {
      const sigBuf = Buffer.from(sig);
      const expBuf = Buffer.from(expected);
      if (sigBuf.length !== expBuf.length) return false;
      return timingSafeEqual(sigBuf, expBuf);
    } catch {
      return false;
    }
  }

  async getBranchProtectionRules(repoFullName: string): Promise<BranchProtection> {
    try {
      const protection = await this.fetch<{
        required_pull_request_reviews?: { required_approving_review_count: number };
        enforce_admins?: { enabled: boolean };
      }>(`/repos/${repoFullName}/branches/main/protection`);
      return {
        enabled: true,
        requiredReviews: protection.required_pull_request_reviews?.required_approving_review_count ?? 0,
        enforceAdmins: protection.enforce_admins?.enabled ?? false,
      };
    } catch {
      return { enabled: false, requiredReviews: 0, enforceAdmins: false };
    }
  }

  async getCollaborators(repoFullName: string): Promise<Collaborator[]> {
    const collabs = await this.fetch<Array<{ login: string; role_name?: string }>>(
      `/repos/${repoFullName}/collaborators`
    );
    return collabs.map((c) => ({ login: c.login, role: c.role_name ?? "read" }));
  }
}
