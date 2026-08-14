import Anthropic from "@anthropic-ai/sdk";
import { redactCodeSnippet } from "./redact-secrets.js";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514";
/** Per-call timeout, hung Anthropic requests must not stall BullMQ scans. */
const REMEDIATION_TIMEOUT_MS = 20_000;

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }
  client ??= new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    timeout: REMEDIATION_TIMEOUT_MS,
  });
  return client;
}

export async function generateRemediation(params: {
  orgName: string;
  findingTitle: string;
  findingDescription: string;
  filePath?: string;
  lineNumber?: number;
  codeSnippet?: string;
  controlCode?: string;
  frameworkContext?: string;
}): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return defaultRemediation(params);
  }

  const anthropic = getClient();
  const response = await anthropic.messages.create(
    {
      model: MODEL,
      max_tokens: 1024,
      system: `You are Shieldoq, a compliance copilot for ${params.orgName}. Write clear, actionable remediation steps for security findings mapped to SOC 2 / ISO 27001. Be specific about commands, config changes, and priority. Keep under 200 words.`,
      messages: [
        {
          role: "user",
          content: `Finding: ${params.findingTitle}
Description: ${params.findingDescription}
${params.filePath ? `File: ${params.filePath}${params.lineNumber ? `:${params.lineNumber}` : ""}` : ""}
${params.codeSnippet ? `Code:\n\`\`\`\n${redactCodeSnippet(params.codeSnippet)}\n\`\`\`` : ""}
${params.controlCode ? `Control: ${params.controlCode}` : ""}
${params.frameworkContext ?? ""}

Provide remediation steps.`,
        },
      ],
    },
    { timeout: REMEDIATION_TIMEOUT_MS }
  );

  const block = response.content.find((b) => b.type === "text");
  return block?.type === "text" ? block.text.trim() : defaultRemediation(params);
}

function defaultRemediation(params: {
  findingTitle: string;
  controlCode?: string;
}): string {
  return `Review and fix: ${params.findingTitle}. ${params.controlCode ? `Maps to control ${params.controlCode}.` : ""} Rotate any exposed credentials, add automated scanning in CI, and document the change for your audit trail.`;
}
