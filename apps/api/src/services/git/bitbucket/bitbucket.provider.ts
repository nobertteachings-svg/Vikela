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
    if (!res.ok) throw new Error(`Bitbucket API: ${res.status}`);
    return res.json() as Promise<T>;
  }

  async listRepositories(): Promise<RemoteRepo[]> {
    const data = await this.fetch<{
      values: Array<{
        uuid: string;
        name: string;
        full_name: string;
        links: { clone: Array<{ href: string }> };
        mainbranch?: { name: string };
        is_private: boolean;
      }>;
    }>("https://api.bitbucket.org/2.0/repositories?role=member&pagelen=100");

    return data.values.map((r) => ({
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
    let nextUrl: string | null =
      `https://api.bitbucket.org/2.0/repositories/${workspace}/${slug}/src/${encodedRef}/?pagelen=${ROOT_PAGE_SIZE}`;

    const files: string[] = [];
    const directoryNames: string[] = [];
    let page = 1;

    while (nextUrl && files.length < GIT_MAX_LIST_FILES) {
      const data: BitbucketSrcPage = await this.fetch<BitbucketSrcPage>(nextUrl);

      if (page === 1 && data.values.length === ROOT_PAGE_SIZE && !data.next) {
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
          directoryNames.push(entry.path);
        }
      }

      nextUrl = data.next ?? null;
      page += 1;
    }

    return { files, directoryNames };
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
