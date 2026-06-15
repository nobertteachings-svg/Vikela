import type { ScanFinding } from "@vikela/shared";

export function scanAccess(filePath: string, content: string, lines: string[]): ScanFinding[] {
  const findings: ScanFinding[] = [];

  if (/middleware|guard|authorize|authenticate/i.test(filePath)) return findings;

  const routeWithoutAuth = lines.some(
    (l, i) =>
      /app\.(get|post|put|delete|patch)\(['"]\/api/i.test(l) &&
      !lines.slice(Math.max(0, i - 5), i + 5).some((n) => /auth|guard|protect|clerk|jwt/i.test(n))
  );

  if (routeWithoutAuth && /routes?\/|api\//i.test(filePath)) {
      findings.push({
      title: "API route may lack authentication middleware",
      description: `Route definitions in ${filePath} may be missing authentication guards.`,
      severity: "MEDIUM",
      source: "CODE",
      filePath,
      remediation: "Apply authentication middleware to all non-public API routes. Map to CC6.1.",
      controlCode: "CC6.1",
    });
  }

  if (/cors\(\s*\{[^}]*origin:\s*['"]?\*['"]?/i.test(content)) {
    findings.push({
      title: "CORS allows all origins",
      description: "Wildcard CORS origin permits cross-site requests from any domain.",
      severity: "MEDIUM",
      source: "CODE",
      filePath,
      remediation: "Restrict CORS to known application origins only.",
      controlCode: "CC6.6",
    });
  }

  return findings;
}
