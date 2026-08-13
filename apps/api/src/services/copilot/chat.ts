import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "../../lib/prisma.js";
import { buildCopilotContext } from "./context.js";
import { appendMessage, createThread } from "./threads.js";
import type { CopilotChatResult } from "./types.js";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514";

const SYSTEM = (orgName: string) =>
  `You are Vikela Copilot, the AI compliance assistant for ${orgName}. You help teams pass SOC 2, ISO 27001, and related audits.

Rules:
- Ground every answer in the provided org context (gaps, controls, scans, RAG chunks).
- Cite control codes (e.g. CC6.1) when relevant.
- For remediation questions, give numbered, actionable steps (commands, config, priority).
- If a specific gap is in context, explain root cause and fix for that finding.
- Use Markdown. Be concise but thorough.`;

export async function chatWithCopilot(params: {
  orgId: string;
  message: string;
  threadId?: string;
  gapId?: string;
  history?: { role: "user" | "assistant"; content: string }[];
}): Promise<CopilotChatResult> {
  const { orgName, contextBlock, citations } = await buildCopilotContext(
    params.orgId,
    params.message,
    { gapId: params.gapId }
  );

  let threadId = params.threadId;
  if (!threadId) {
    const thread = await createThread(params.orgId);
    threadId = thread.id;
  }

  await appendMessage({ threadId, role: "user", content: params.message });

  let answer: string;
  if (!process.env.ANTHROPIC_API_KEY) {
    answer = demoCopilotReply(params.message, orgName, contextBlock);
  } else {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const messages: Anthropic.MessageParam[] = [
      ...(params.history ?? []).slice(-6).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      {
        role: "user",
        content: `${params.message}\n\n---\nOrg context:\n${contextBlock}`,
      },
    ];

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: SYSTEM(orgName),
      messages,
    });

    const block = response.content.find((b) => b.type === "text");
    answer = block?.type === "text" ? block.text.trim() : demoCopilotReply(params.message, orgName, contextBlock);
  }

  const assistantMsg = await appendMessage({
    threadId,
    role: "assistant",
    content: answer,
    citations,
  });

  return {
    answer,
    citations,
    threadId,
    messageId: assistantMsg.id,
  };
}

export async function* streamCopilotChat(params: {
  orgId: string;
  message: string;
  threadId?: string;
  gapId?: string;
  history?: { role: "user" | "assistant"; content: string }[];
}): AsyncGenerator<{ type: "delta"; text: string } | { type: "done"; result: CopilotChatResult }> {
  const { orgName, contextBlock, citations } = await buildCopilotContext(
    params.orgId,
    params.message,
    { gapId: params.gapId }
  );

  let threadId = params.threadId;
  if (!threadId) {
    const thread = await createThread(params.orgId);
    threadId = thread.id;
  }

  await appendMessage({ threadId, role: "user", content: params.message });

  if (!process.env.ANTHROPIC_API_KEY) {
    const answer = demoCopilotReply(params.message, orgName, contextBlock);
    for (const word of answer.split(" ")) {
      yield { type: "delta", text: `${word} ` };
      await new Promise((r) => setTimeout(r, 12));
    }
    const assistantMsg = await appendMessage({
      threadId,
      role: "assistant",
      content: answer,
      citations,
    });
    yield {
      type: "done",
      result: { answer, citations, threadId, messageId: assistantMsg.id },
    };
    return;
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const messages: Anthropic.MessageParam[] = [
    ...(params.history ?? []).slice(-6).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    {
      role: "user",
      content: `${params.message}\n\n---\nOrg context:\n${contextBlock}`,
    },
  ];

  let fullText = "";
  const stream = anthropic.messages.stream({
    model: MODEL,
    max_tokens: 2048,
    system: SYSTEM(orgName),
    messages,
  });

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      fullText += event.delta.text;
      yield { type: "delta", text: event.delta.text };
    }
  }

  const answer = fullText.trim() || demoCopilotReply(params.message, orgName, contextBlock);
  const assistantMsg = await appendMessage({
    threadId,
    role: "assistant",
    content: answer,
    citations,
  });

  yield {
    type: "done",
    result: { answer, citations, threadId, messageId: assistantMsg.id },
  };
}

export async function explainGap(orgId: string, gapId: string): Promise<CopilotChatResult> {
  const gap = await prisma.gap.findFirst({
    where: { id: gapId, orgId },
    select: { title: true },
  });
  const message = gap
    ? `Explain this compliance gap and how to fix it: "${gap.title}"`
    : "Explain this compliance gap and how to fix it.";

  return chatWithCopilot({ orgId, message, gapId });
}

function demoCopilotReply(message: string, orgName: string, context: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("cc6.1") || lower.includes("mfa") || lower.includes("access")) {
    return `**${orgName}. CC6.1 (Logical access security)**

Based on your open gaps, CC6.1 is likely failing due to **IAM/MFA** issues across cloud and identity providers.

**Recommended fix:**
1. Enforce MFA on all IdP users (Okta / Azure AD / Google Workspace)
2. Enable MFA for AWS IAM users; deny sensitive API calls without \`aws:MultiFactorAuthPresent\`
3. Rotate any exposed secrets found in code scans
4. Upload access review evidence to the Evidence locker and link to control CC6.1

_Ask your admin to enable AI Copilot for richer answers._`;
  }

  if (lower.includes("evidence")) {
    return `**Evidence for SOC 2**

For each in-scope control, auditors expect screenshots of MFA/SSO, IAM policies, monitoring dashboards, plus policy documents.

Use **Evidence** to upload files linked to controls, and **Policies → Generate** for Access Control and Incident Response drafts.`;
  }

  const gapMatch = context.match(/\[CRITICAL\][^\n]+/);
  return `**Vikela Copilot** (${orgName})

${gapMatch ? `**Priority:** ${gapMatch[0]}` : "Review open gaps on the Gaps page."}

**Your question:** ${message}

Answers use your org's gaps, controls, policies, and evidence. AI-assisted reasoning is unavailable until Copilot is configured for this workspace.`;
}
