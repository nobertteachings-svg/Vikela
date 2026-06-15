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
import { extractNextUrl } from "./link-header.js";
import { GIT_MAX_LIST_FILES } from "../list-limits.js";

const GITLAB_HOST = process.env.GITLAB_HOST ?? "https://gitlab.com";
const TREE_PER_PAGE = 100;

type GitLabTreeEntry = { path: string; type: string };

export class GitlabProvider implements IGitProvider {
  constructor(
    private readonly token: string,
    private readonly host: string = GITLAB_HOST
  ) {}

  private authHeaders(init?: RequestInit): Record<string, string> {
    const extra = init?.headers;
    const merged: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
    };
    if (extra && typeof extra === "object" && !Array.isArray(extra)) {
      for (const [key, value] of Object.entries(extra)) {
        if (typeof value === "string") merged[key] = value;
      }
    }
    return merged;
  }

  private resolveUrl(pathOrUrl: string): string {
    return pathOrUrl.startsWith("http") ? pathOrUrl : `${this.host}/api/v4${pathOrUrl}`;
  }

  private async fetchWithHeaders<T>(
    pathOrUrl: string,
    init?: RequestInit
  ): Promise<{ data: T; headers: Headers }> {
    const res = await fetch(this.resolveUrl(pathOrUrl), {
      ...init,
      headers: this.authHeaders(init),
    });
    if (!res.ok) {
      throw new Error(`GitLab API ${pathOrUrl}: ${res.status}`);
    }
    const data = (await res.json()) as T;
    return { data, headers: res.headers };
  }

  private async fetch<T>(path: string, init?: RequestInit): Promise<T> {
    const { data } = await this.fetchWithHeaders<T>(path, init);
    return data;
  }

  async listRepositories(): Promise<RemoteRepo[]> {
    const projects = await this.fetch<
      Array<{
        id: number;
        name: string;
        path_with_namespace: string;
        http_url_to_repo: string;
        default_branch: string;
        visibility: string;
      }>
    >("/projects?membership=true&per_page=100");

    return projects.map((p) => ({
      externalId: String(p.id),
      name: p.name,
      fullName: p.path_with_namespace,
      cloneUrl: p.http_url_to_repo,
      defaultBranch: p.default_branch ?? "main",
      isPrivate: p.visibility !== "public",
    }));
  }

  async getDefaultBranchSha(repoFullName: string, branch: string): Promise<string> {
    const projectId = encodeURIComponent(repoFullName);
    const branchInfo = await this.fetch<{ commit: { id: string } }>(
      `/projects/${projectId}/repository/branches/${encodeURIComponent(branch)}`
    );
    return branchInfo.commit.id;
  }

  async getFileContent(repoFullName: string, filePath: string, ref: string): Promise<string> {
    const projectId = encodeURIComponent(repoFullName);
    const file = await this.fetch<{ content: string; encoding: string }>(
      `/projects/${projectId}/repository/files/${encodeURIComponent(filePath)}?ref=${ref}`
    );
    if (file.encoding === "base64") {
      return Buffer.from(file.content, "base64").toString("utf8");
    }
    return file.content;
  }

  async listFiles(repoFullName: string, ref: string): Promise<GitFileListing> {
    const projectId = encodeURIComponent(repoFullName);
    const encodedRef = encodeURIComponent(ref);
    let nextUrl: string | null =
      `/projects/${projectId}/repository/tree?ref=${encodedRef}&recursive=true&per_page=${TREE_PER_PAGE}&pagination=keyset`;

    const files: string[] = [];
    let page = 1;

    while (nextUrl && files.length < GIT_MAX_LIST_FILES) {
      const { data, headers } = await this.fetchWithHeaders<GitLabTreeEntry[]>(nextUrl);
      const nextLink = extractNextUrl(headers.get("Link"));

      if (page === 1 && data.length === TREE_PER_PAGE && !nextLink) {
        console.warn(
          JSON.stringify({
            event: "gitlab_list_truncated_no_link",
            repoFullName,
            ref,
            entriesOnPage: data.length,
          })
        );
      }

      for (const entry of data) {
        if (entry.type === "blob") {
          files.push(entry.path);
          if (files.length >= GIT_MAX_LIST_FILES) break;
        }
      }

      nextUrl = nextLink;
      page += 1;
    }

    return { files };
  }

  async getCommits(repoFullName: string, limit: number): Promise<CommitInfo[]> {
    const projectId = encodeURIComponent(repoFullName);
    const commits = await this.fetch<
      Array<{ id: string; title: string; author_name: string; created_at: string }>
    >(`/projects/${projectId}/repository/commits?per_page=${limit}`);
    return commits.map((c) => ({
      sha: c.id,
      message: c.title,
      author: c.author_name,
      date: c.created_at,
    }));
  }

  async commentOnPR(repoFullName: string, prNumber: number, comment: PRComment): Promise<void> {
    const projectId = encodeURIComponent(repoFullName);
    await this.fetch(`/projects/${projectId}/merge_requests/${prNumber}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: comment.body }),
    });
  }

  async getPRFiles(repoFullName: string, prNumber: number): Promise<string[]> {
    const projectId = encodeURIComponent(repoFullName);
    const mr = await this.fetch<{ changes: Array<{ new_path: string }> }>(
      `/projects/${projectId}/merge_requests/${prNumber}/changes`
    );
    return mr.changes.map((c) => c.new_path);
  }

  verifyWebhookSignature(payload: string, sig: string, secret: string): boolean {
    const expected = createHmac("sha256", secret).update(payload).digest("hex");
    try {
      return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    } catch {
      return false;
    }
  }

  async getBranchProtectionRules(_repoFullName: string): Promise<BranchProtection> {
    return { enabled: false, requiredReviews: 0, enforceAdmins: false };
  }

  async getCollaborators(_repoFullName: string): Promise<Collaborator[]> {
    return [];
  }
}
