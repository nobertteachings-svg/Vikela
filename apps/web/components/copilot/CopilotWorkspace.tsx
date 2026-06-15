"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/comply/page-header";
import { Card, CardBody } from "@/components/comply/card";
import { ComplyButton } from "@/components/comply/button";
import { Send, Bot, User, Loader2, Plus, MessageSquare, BookOpen } from "lucide-react";
import { API_URL, orgHeaders } from "@/lib/api";

interface Thread {
  id: string;
  title: string;
  updatedAt: string;
  messageCount: number;
}

interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
  citations?: { title: string; source: string; excerpt: string }[];
}

function renderMarkdownLite(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, j) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={j}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={j} className="rounded bg-comply-primary px-1 text-comply-purple-border">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

export function CopilotWorkspace() {
  const searchParams = useSearchParams();
  const gapId = searchParams.get("gapId");

  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadThreads = useCallback(async () => {
    const headers = await orgHeaders();
    fetch(`${API_URL}/api/v1/copilot/threads`, { headers })
      .then((r) => r.json())
      .then((j) => setThreads(j.data ?? []));
    fetch(`${API_URL}/api/v1/copilot/suggestions`, { headers })
      .then((r) => r.json())
      .then((j) => setSuggestions(j.data?.suggestions ?? []));
  }, []);

  const loadThread = useCallback(async (id: string) => {
    const headers = await orgHeaders();
    fetch(`${API_URL}/api/v1/copilot/threads/${id}`, { headers })
      .then((r) => r.json())
      .then((j) => {
        if (j.data?.messages) {
          setMessages(
            j.data.messages.map((m: Message) => ({
              id: m.id,
              role: m.role as "user" | "assistant",
              content: m.content,
              citations: m.citations as Message["citations"],
            }))
          );
        }
      });
  }, []);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    if (gapId && !loading && messages.length === 0) {
      explainGap(gapId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gapId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  async function newThread() {
    const headers = await orgHeaders();
    const res = await fetch(`${API_URL}/api/v1/copilot/threads`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: "{}",
    });
    const json = await res.json();
    if (json.data?.id) {
      setActiveThreadId(json.data.id);
      setMessages([]);
      loadThreads();
    }
  }

  async function explainGap(id: string) {
    setLoading(true);
    setError(null);
    try {
      const headers = await orgHeaders();
      const res = await fetch(`${API_URL}/api/v1/copilot/explain-gap/${id}`, {
        method: "POST",
        headers,
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Could not explain this gap");
      }
      if (json.data) {
        setActiveThreadId(json.data.threadId);
        setMessages([
          {
            role: "user",
            content: `Explain this gap`,
          },
          {
            role: "assistant",
            content: json.data.answer,
            citations: json.data.citations,
          },
        ]);
        loadThreads();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not explain this gap");
    } finally {
      setLoading(false);
    }
  }

  async function send(text: string, useStream = true) {
    if (!text.trim() || loading || streaming) return;

    const userMsg: Message = { role: "user", content: text };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setError(null);
    setLoading(true);

    const history = messages.slice(-6).map((m) => ({ role: m.role, content: m.content }));
    const headers = await orgHeaders();

    if (useStream) {
      setStreaming(true);
      setMessages((m) => [...m, { role: "assistant", content: "" }]);

      try {
        const res = await fetch(`${API_URL}/api/v1/copilot/chat/stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify({
            message: text,
            threadId: activeThreadId ?? undefined,
            gapId: gapId ?? undefined,
            history,
          }),
        });

        if (!res.ok) {
          let message = "Chat request failed";
          try {
            const json = await res.json();
            if (json.error) message = json.error;
          } catch {
            message = res.statusText || message;
          }
          throw new Error(message);
        }

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              try {
                const payload = JSON.parse(line.slice(6)) as {
                  delta?: string;
                  done?: boolean;
                  result?: {
                    answer: string;
                    citations: Message["citations"];
                    threadId: string;
                  };
                  error?: string;
                };
                if (payload.delta) {
                  setMessages((m) => {
                    const copy = [...m];
                    const last = copy[copy.length - 1];
                    if (last?.role === "assistant") {
                      copy[copy.length - 1] = {
                        ...last,
                        content: last.content + payload.delta,
                      };
                    }
                    return copy;
                  });
                }
                if (payload.done && payload.result) {
                  setActiveThreadId(payload.result.threadId);
                  setMessages((m) => {
                    const copy = [...m];
                    copy[copy.length - 1] = {
                      role: "assistant",
                      content: payload.result!.answer,
                      citations: payload.result!.citations,
                    };
                    return copy;
                  });
                  loadThreads();
                }
                if (payload.error) throw new Error(payload.error);
              } catch {
                /* skip malformed SSE lines */
              }
            }
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Stream failed");
        setMessages((m) => {
          const copy = [...m];
          const last = copy[copy.length - 1];
          if (last?.role === "assistant" && !last.content.trim()) {
            copy.pop();
          }
          return copy;
        });
      } finally {
        setStreaming(false);
        setLoading(false);
      }
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/v1/copilot/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          message: text,
          threadId: activeThreadId ?? undefined,
          gapId: gapId ?? undefined,
          history,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Chat request failed");
      }
      if (json.data) {
        setActiveThreadId(json.data.threadId);
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: json.data.answer,
            citations: json.data.citations,
          },
        ]);
        loadThreads();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reach the API");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="comply-page">
      <PageHeader
        eyebrow="AI"
        title="Copilot"
        description="Ask about gaps, controls, evidence, and remediation—grounded in your workspace."
        className="border-b-0 pb-4"
      />

      {error ? (
        <p className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-300">{error}</p>
      ) : null}

      <div className="flex h-[calc(100vh-14rem)] gap-6">
      <aside className="hidden w-56 shrink-0 flex-col gap-3 md:flex">
        <ComplyButton variant="secondary" className="w-full gap-2 text-xs" onClick={newThread}>
          <Plus className="h-4 w-4" />
          New chat
        </ComplyButton>
        <div className="flex-1 overflow-y-auto space-y-1">
          {threads.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setActiveThreadId(t.id);
                loadThread(t.id);
              }}
              className={`w-full rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                activeThreadId === t.id
                  ? "bg-comply-purple/20 font-medium text-comply-purple-border nav-active-glow"
                  : "text-comply-text-secondary hover:bg-comply-elevated"
              }`}
            >
              <MessageSquare className="mb-1 inline h-3 w-3" />
              <span className="line-clamp-2">{t.title}</span>
            </button>
          ))}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {gapId && (
          <p className="mb-2 text-xs text-amber-400">
            Explaining gap from Gaps page — context is pinned to this finding.
          </p>
        )}

        <div className="mb-3 flex flex-wrap gap-2">
          {suggestions.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => send(q)}
              disabled={loading || streaming}
              className="rounded-full border border-[var(--border-strong)] bg-comply-elevated px-3 py-1.5 text-xs text-comply-text-secondary transition-colors hover:border-comply-purple-border hover:text-comply-purple-border disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>

        <Card elevated className="relative flex flex-1 flex-col overflow-hidden">
          <CardBody className="relative flex flex-1 flex-col p-0">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Bot className="mb-4 h-12 w-12 text-comply-purple" />
                  <h3 className="text-lg font-semibold text-comply-text-primary">Vikela Copilot</h3>
                  <p className="mt-1 max-w-md text-sm text-comply-text-secondary">
                    Claude-powered assistant with RAG over your gaps, controls, policies, and
                    evidence. Ask how to fix findings or what auditors need.
                  </p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
                  {msg.role === "assistant" && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-comply-purple shadow-[0_2px_8px_var(--purple-glow)]">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-lg px-4 py-3 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-comply-purple text-white"
                        : "border border-[var(--border)] bg-comply-elevated text-comply-text-primary"
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{renderMarkdownLite(msg.content)}</div>
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="mt-3 border-t border-[var(--border)] pt-2">
                        <p className="mb-1 flex items-center gap-1 text-xs text-comply-text-secondary">
                          <BookOpen className="h-3 w-3" />
                          Sources
                        </p>
                        {msg.citations.map((c, j) => (
                          <p key={j} className="text-xs text-comply-text-tertiary">
                            [{c.source}] {c.title}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                  {msg.role === "user" && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-comply-elevated text-comply-text-secondary">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))}
              {(loading || streaming) && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-comply-purple">
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                  </div>
                  <div className="rounded-lg border border-[var(--border)] bg-comply-elevated px-4 py-3 text-sm text-comply-text-secondary">
                    Thinking…
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="border-t border-[var(--border)] p-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send(input);
                }}
                className="flex gap-2"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about gaps, controls, evidence, remediation…"
                  disabled={loading || streaming}
                  className="comply-input flex-1 disabled:opacity-50"
                />
                <ComplyButton type="submit" variant="primary" className="px-3" disabled={loading || streaming}>
                  <Send className="h-4 w-4" />
                </ComplyButton>
              </form>
            </div>
          </CardBody>
        </Card>
      </div>
      </div>
    </div>
  );
}
