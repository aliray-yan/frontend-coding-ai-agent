import {
  Bot,
  BrainCircuit,
  FolderOpen,
  Home,
  Menu,
  MessageSquarePlus,
  MonitorCog,
  Moon,
  Sun,
  X,
  Settings
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ElementType } from "react";
import clsx from "clsx";
import type {
  AppScreen,
  AppSettings,
  AssistantMode,
  ChatSummary,
  KnowledgeSource,
  ProjectSummary,
  SystemStatus
} from "../../shared/types";
import { Button } from "./components/Button";
import { StatusPill } from "./components/StatusPill";
import { HomeScreen } from "./screens/HomeScreen";
import { ChatScreen } from "./screens/ChatScreen";
import { ProjectScreen } from "./screens/ProjectScreen";
import { KnowledgeScreen } from "./screens/KnowledgeScreen";
import { SettingsScreen } from "./screens/SettingsScreen";

const NAV_ITEMS: Array<{ screen: AppScreen; label: string; icon: ElementType }> = [
  { screen: "home", label: "Home", icon: Home },
  { screen: "chat", label: "Chat", icon: Bot },
  { screen: "project", label: "Project", icon: FolderOpen },
  { screen: "knowledge", label: "Knowledge", icon: BrainCircuit },
  { screen: "settings", label: "Settings", icon: Settings }
];

