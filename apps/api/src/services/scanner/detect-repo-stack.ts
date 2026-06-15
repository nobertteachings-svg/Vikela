export type RepoStack =
  | "nodejs"
  | "nextjs"
  | "python"
  | "go"
  | "java"
  | "terraform"
  | "generic";

export type DetectRepoStackOptions = {
  /** Root-level directory names from browse APIs (e.g. Bitbucket commit_directory). */
  directoryNames?: string[];
};

const ROOT_MANIFESTS: Record<RepoStack, string[]> = {
  nextjs: ["next.config.js", "next.config.mjs", "next.config.ts"],
  nodejs: ["package.json"],
  python: ["requirements.txt", "pyproject.toml", "Pipfile"],
  go: ["go.mod"],
  java: ["pom.xml", "build.gradle", "build.gradle.kts"],
  terraform: ["main.tf", "terraform.tf"],
  generic: [],
};

const NODEJS_DIR_HINTS = new Set([
  "frontend",
  "front-end",
  "packages",
  "apps",
  "web",
  "client",
  "ui",
]);

const TERRAFORM_DIR_HINTS = new Set(["terraform", "infra", "iac", "infrastructure"]);

const PYTHON_DIR_HINTS = new Set(["backend", "api", "services", "server"]);

function stackFromDirectoryHints(directoryNames: string[]): RepoStack | null {
  const topLevel = new Set(
    directoryNames
      .map((d) => d.replace(/^\.\//, "").toLowerCase().split("/")[0])
      .filter(Boolean)
  );

  if ([...topLevel].some((d) => TERRAFORM_DIR_HINTS.has(d))) return "terraform";
  if ([...topLevel].some((d) => NODEJS_DIR_HINTS.has(d))) return "nodejs";
  if ([...topLevel].some((d) => PYTHON_DIR_HINTS.has(d))) return "python";

  return null;
}

/** Detect stack from repo file paths (from git.listFiles — no extra API round-trip). */
export function detectRepoStack(
  filePaths: string[],
  options?: DetectRepoStackOptions
): RepoStack {
  const normalized = new Set(filePaths.map((p) => p.replace(/^\.\//, "").toLowerCase()));
  const has = (name: string) =>
    normalized.has(name.toLowerCase()) ||
    [...normalized].some((p) => p.endsWith(`/${name.toLowerCase()}`));

  if (ROOT_MANIFESTS.nextjs.some(has)) return "nextjs";
  if (ROOT_MANIFESTS.python.some(has)) return "python";
  if (ROOT_MANIFESTS.go.some(has)) return "go";
  if (ROOT_MANIFESTS.java.some(has)) return "java";
  if (ROOT_MANIFESTS.terraform.some(has)) return "terraform";
  if (ROOT_MANIFESTS.nodejs.some(has)) return "nodejs";

  if (options?.directoryNames?.length) {
    const hint = stackFromDirectoryHints(options.directoryNames);
    if (hint) return hint;
  }

  return "generic";
}

export function repoStackLabel(stack: RepoStack): string {
  const labels: Record<RepoStack, string> = {
    nextjs: "Next.js",
    nodejs: "Node.js",
    python: "Python",
    go: "Go",
    java: "Java",
    terraform: "Terraform",
    generic: "your stack",
  };
  return labels[stack];
}
