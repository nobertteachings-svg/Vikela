import type {
  AuditEvent,
  BranchProtection,
  Collaborator,
  CommitInfo,
  GitFileListing,
  PRComment,
  RemoteRepo,
} from "./types.js";

export interface IGitProvider {
  listRepositories(): Promise<RemoteRepo[]>;
  getFileContent(repoFullName: string, filePath: string, ref: string): Promise<string>;
  listFiles(repoFullName: string, ref: string): Promise<GitFileListing>;
  getCommits(repoFullName: string, limit: number): Promise<CommitInfo[]>;
  commentOnPR(repoFullName: string, prNumber: number, comment: PRComment): Promise<void>;
  commentOnPRReview?(repoFullName: string, prNumber: number, comment: PRComment): Promise<void>;
  getPRFiles(repoFullName: string, prNumber: number): Promise<string[]>;
  getDefaultBranchSha?(repoFullName: string, branch: string): Promise<string>;
  verifyWebhookSignature(payload: string, sig: string, secret: string): boolean;
  getBranchProtectionRules(repoFullName: string): Promise<BranchProtection>;
  getCollaborators(repoFullName: string): Promise<Collaborator[]>;
  getAuditLog?(orgName: string): Promise<AuditEvent[]>;
}
