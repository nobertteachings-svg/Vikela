import type { ScanFinding } from "@vikela/shared";

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

const KNOWN_VULNERABLE: Record<string, { below: string; severity: ScanFinding["severity"]; cve: string }> = {
  lodash: { below: "4.17.21", severity: "MEDIUM", cve: "prototype pollution" },
  axios: { below: "1.6.0", severity: "HIGH", cve: "SSRF/CSRF fixes" },
  jsonwebtoken: { below: "9.0.0", severity: "HIGH", cve: "algorithm confusion" },
  express: { below: "4.19.2", severity: "MEDIUM", cve: "open redirect" },
};

function parseVersion(v: string): number[] {
  return v.replace(/^[\^~]/, "").split(".").map((n) => parseInt(n, 10) || 0);
}

function isBelow(current: string, minimum: string): boolean {
  const a = parseVersion(current);
  const b = parseVersion(minimum);
  for (let i = 0; i < 3; i++) {
    if ((a[i] ?? 0) < (b[i] ?? 0)) return true;
    if ((a[i] ?? 0) > (b[i] ?? 0)) return false;
  }
  return false;
}

export function scanDependencies(filePath: string, content: string): ScanFinding[] {
  if (!filePath.endsWith("package.json")) return [];

  let pkg: PackageJson;
  try {
    pkg = JSON.parse(content) as PackageJson;
  } catch {
    return [];
  }

  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const findings: ScanFinding[] = [];

  for (const [name, version] of Object.entries(deps ?? {})) {
    const rule = KNOWN_VULNERABLE[name];
    if (rule && isBelow(version, rule.below)) {
      findings.push({
        title: `Vulnerable dependency: ${name} ${version}`,
        description: `${name}@${version} is below recommended ${rule.below} (${rule.cve}).`,
        severity: rule.severity,
        source: "CODE",
        filePath,
        codeSnippet: `"${name}": "${version}"`,
        remediation: `Upgrade ${name} to >= ${rule.below}. Enable Dependabot or Renovate.`,
        controlCode: "CC7.4",
      });
    }
  }

  return findings;
}
