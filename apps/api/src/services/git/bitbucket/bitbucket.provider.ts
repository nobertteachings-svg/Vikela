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

const ROOT_PAGE_SIZE = 100;

type BitbucketSrcEntry = { path: string; type: string };

type BitbucketSrcPage = {
  pagelen?: number;
  next?: string;
  values: BitbucketSrcEntry[];
};

type BitbucketRepo = {
  uuid: string;
  name: string;
  full_name: string;
  links: { clone: Array<{ href: string }> };
  mainbranch?: { name: string };
  is_private: boolean;
};

type BitbucketPage<T> = {
  values: T[];
  next?: string;
};

export class BitbucketProvider implements IGitProvider {
  constructor(private readonly token: string) {}

  private async fetch<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/json",
        ...init?.headers,
      },
    });
    if (!res.ok) {
      let detail = "";
      try {
        const body = (await res.json()) as {
          error?: { message?: string; detail?: string };
        };
        detail = body.error?.message ?? body.error?.detail ?? "";
      } catch {
        /* ignore */
      }
      throw new Error(
        detail
          ? `Bitbucket API: ${res.status} — ${detail}`
          : `Bitbucket API: ${res.status}`
      );
    }
    return res.json() as Promise<T>;
  }

  /** Paginate a Bitbucket collection endpoint. */
  private async fetchAllPages<T>(startUrl: string): Promise<T[]> {
    const out: T[] = [];
    let nextUrl: string | null = startUrl;
    while (nextUrl) {
      const page: BitbucketPage<T> = await this.fetch<BitbucketPage<T>>(nextUrl);
      out.push(...(page.values ?? []));
      nextUrl = page.next ?? null;
    }
    return out;
  }

  /**
   * Cross-workspace GET /2.0/repositories?role=… was removed (CHANGE-2770 → HTTP 410).
   * Discover workspaces, then list repos per workspace.
   */
  async listRepositories(): Promise<RemoteRepo[]> {
    const workspaces = await this.fetchAllPages<{
      slug?: string;
      uuid?: string;
      workspace?: { slug?: string; uuid?: string };
    }>("https://api.bitbucket.org/2.0/user/workspaces?pagelen=100");

    const workspaceSlugs = workspaces
      .map((w) => w.workspace?.slug ?? w.slug)
      .filter((s): s is string => Boolean(s));

    if (workspaceSlugs.length === 0) {
      return [];
    }

    const repos: BitbucketRepo[] = [];
    for (const slug of workspaceSlugs) {
      const pageRepos = await this.fetchAllPages<BitbucketRepo>(
        `https://api.bitbucket.org/2.0/repositories/${encodeURIComponent(slug)}?pagelen=100`
      );
      repos.push(...pageRepos);
    }

    return repos.map((r) => ({
      externalId: r.uuid,
      name: r.name,
      fullName: r.full_name,
      cloneUrl: r.links.clone.find((l) => l.href.includes("https"))?.href ?? "",
      defaultBranch: r.mainbranch?.name ?? "main",
      isPrivate: r.is_private,
    }));
  }

  async getFileContent(repoFullName: string, filePath: string, ref: string): Promise<string> {
    const [workspace, slug] = repoFullName.split("/");
    const res = await fetch(
      `https://api.bitbucket.org/2.0/repositories/${workspace}/${slug}/src/${ref}/${filePath}`,
      { headers: { Authorization: `Bearer ${this.token}` } }
    );
    return res.text();
  }

  async listFiles(repoFullName: string, ref: string): Promise<GitFileListing> {
    const [workspace, slug] = repoFullName.split("/");
    const encodedRef = encodeURIComponent(ref);
    const base = `https://api.bitbucket.org/2.0/repositories/${workspace}/${slug}/src/${encodedRef}`;

    const files: string[] = [];
    const directoryNames: string[] = [];
    const dirQueue: string[] = [""];

    while (dirQueue.length > 0 && files.length < GIT_MAX_LIST_FILES) {
      const dir = dirQueue.shift()!;
      if (dir) directoryNames.push(dir);

      const dirPath = dir ? `${dir.replace(/^\/+|\/+$/g, "")}/` : "";
      let nextUrl: string | null = `${base}/${dirPath}?pagelen=${ROOT_PAGE_SIZE}`;
      let page = 1;

      while (nextUrl && files.length < GIT_MAX_LIST_FILES) {
        const data: BitbucketSrcPage = await this.fetch<BitbucketSrcPage>(nextUrl);

        if (page === 1 && !dir && data.values.length === ROOT_PAGE_SIZE && !data.next) {
          console.warn(
            JSON.stringify({
              event: "bitbucket_list_truncated_no_next",
              repoFullName,
              ref,
              entriesOnPage: data.values.length,
            })
          );
        }

        for (const entry of data.values) {
          if (entry.type === "commit_file") {
            files.push(entry.path);
            if (files.length >= GIT_MAX_LIST_FILES) break;
          } else if (entry.type === "commit_directory") {
            dirQueue.push(entry.path);
          }
        }

        nextUrl = data.next ?? null;
        page += 1;
      }
    }

    return { files: files.slice(0, GIT_MAX_LIST_FILES), directoryNames };
  }

  async getCommits(repoFullName: string, limit: number): Promise<CommitInfo[]> {
    const [workspace, slug] = repoFullName.split("/");
    const data = await this.fetch<{
      values: Array<{ hash: string; message: string; author: { raw: string }; date: string }>;
    }>(
      `https://api.bitbucket.org/2.0/repositories/${workspace}/${slug}/commits?pagelen=${limit}`
    );
    return data.values.map((c) => ({
      sha: c.hash,
      message: c.message,
      author: c.author.raw,
      date: c.date,
    }));
  }

  async commentOnPR(repoFullName: string, prNumber: number, comment: PRComment): Promise<void> {
    const [workspace, slug] = repoFullName.split("/");
    await this.fetch(
      `https://api.bitbucket.org/2.0/repositories/${workspace}/${slug}/pullrequests/${prNumber}/comments`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: { raw: comment.body } }),
      }
    );
  }

  async getPRFiles(repoFullName: string, prNumber: number): Promise<string[]> {
    const [workspace, slug] = repoFullName.split("/");
    const pr = await this.fetch<{ source: { commit: { hash: string } } }>(
      `https://api.bitbucket.org/2.0/repositories/${workspace}/${slug}/pullrequests/${prNumber}`
    );
    const diff = await this.fetch<{ values: Array<{ new?: { path: string } }> }>(
      `https://api.bitbucket.org/2.0/repositories/${workspace}/${slug}/diff/${workspace}/${slug}:${pr.source.commit.hash}`
    ).catch(() => ({ values: [] }));
    return diff.values.map((d) => d.new?.path).filter(Boolean) as string[];
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
