import type { ScanFinding } from "@vikela/shared";

const PHI_PATTERNS: Array<{ name: string; regex: RegExp; severity: ScanFinding["severity"] }> = [
  { name: "SSN in source code", regex: /\b\d{3}-\d{2}-\d{4}\b/g, severity: "CRITICAL" },
  { name: "Medical record number pattern", regex: /\bMRN[:\s#-]*\d{6,12}\b/gi, severity: "HIGH" },
  { name: "PHI logged to console", regex: /console\.(log|info|debug)\([^)]*(?:patient|diagnosis|phi|ssn|mrn)/gi, severity: "HIGH" },
];

const HIPAA_KEYWORDS = /(?:protected\s*health|ePHI|HIPAA|patient\s*data|medical\s*record)/i;

export function scanHipaaCode(
  filePath: string,
  content: string,
  _lines: string[]
): ScanFinding[] {
  const findings: ScanFinding[] = [];

  for (const { name, regex, severity } of PHI_PATTERNS) {
    regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      const lineNumber = content.slice(0, match.index).split("\n").length;
      findings.push({
        title: `HIPAA: ${name}`,
        description: `Potential PHI exposure in ${filePath}. HIPAA requires safeguards for ePHI (§164.312).`,
        severity,
        source: "CODE",
        filePath,
        lineNumber,
        remediation:
          "Remove PHI from code and logs. Use tokenization or secure vaults. Ensure BAA with any vendor processing PHI.",
        controlCode: "HIPAA-164.312.e2",
      });
    }
  }

  if (HIPAA_KEYWORDS.test(content) && /(?:password|secret|api[_-]?key)\s*[:=]\s*['"][^'"]+['"]/i.test(content)) {
    findings.push({
      title: "HIPAA: Credentials near health data references",
      description: `Hardcoded credentials found in file referencing health data: ${filePath}.`,
      severity: "HIGH",
      source: "CODE",
      filePath,
      remediation: "Store credentials in a secrets manager. Segregate PHI systems from general infrastructure.",
      controlCode: "HIPAA-164.312.a1",
    });
  }

  return findings;
}

export function scanPciCode(
  filePath: string,
  content: string,
  _lines: string[]
): ScanFinding[] {
  const findings: ScanFinding[] = [];

  const panPatterns = [
    { name: "Credit card number (PAN)", regex: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\b/g, severity: "CRITICAL" as const },
    { name: "CVV/CVC storage", regex: /\b(?:cvv|cvc|card.?verification)\s*[:=]\s*['"]?\d{3,4}/gi, severity: "CRITICAL" as const },
  ];

  for (const { name, regex, severity } of panPatterns) {
    regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      const lineNumber = content.slice(0, match.index).split("\n").length;
      findings.push({
        title: `PCI DSS: ${name}`,
        description: `Payment card data detected in ${filePath}. PCI DSS prohibits storing sensitive authentication data.`,
        severity,
        source: "CODE",
        filePath,
        lineNumber,
        remediation:
          "Never store PAN, CVV, or track data in code. Use a PCI-validated payment processor and tokenization.",
        controlCode: "PCI-3.4",
      });
    }
  }

  return findings;
}

export function scanGdprCode(
  filePath: string,
  content: string,
  _lines: string[]
): ScanFinding[] {
  const findings: ScanFinding[] = [];

  if (/(?:email|user\.email|personalData|pii)/i.test(content) && !/(?:consent|gdpr|privacy|lawful)/i.test(content)) {
    if (/analytics|tracking|segment|mixpanel|google.*analytics/i.test(content)) {
      findings.push({
        title: "GDPR: Analytics without consent reference",
        description: `Tracking/analytics code in ${filePath} without visible consent mechanism.`,
        severity: "MEDIUM",
        source: "CODE",
        filePath,
        remediation: "Implement consent banner before non-essential tracking. Document lawful basis (Art. 6).",
        controlCode: "GDPR-Art7",
      });
    }
  }

  if (/console\.(log|info)\([^)]*(?:email|phone|address|ip_address|user_id)/i.test(content)) {
    findings.push({
      title: "GDPR: Personal data in application logs",
      description: "Personal data may be logged without purpose limitation or retention controls.",
      severity: "HIGH",
      source: "CODE",
      filePath,
      remediation: "Redact PII from logs. Define retention periods per GDPR Art. 5(1)(e).",
      controlCode: "GDPR-Art32",
    });
  }

  return findings;
}

export function scanIso27001Code(filePath: string, content: string): ScanFinding[] {
  if (/(?:chmod\s+777|0o777|public-read-write|acl\s*=\s*public-read)/i.test(content)) {
    return [{
      title: "ISO 27001: Overly permissive access configuration",
      description: `Public or world-writable access configured in ${filePath}.`,
      severity: "HIGH",
      source: "CODE",
      filePath,
      remediation: "Apply least privilege per ISO 27001 A.5.15 and A.8.5.",
      controlCode: "ISO-A.8.5",
    }];
  }
  return [];
}

export function scanFedRampCode(filePath: string, content: string): ScanFinding[] {
  if (/(?:ssl_protocols.*TLSv1[^2]|TLSv1\.0|TLSv1\.1|DES|MD5|RC4)/i.test(content)) {
    return [{
      title: "FedRAMP: Weak cryptography configuration",
      description: `Deprecated crypto/TLS configuration in ${filePath}. FedRAMP requires FIPS-validated algorithms.`,
      severity: "HIGH",
      source: "CODE",
      filePath,
      remediation: "Use TLS 1.2+ and FIPS 140-2 validated modules (SC-13).",
      controlCode: "SC-13",
    }];
  }
  return [];
}

export function scanCmmcCode(filePath: string, content: string): ScanFinding[] {
  if (/(?:CUI|controlled.unclassified)/i.test(content) && /(?:public|0\.0\.0\.0\/0|anywhere)/i.test(content)) {
    return [{
      title: "CMMC: CUI environment with public exposure",
      description: `CUI-related configuration with public network access in ${filePath}.`,
      severity: "CRITICAL",
      source: "CODE",
      filePath,
      remediation: "Segment CUI systems. Restrict boundary access per SC.L2-3.13.1.",
      controlCode: "SC.L2-3.13.1",
    }];
  }
  return [];
}

/** Run framework-specific code scans based on enrolled frameworks. */
export function runFrameworkCodeScans(
  frameworkSlugs: string[],
  filePath: string,
  content: string,
  lines: string[]
): ScanFinding[] {
  const slugs = new Set(frameworkSlugs);
  const out: ScanFinding[] = [];

  if (slugs.has("hipaa")) out.push(...scanHipaaCode(filePath, content, lines));
  if (slugs.has("pci-dss")) out.push(...scanPciCode(filePath, content, lines));
  if (slugs.has("gdpr")) out.push(...scanGdprCode(filePath, content, lines));
  if (slugs.has("iso27001") || slugs.has("iso42001")) out.push(...scanIso27001Code(filePath, content));
  if (slugs.has("fedramp")) out.push(...scanFedRampCode(filePath, content));
  if (slugs.has("cmmc")) out.push(...scanCmmcCode(filePath, content));

  return out;
}
