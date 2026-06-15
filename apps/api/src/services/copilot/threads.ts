import { prisma } from "../../lib/prisma.js";

export async function listThreads(orgId: string) {
  return prisma.copilotThread.findMany({
    where: { orgId },
    orderBy: { updatedAt: "desc" },
    take: 30,
    include: {
      messages: { orderBy: { createdAt: "asc" }, take: 1 },
      _count: { select: { messages: true } },
    },
  });
}

export async function getThread(threadId: string, orgId: string) {
  return prisma.copilotThread.findFirst({
    where: { id: threadId, orgId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
}

export async function createThread(orgId: string, title?: string) {
  return prisma.copilotThread.create({
    data: { orgId, title: title ?? "New conversation" },
  });
}

export async function appendMessage(params: {
  threadId: string;
  role: "user" | "assistant";
  content: string;
  citations?: unknown;
}) {
  const msg = await prisma.copilotMessage.create({
    data: {
      threadId: params.threadId,
      role: params.role,
      content: params.content,
      citations: params.citations ?? undefined,
    },
  });

  const preview = params.content.slice(0, 80);
  await prisma.copilotThread.update({
    where: { id: params.threadId },
    data: {
      updatedAt: new Date(),
      ...(params.role === "user"
        ? { title: preview.length > 60 ? `${preview.slice(0, 57)}…` : preview }
        : {}),
    },
  });

  return msg;
}
