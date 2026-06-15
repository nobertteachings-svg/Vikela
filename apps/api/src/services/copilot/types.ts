export interface CopilotCitation {
  chunkId?: string;
  title: string;
  source: string;
  excerpt: string;
}

export interface CopilotChatResult {
  answer: string;
  citations: CopilotCitation[];
  threadId: string;
  messageId: string;
}
