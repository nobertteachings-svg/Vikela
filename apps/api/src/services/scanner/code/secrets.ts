import type { ScanFinding } from "@vikela/shared";
import { redactCodeSnippet } from "../../../lib/redact-secrets.js";

const SECRET_PATTERNS: Array<{ name: string; regex: RegExp; severity: ScanFinding["severity"] }> = [
  { name: "AWS Access Key", regex: /AKIA[0-9A-Z]{16}/g, severity: "CRITICAL" },
  { name: "Generic API Key", regex: /(?:api[_-]?key|apikey)\s*[:=]\s*['"][^'"]{8,}['"]/gi, severity: "CRITICAL" },
  { name: "Private Key", regex: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/g, severity: "CRITICAL" },
  { name: "Stripe Secret", regex: /sk_live_[0-9a-zA-Z]{24,}/g, severity: "CRITICAL" },
  { name: "GitHub Token", regex: /ghp_[0-9a-zA-Z]{36}/g, severity: "CRITICAL" },
  { name: "Slack Token", regex: /xox[baprs]-[0-9a-zA-Z-]{10,}/g, severity: "HIGH" },
];

function shannonEntropy(str: string): number {
  const freq: Record<string, number> = {};
  for (const c of str) freq[c] = (freq[c] ?? 0) + 1;
  let entropy = 0;
  for (const count of Object.values(freq)) {
    const p = count / str.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

export function scanSecrets(
  filePath: string,
  content: string,
  lines: string[]
): ScanFinding[] {
  const findings: ScanFinding[] = [];

  for (const { name, regex, severity } of SECRET_PATTERNS) {
    regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      const lineNumber = content.slice(0, match.index).split("\n").length;
      findings.push({
        title: `${name} detected`,
        description: `A potential secret was found in ${filePath}.`,
        severity,
        source: "CODE",
        filePath,
        lineNumber,
        codeSnippet: redactCodeSnippet(lines[lineNumber - 1]?.trim().slice(0, 120)) ?? undefined,
        remediation:
          "Remove the secret from code immediately. Rotate the credential. Use environment variables or a secrets manager.",
        controlCode: "CC6.1",
      });
    }
  }

  lines.forEach((line, i) => {
    const assignMatch = line.match(/=\s*['"]([a-zA-Z0-9+/=_-]{20,})['"]/);
    if (assignMatch && shannonEntropy(assignMatch[1]) > 4.5) {
      const lower = line.toLowerCase();
      if (lower.includes("secret") || lower.includes("password") || lower.includes("token")) {
        findings.push({
          title: "High-entropy secret string",
          description: `Possible hardcoded credential in ${filePath}.`,
          severity: "HIGH",
          source: "CODE",
          filePath,
          lineNumber: i + 1,
          codeSnippet: redactCodeSnippet(line.trim().slice(0, 120)) ?? undefined,
          remediation: "Store in a secrets manager. Never commit credentials to version control.",
          controlCode: "CC6.1",
        });
      }
    }
  });

  return findings;
}