export function App() {
  const [screen, setScreen] = useState<AppScreen>("home");
  const [settings, setSettings] = useState<AppSettings>();
  const [status, setStatus] = useState<SystemStatus>();
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [activeChatId, setActiveChatId] = useState<string>();
  const [activeProjectId, setActiveProjectId] = useState<string>();
  const [prefillPrompt, setPrefillPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  const activeProject = useMemo(
    () => projects.find((project) => project.id === activeProjectId),
    [activeProjectId, projects]
  );

  const refresh = useCallback(async () => {
    const [nextSettings, nextStatus, nextChats, nextSources, nextProjects] = await Promise.all([
      window.frontendAgent.settings.get(),
      window.frontendAgent.system.status(),
      window.frontendAgent.chats.list(),
      window.frontendAgent.knowledge.list(),
      window.frontendAgent.projects.list()
    ]);
    setSettings(nextSettings);
    setStatus(nextStatus);
    setChats(nextChats);
    setSources(nextSources);
    setProjects(nextProjects);
    if (!activeChatId && nextChats[0]) setActiveChatId(nextChats[0].id);
    if (!activeProjectId && nextProjects[0]) setActiveProjectId(nextProjects[0].id);
  }, [activeChatId, activeProjectId]);

  useEffect(() => {
    refresh().catch(console.error);
    const interval = window.setInterval(() => {
      window.frontendAgent.system.status().then(setStatus).catch(() => undefined);
    }, 5000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    if (!settings) return;
    document.documentElement.dataset.theme = settings.theme === "light" ? "light" : "dark";
  }, [settings]);

  async function createChat(mode: AssistantMode = "general") {
    const chat = await window.frontendAgent.chats.create(mode);
    setChats((items) => [chat, ...items]);
    setActiveChatId(chat.id);
    setScreen("chat");
    return chat;
  }

  async function deleteChat(chatId: string) {
    await window.frontendAgent.chats.delete(chatId);
    setChats((items) => {
      const next = items.filter((chat) => chat.id !== chatId);
      if (activeChatId === chatId) setActiveChatId(next[0]?.id);
      return next;
    });
    await refresh();
  }

  async function toggleTheme() {
    if (!settings) return;
    const nextTheme = settings.theme === "light" ? "dark" : "light";
    const next = await window.frontendAgent.settings.update({ theme: nextTheme });
    setSettings(next);
  }

  async function openProject() {
    const project = await window.frontendAgent.projects.openDialog();
    if (project) {
      setProjects((items) => [project, ...items.filter((item) => item.id !== project.id)]);
      setActiveProjectId(project.id);
      setScreen("project");
    }
  }

  async function createProject() {
    const name = window.prompt("Project name", "portfolio-practice");
    if (!name) return;
    const project = await window.frontendAgent.projects.create({ name, template: "portfolio" });
    setProjects((items) => [project, ...items]);
    setActiveProjectId(project.id);
    setScreen("project");
  }

  async function runBusy(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  const modelTone = status?.model.healthy ? "good" : status?.model.configured ? "warn" : "bad";

  return (
    <div className="flex h-screen overflow-hidden bg-ink-950 text-zinc-100">
      {navOpen ? (
      <aside className="flex w-[244px] shrink-0 flex-col border-r border-white/10 bg-ink-900">
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-4">
          <img className="h-10 w-10 rounded-md" src="./app-icon.png" alt="" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-white">Frontend Coding</div>
            <div className="text-xs text-zinc-400">AI Agent</div>
          </div>
          <Button variant="ghost" className="h-8 px-2" onClick={() => setNavOpen(false)} title="Close navigation">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.screen}
                className={clsx(
                  "flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm transition",
                  screen === item.screen
                    ? "bg-white/[0.09] text-white"
                    : "text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                )}
                onClick={() => setScreen(item.screen)}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="space-y-3 border-t border-white/10 p-3">
          <Button variant="primary" className="w-full" onClick={() => createChat("general")}>
            <MessageSquarePlus className="h-4 w-4" />
            New chat
          </Button>
          <Button variant="secondary" className="w-full" onClick={openProject}>
            <FolderOpen className="h-4 w-4" />
            Open project
          </Button>
        </div>
      </aside>
      ) : null}

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 bg-ink-950/95 px-5">
          <div className="flex min-w-0 items-center gap-3">
            <Button variant="ghost" className="h-9 px-2" onClick={() => setNavOpen((value) => !value)} title="Open navigation">
              <Menu className="h-5 w-5" />
            </Button>
            <img className="h-9 w-9 rounded-md" src="./app-icon.png" alt="" />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-white">Frontend Coding AI Agent</div>
              <div className="truncate text-xs text-zinc-400">
                Local llama.cpp backend, GGUF models, local SQLite, offline RAG
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatusPill tone={modelTone}>{status?.model.message || "Checking model"}</StatusPill>
            <StatusPill tone={sources.length ? "good" : "warn"}>{sources.length} sources</StatusPill>
            <Button variant="ghost" onClick={toggleTheme} title="Toggle theme">
              {settings?.theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" onClick={() => setScreen("settings")} title="Model settings">
              <MonitorCog className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <section className="min-h-0 flex-1 overflow-hidden">
          {screen === "home" && (
            <HomeScreen
              status={status}
              settings={settings}
              sources={sources}
              projects={projects}
              busy={busy}
              onNewChat={() => createChat("general")}
              onOpenProject={openProject}
              onCreateProject={createProject}
              onGo={setScreen}
              onRefresh={refresh}
              onRunBusy={runBusy}
            />
          )}
          {screen === "chat" && (
            <ChatScreen
              chats={chats}
              sources={sources}
              projects={projects}
              activeChatId={activeChatId}
              activeProjectId={activeProjectId}
              prefillPrompt={prefillPrompt}
              onPrefillConsumed={() => setPrefillPrompt("")}
              onSelectChat={setActiveChatId}
              onSelectProject={setActiveProjectId}
              onCreateChat={createChat}
              onDeleteChat={deleteChat}
              onRefresh={refresh}
            />
          )}
          {screen === "project" && (
            <ProjectScreen
              projects={projects}
              activeProject={activeProject}
              onSelectProject={setActiveProjectId}
              onOpenProject={openProject}
              onCreateProject={createProject}
              onRefresh={refresh}
              onAskAi={(prompt) => {
                setPrefillPrompt(prompt);
                setScreen("chat");
              }}
            />
          )}
          {screen === "knowledge" && (
            <KnowledgeScreen sources={sources} busy={busy} onRefresh={refresh} onRunBusy={runBusy} />
          )}
          {screen === "settings" && settings && status && (
            <SettingsScreen
              settings={settings}
              status={status.model}
              onSettings={setSettings}
              onRefresh={refresh}
              onRunBusy={runBusy}
            />
          )}
        </section>
      </main>
    </div>
  );
}
