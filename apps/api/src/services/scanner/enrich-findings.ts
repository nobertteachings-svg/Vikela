import type { ScanFinding } from "@vikela/shared";
import { generateRemediation } from "../../lib/claude.js";

export async function enrichFindingsWithRemediation(
  findings: ScanFinding[],
  orgName: string
): Promise<ScanFinding[]> {
  const enriched: ScanFinding[] = [];

  for (const finding of findings) {
    let remediation = finding.remediation;
    try {
      remediation = await generateRemediation({
        orgName,
        findingTitle: finding.title,
        findingDescription: finding.description,
        filePath: finding.filePath,
        lineNumber: finding.lineNumber,
        codeSnippet: finding.codeSnippet,
        controlCode: finding.controlCode,
      });
    } catch {
      // Keep default remediation from scanner
    }
    enriched.push({ ...finding, remediation });
  }

  return enriched;
}
