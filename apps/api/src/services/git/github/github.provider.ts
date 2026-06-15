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
    const res = await fetch(`${GITHUB_API}${path}`, {
      ...init,
      headers: { ...this.headers(), ...init?.headers },
    });
    if (!res.ok) {
      throw new Error(`GitHub API ${path}: ${res.status} ${await res.text()}`);
    }
    if (res.status === 204) return {} as T;
    return res.json() as Promise<T>;
  }

  async listRepositories(): Promise<RemoteRepo[]> {
    try {
      const installData = await this.fetch<{
        repositories: Array<{
          id: number;
          name: string;
          full_name: string;
          clone_url: string;
          default_branch: string;
          private: boolean;
        }>;
        total_count?: number;
      }>("/installation/repositories?per_page=100");

      const list = installData.repositories ?? [];
      if (list.length > 0) {
        return list.map((r) => this.mapRepo(r));
      }
    } catch {
      // Fall through to user repos (OAuth token)
    }

    const userRepos = await this.fetch<
      Array<{
        id: number;
        name: string;
        full_name: string;
        clone_url: string;
        default_branch: string;
        private: boolean;
      }>
    >("/user/repos?per_page=100&sort=updated");

    return userRepos.map((r) => this.mapRepo(r));
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
