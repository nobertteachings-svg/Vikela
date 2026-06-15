import type { ScanFinding } from "@vikela/shared";

const ENCRYPTION_GAPS: Array<{ pattern: RegExp; title: string; severity: ScanFinding["severity"] }> = [
  { pattern: /ssl\s*:\s*false/i, title: "TLS/SSL disabled", severity: "HIGH" },
  { pattern: /rejectUnauthorized\s*:\s*false/i, title: "Certificate validation disabled", severity: "HIGH" },
  { pattern: /sslmode\s*=\s*disable/i, title: "Database SSL disabled", severity: "HIGH" },
  { pattern: /http:\/\//i, title: "Insecure HTTP URL in code", severity: "MEDIUM" },
];

export function scanEncryption(filePath: string, content: string, lines: string[]): ScanFinding[] {
  const findings: ScanFinding[] = [];

  for (const { pattern, title, severity } of ENCRYPTION_GAPS) {
    lines.forEach((line, i) => {
      if (pattern.test(line) && !line.trim().startsWith("//")) {
        findings.push({
          title,
          description: `Missing or disabled encryption configuration in ${filePath}.`,
          severity,
          source: "ENCRYPTION",
          filePath,
          lineNumber: i + 1,
          codeSnippet: line.trim().slice(0, 120),
          remediation:
            "Enforce TLS 1.2+ for all connections. Set ssl: { rejectUnauthorized: true } and use sslmode=require for databases.",
          controlCode: "CC6.7",
        });
      }
    });
  }

  return findings;
}
