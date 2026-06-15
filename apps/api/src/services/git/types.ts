export interface RemoteRepo {
  externalId: string;
  name: string;
  fullName: string;
  cloneUrl: string;
  defaultBranch: string;
  isPrivate: boolean;
}

export interface CommitInfo {
  sha: string;
  message: string;
  author: string;
  date: string;
}

export interface PRComment {
  body: string;
  path?: string;
  line?: number;
  side?: "LEFT" | "RIGHT";
  commitSha?: string;
}

export interface BranchProtection {
  enabled: boolean;
  requiredReviews: number;
  enforceAdmins: boolean;
}

export interface Collaborator {
  login: string;
  role: string;
}

export interface AuditEvent {
  action: string;
  actor: string;
  timestamp: string;
}

/** Result of listing repository paths for scans and stack detection. */
export type GitFileListing = {
  files: string[];
  /** Root-level directory names (Bitbucket browse API). */
  directoryNames?: string[];
};
