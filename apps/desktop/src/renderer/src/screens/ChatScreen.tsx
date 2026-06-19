import {
  Bot,
  Code2,
  CopyCheck,
  Database,
  Maximize2,
  MessageSquarePlus,
  Paintbrush,
  Send,
  SlidersHorizontal,
  Smartphone,
  Trash2
} from "lucide-react";
import type { ElementType } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import type {
  AssistantMode,
  ChatMessage,
  ChatStreamEvent,
  ChatSummary,
  KnowledgeSource,
  ProjectSummary
} from "../../../shared/types";
import { Button } from "../components/Button";
import { MarkdownMessage } from "../components/MarkdownMessage";

const MODES: Array<{ value: AssistantMode; label: string }> = [
  { value: "general", label: "General" },
  { value: "tailwind", label: "Tailwind" },
  { value: "react-next", label: "React / Next" },
  { value: "shopify-liquid", label: "Shopify" },
  { value: "shopline", label: "Shopline" },
  { value: "pixel-perfect", label: "Pixel Perfect" },
  { value: "responsive", label: "Responsive" },
  { value: "ui-ux-review", label: "UI/UX Review" }
];

export function ChatScreen({
  chats,
  sources,
  projects,
  activeChatId,
  activeProjectId,
  prefillPrompt,
  onPrefillConsumed,
  onSelectChat,
  onSelectProject,
  onCreateChat,
  onDeleteChat,
  onRefresh
}: {
  chats: ChatSummary[];
  sources: KnowledgeSource[];
  projects: ProjectSummary[];
  activeChatId?: string;
  activeProjectId?: string;
  prefillPrompt: string;
  onPrefillConsumed: () => void;
  onSelectChat: (chatId: string) => void;
  onSelectProject: (projectId: string | undefined) => void;
  onCreateChat: (mode: AssistantMode) => Promise<ChatSummary>;
  onDeleteChat: (chatId: string) => Promise<void>;
  onRefresh: () => Promise<void>;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [mode, setMode] = useState<AssistantMode>("general");
  const [input, setInput] = useState("");
  const [uncheckedSourceIds, setUncheckedSourceIds] = useState<string[]>([]);
  const [sourcePanelOpen, setSourcePanelOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [activeRequestId, setActiveRequestId] = useState<string>();
  const activeRequestRef = useRef<string>();
  const [streamingText, setStreamingText] = useState("");
  const [streamStatus, setStreamStatus] = useState("");
  const [streamSources, setStreamSources] = useState<ChatStreamEvent["sources"]>([]);
  const messageListRef = useRef<HTMLDivElement | null>(null);

  const activeChat = useMemo(() => chats.find((chat) => chat.id === activeChatId), [activeChatId, chats]);
  const selectedSourceIds = useMemo(
    () => sources.filter((source) => !uncheckedSourceIds.includes(source.id)).map((source) => source.id),
    [sources, uncheckedSourceIds]
  );

  useEffect(() => {
    if (!activeChatId) {
      setMessages([]);
      return;
    }
    window.frontendAgent.chats.messages(activeChatId).then(setMessages).catch(console.error);
    const chat = chats.find((item) => item.id === activeChatId);
    if (chat) setMode(chat.mode);
  }, [activeChatId, chats]);

  useEffect(() => {
    if (!prefillPrompt) return;
    setInput(prefillPrompt);
    onPrefillConsumed();
  }, [prefillPrompt, onPrefillConsumed]);

  useEffect(() => {
    activeRequestRef.current = activeRequestId;
  }, [activeRequestId]);

  useEffect(() => {
    return window.frontendAgent.chats.onStream((event) => {
      if (event.requestId !== activeRequestRef.current) return;
      if (event.sources) setStreamSources(event.sources);
      if (typeof event.status === "string") setStreamStatus(event.status);
      if (event.delta) setStreamingText((text) => text + event.delta);
      if (event.error) {
        setStreamingText(event.error);
        setStreamStatus("");
        setSending(false);
      }
      if (event.done) {
        setSending(false);
        if (event.message) {
          window.frontendAgent.chats.messages(event.chatId).then(setMessages).catch(console.error);
          onRefresh().catch(() => undefined);
        }
        setActiveRequestId(undefined);
      }
    });
  }, [onRefresh]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      messageListRef.current?.scrollTo({
        top: messageListRef.current.scrollHeight,
        behavior: "smooth"
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [messages.length, streamingText, streamStatus]);

  async function sendMessage() {
    const content = input.trim();
    if (!content || sending) return;

    let chatId = activeChatId;
    if (!chatId) {
      const chat = await onCreateChat(mode);
      chatId = chat.id;
    }

    const requestId = crypto.randomUUID();
    setInput("");
    setSending(true);
    setActiveRequestId(requestId);
    setStreamingText("");
    setStreamStatus("Preparing local prompt and knowledge context...");
    setStreamSources([]);
    setMessages((items) => [
      ...items,
      {
        id: `local-${requestId}`,
        chatId,
        role: "user",
        content,
        createdAt: new Date().toISOString()
      }
    ]);

    try {
      await window.frontendAgent.chats.send({
        requestId,
        chatId,
        content,
        mode,
        sourceIds:
          selectedSourceIds.length === sources.length
            ? undefined
            : selectedSourceIds.length
              ? selectedSourceIds
              : ["__no_sources__"],
        projectId: activeProjectId
      });
    } catch (error) {
      setSending(false);
      setStreamingText(error instanceof Error ? error.message : String(error));
    }
  }

  function addPrompt(label: string, nextMode: AssistantMode, text: string) {
    setMode(nextMode);
    setInput((current) => (current ? `${current}\n\n${text}` : text));
  }

  return (
    <div className="grid h-full min-h-0 grid-cols-[320px_minmax(0,1fr)] overflow-hidden">
      <aside className="min-h-0 border-r border-white/10 bg-ink-900">
        <div className="flex h-14 items-center justify-between border-b border-white/10 px-3">
          <span className="text-sm font-semibold text-white">Chats</span>
          <Button variant="ghost" className="h-8 px-2" onClick={() => onCreateChat(mode)} title="New chat">
            <MessageSquarePlus className="h-4 w-4" />
          </Button>
        </div>
        <div className="app-scrollbar h-[calc(100%-3.5rem)] overflow-auto p-2">
          {chats.map((chat) => (
            <div
              key={chat.id}
              className={clsx(
                "group mb-1 flex items-center gap-2 rounded-md pr-2 transition",
                chat.id === activeChatId ? "bg-fern/15 text-fern" : "text-zinc-300 hover:bg-white/[0.06]"
              )}
            >
              <button className="min-w-0 flex-1 px-3 py-3 text-left" onClick={() => onSelectChat(chat.id)}>
                <div className="truncate text-sm font-medium">{chat.title}</div>
                <div className="mt-1 text-xs text-zinc-500">{chat.mode}</div>
              </button>
              <Button
                variant="ghost"
                className="h-8 px-2 opacity-70 hover:text-coral group-hover:opacity-100"
                title="Delete chat"
                onClick={() => {
                  if (window.confirm(`Delete "${chat.title}"?`)) onDeleteChat(chat.id).catch(console.error);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {!chats.length && <div className="p-4 text-sm text-zinc-500">No chats saved yet.</div>}
        </div>
      </aside>

      <section className="flex min-h-0 min-w-0 flex-col bg-ink-950">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-4">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-white">{activeChat?.title || "New frontend chat"}</div>
            <div className="text-xs text-zinc-500">
              {activeProjectId ? "Project context attached" : "No project context attached"}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Button variant="secondary" onClick={() => setSourcePanelOpen((value) => !value)}>
                <SlidersHorizontal className="h-4 w-4" />
                Context {selectedSourceIds.length}/{sources.length || 0}
              </Button>
              {sourcePanelOpen ? (
                <div className="absolute right-0 top-11 z-50 w-[340px] rounded-md border border-white/10 bg-ink-900 p-4 shadow-soft">
                  <label className="mb-2 block text-xs font-medium uppercase text-zinc-500">Project</label>
                  <select
                    className="mb-4 h-10 w-full rounded-md border border-white/10 bg-ink-850 px-3 text-sm text-zinc-100 outline-none focus:border-fern/50"
                    value={activeProjectId || ""}
                    onChange={(event) => onSelectProject(event.target.value || undefined)}
                  >
                    <option value="">No project</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>

                  <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase text-zinc-500">
                    <Database className="h-4 w-4" />
                    Knowledge Sources
                  </div>
                  <div className="space-y-2">
                    {sources.map((source) => {
                      const checked = !uncheckedSourceIds.includes(source.id);
                      return (
                        <label
                          key={source.id}
                          className="flex cursor-pointer items-center gap-3 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm hover:bg-white/[0.07]"
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-fern"
                            checked={checked}
                            onChange={(event) => {
                              setUncheckedSourceIds((items) =>
                                event.target.checked
                                  ? items.filter((id) => id !== source.id)
                                  : [...new Set([...items, source.id])]
                              );
                            }}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-zinc-200">{source.name}</span>
                            <span className="text-xs text-zinc-500">{source.chunkCount} chunks</span>
                          </span>
                        </label>
                      );
                    })}
                    {!sources.length ? <div className="text-sm text-zinc-500">No indexed sources yet.</div> : null}
                  </div>
                </div>
              ) : null}
            </div>

            <select
              className="h-9 rounded-md border border-white/10 bg-ink-850 px-3 text-sm text-zinc-100 outline-none focus:border-fern/50"
              value={mode}
              onChange={(event) => setMode(event.target.value as AssistantMode)}
            >
              {MODES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div ref={messageListRef} className="app-scrollbar min-h-0 flex-1 overflow-auto px-5 py-4 pb-6">
          {!messages.length && !streamingText ? (
            <div className="mx-auto mt-16 max-w-2xl rounded-md border border-white/10 bg-ink-900 p-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-fern/15 text-fern">
                <Bot className="h-6 w-6" />
              </div>
              <div className="text-lg font-semibold text-white">Ask for a frontend build, review, or refactor.</div>
              <div className="mt-2 text-sm leading-6 text-zinc-400">
                Responses stream from your selected local GGUF model and cite local knowledge chunks when available.
              </div>
            </div>
          ) : null}

          <div className="mx-auto flex max-w-4xl flex-col gap-4">
            {messages.map((message) => (
              <article
                key={message.id}
                className={clsx(
                  "rounded-md border p-4",
                  message.role === "user"
                    ? "ml-auto max-w-[82%] border-fern/20 bg-fern/10"
                    : "mr-auto w-full border-white/10 bg-ink-900"
                )}
              >
                <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase text-zinc-500">
                  {message.role === "user" ? "You" : "Assistant"}
                </div>
                <MarkdownMessage
                  content={message.content}
                  sources={message.sources}
                  activeProjectId={activeProjectId}
                  onApplied={onRefresh}
                />
              </article>
            ))}

            {streamingText || sending ? (
              <article className="mr-auto w-full rounded-md border border-white/10 bg-ink-900 p-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase text-zinc-500">
                  Assistant
                  {sending ? <span className="h-2 w-2 animate-pulse rounded-full bg-fern" /> : null}
                </div>
                {streamStatus && !streamingText ? (
                  <div className="mb-3 rounded-md border border-brass/25 bg-brass/10 px-3 py-2 text-sm text-brass">
                    {streamStatus}
                  </div>
                ) : null}
                <MarkdownMessage
                  content={streamingText || "Waiting for the first token from the local model..."}
                  sources={streamSources}
                  activeProjectId={activeProjectId}
                  onApplied={onRefresh}
                />
              </article>
            ) : null}
          </div>
        </div>

        <div className="shrink-0 border-t border-white/10 bg-ink-900/98 px-4 py-3 shadow-[0_-16px_45px_rgba(0,0,0,0.35)]">
          <div className="mx-auto max-w-4xl">
            <div className="mb-2 flex flex-wrap gap-2">
              <PromptButton
                icon={CopyCheck}
                label="Explain this code"
                onClick={() => addPrompt("Explain this code", "general", "Explain this code and point out the frontend patterns:\n\n")}
              />
              <PromptButton
                icon={Paintbrush}
                label="Improve design"
                onClick={() => addPrompt("Improve design", "ui-ux-review", "Improve this UI design with concrete frontend changes.")}
              />
              <PromptButton
                icon={Smartphone}
                label="Make responsive"
                onClick={() => addPrompt("Make responsive", "responsive", "Make this layout responsive for mobile, tablet, laptop, and desktop.")}
              />
              <PromptButton
                icon={Code2}
                label="Convert to Tailwind"
                onClick={() => addPrompt("Convert to Tailwind", "tailwind", "Convert this UI/code to clean Tailwind CSS.")}
              />
              <PromptButton
                icon={Maximize2}
                label="Pixel-perfect checklist"
                onClick={() =>
                  addPrompt(
                    "Pixel-perfect checklist",
                    "pixel-perfect",
                    "Create a pixel-perfect checklist and implementation plan for this screen."
                  )
                }
              />
            </div>
            <div className="flex items-stretch gap-3">
              <textarea
                className="app-scrollbar h-[68px] min-h-[68px] flex-1 resize-none rounded-md border border-white/10 bg-ink-950 px-3 py-2.5 text-sm leading-5 text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-fern/50"
                placeholder="Ask for a component, landing page, responsive fix, Liquid section, Tailwind refactor, or UI review..."
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) sendMessage().catch(console.error);
                }}
              />
              <Button variant="primary" className="h-[68px] w-24 shrink-0" onClick={() => sendMessage()} disabled={sending}>
                <Send className="h-4 w-4" />
                Send
              </Button>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}

function PromptButton({
  icon: Icon,
  label,
  onClick
}: {
  icon: ElementType;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button variant="secondary" className="h-8 px-2.5" onClick={onClick}>
      <Icon className="h-4 w-4" />
      {label}
    </Button>
  );
}
