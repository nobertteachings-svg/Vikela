/** Redact likely secrets from code snippets before storage, API responses, or LLM prompts. */

const SECRET_PATTERNS: RegExp[] = [
  /AKIA[0-9A-Z]{16}/g,
  /(?:api[_-]?key|apikey)\s*[:=]\s*['"][^'"]{8,}['"]/gi,
  /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/g,
  /sk_live_[0-9a-zA-Z]{24,}/g,
  /sk_test_[0-9a-zA-Z]{24,}/g,
  /ghp_[0-9a-zA-Z]{36}/g,
  /gho_[0-9a-zA-Z]{36}/g,
  /xox[baprs]-[0-9a-zA-Z-]{10,}/g,
  /Bearer\s+[a-zA-Z0-9._-]{20,}/gi,
  /password\s*[:=]\s*['"][^'"]{4,}['"]/gi,
  /secret\s*[:=]\s*['"][^'"]{8,}['"]/gi,
  /token\s*[:=]\s*['"][^'"]{12,}['"]/gi,
];

const REDACTED_PLACEHOLDER = "[REDACTED — sensitive value removed]";

export function redactCodeSnippet(snippet: string | null | undefined): string | null {
  if (!snippet) return snippet ?? null;

  let redacted = snippet;
  let found = false;

  for (const pattern of SECRET_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(redacted)) {
      found = true;
      pattern.lastIndex = 0;
      redacted = redacted.replace(pattern, REDACTED_PLACEHOLDER);
    }
  }

  // High-entropy quoted strings (likely credentials)
  const assignMatch = redacted.match(/=\s*['"]([a-zA-Z0-9+/=_-]{24,})['"]/);
  if (assignMatch) {
    const lower = redacted.toLowerCase();
    if (
      lower.includes("secret") ||
      lower.includes("password") ||
      lower.includes("token") ||
      lower.includes("key")
    ) {
      found = true;
      redacted = redacted.replace(/=\s*['"][^'"]{8,}['"]/, "= '[REDACTED]'");
    }
  }

  if (found) return redacted.slice(0, 120);
  return snippet.slice(0, 120);
}
