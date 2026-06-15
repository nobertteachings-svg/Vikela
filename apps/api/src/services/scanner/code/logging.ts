import type { ScanFinding } from "@vikela/shared";

export function scanLogging(filePath: string, _content: string, lines: string[]): ScanFinding[] {
  const findings: ScanFinding[] = [];

  if (!/auth|login|session|password/i.test(filePath)) return findings;

  const hasLogging = lines.some(
    (l) =>
      /logger\.|console\.(log|info|warn|error)|winston|pino|bunyan/i.test(l) &&
      !/\/\/.*logger/.test(l)
  );
  const hasTodoLogging = lines.some((l) => /\/\/\s*TODO:?\s*add logging/i.test(l));

  if (hasTodoLogging || (!hasLogging && /router\.(post|put)|app\.(post|put)/i.test(lines.join("\n")))) {
    findings.push({
      title: "Missing audit logging on sensitive route",
      description: `Authentication or sensitive routes in ${filePath} lack structured security logging.`,
      severity: "HIGH",
      source: "LOGGING",
      filePath,
      lineNumber: lines.findIndex((l) => /TODO:?\s*add logging|router\.(post|put)/i.test(l)) + 1 || 1,
      codeSnippet: lines.find((l) => /TODO|router\.post/i.test(l))?.trim().slice(0, 120),
      remediation:
        "Log all auth events (success/failure) with timestamp, IP, user ID. Ship to SIEM. Maps to CC7.1.",
      controlCode: "CC7.1",
    });
  }

  return findings;
}
