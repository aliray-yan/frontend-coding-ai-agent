import {
  ArrowRight,
  BookOpen,
  Bot,
  CheckCircle2,
  FolderPlus,
  HardDrive,
  Import,
  Loader2,
  MessageSquarePlus,
  PlayCircle,
  RefreshCw,
  Settings
} from "lucide-react";
import type { ElementType, SVGProps } from "react";
import type {
  AppScreen,
  AppSettings,
  KnowledgeSource,
  ProjectSummary,
  SystemStatus
} from "../../../shared/types";
import { Button } from "../components/Button";
import { StatusPill } from "../components/StatusPill";

export function HomeScreen({
  status,
  settings,
  sources,
  projects,
  busy,
  onNewChat,
  onOpenProject,
  onCreateProject,
  onGo,
  onRefresh,
  onRunBusy
}: {
  status?: SystemStatus;
  settings?: AppSettings;
  sources: KnowledgeSource[];
  projects: ProjectSummary[];
  busy: boolean;
  onNewChat: () => void;
  onOpenProject: () => void;
  onCreateProject: () => void;
  onGo: (screen: AppScreen) => void;
  onRefresh: () => Promise<void>;
  onRunBusy: (action: () => Promise<void>) => Promise<void>;
}) {
  const hasUiUx = sources.some((source) => source.name.includes("UI UX Pro Max"));
  const hasDocs = sources.some((source) => source.name.includes("Bundled Frontend Docs"));

  return (
    <div className="app-scrollbar h-full overflow-auto">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6">
        <section className="grid grid-cols-[1.15fr_0.85fr] gap-5">
          <div className="rounded-md border border-white/10 bg-ink-900 p-6 shadow-soft">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-semibold text-white">Frontend Coding AI Agent</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                  Local GGUF inference, frontend RAG, project editing, and design review in one offline desktop app.
                </p>
              </div>
              <StatusPill tone={status?.model.healthy ? "good" : status?.model.configured ? "warn" : "bad"}>
                {status?.model.healthy ? "Model ready" : status?.model.configured ? "Model configured" : "Model needed"}
              </StatusPill>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Button variant="primary" className="h-12 justify-start" onClick={onNewChat}>
                <MessageSquarePlus className="h-4 w-4" />
                New chat
              </Button>
              <Button className="h-12 justify-start" onClick={onOpenProject}>
                <HardDrive className="h-4 w-4" />
                Open project
              </Button>
              <Button className="h-12 justify-start" onClick={onCreateProject}>
                <FolderPlus className="h-4 w-4" />
                Create project
              </Button>
            </div>
          </div>

          <div className="rounded-md border border-white/10 bg-ink-900 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Local Status</h2>
              <Button variant="ghost" className="h-8 px-2" onClick={() => onRefresh()} title="Refresh">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-3 text-sm">
              <StatusRow label="Backend" value={status?.model.message || "Checking"} />
              <StatusRow label="Model path" value={settings?.model.modelPath || "No GGUF selected"} />
              <StatusRow label="Knowledge" value={`${sources.length} source${sources.length === 1 ? "" : "s"}`} />
              <StatusRow label="Storage" value={settings?.storagePath || "Local app data"} />
            </div>
          </div>
        </section>

        <section className="grid grid-cols-[0.95fr_1.05fr] gap-5">
          <SetupWizard
            busy={busy}
            hasModel={Boolean(settings?.model.modelPath)}
            modelHealthy={Boolean(status?.model.healthy)}
            hasUiUx={hasUiUx}
            hasDocs={hasDocs}
            hasIndex={sources.some((source) => source.chunkCount > 0)}
            onGo={onGo}
            onRunBusy={onRunBusy}
          />

          <div className="rounded-md border border-white/10 bg-ink-900 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Recent Projects</h2>
              <Button variant="ghost" className="h-8 px-2" onClick={() => onGo("project")} title="Project screen">
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2">
              {projects.slice(0, 6).map((project) => (
                <button
                  key={project.id}
                  className="flex w-full items-center justify-between rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 text-left hover:bg-white/[0.07]"
                  onClick={() => onGo("project")}
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-white">{project.name}</div>
                    <div className="truncate text-xs text-zinc-500">{project.path}</div>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-zinc-500" />
                </button>
              ))}
              {!projects.length && <EmptyLine icon={FolderPlus} text="No projects yet" />}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-3 gap-5">
          <QuickMode title="Tailwind Helper" text="Classes, breakpoints, colors, states" onClick={() => onGo("chat")} />
          <QuickMode title="Pixel Perfect Mode" text="Spacing, typography, hierarchy checklist" onClick={() => onGo("chat")} />
          <QuickMode title="Shopify / Liquid" text="Sections, snippets, product grids" onClick={() => onGo("chat")} />
        </section>
      </div>
    </div>
  );
}

function SetupWizard({
  busy,
  hasModel,
  modelHealthy,
  hasUiUx,
  hasDocs,
  hasIndex,
  onGo,
  onRunBusy
}: {
  busy: boolean;
  hasModel: boolean;
  modelHealthy: boolean;
  hasUiUx: boolean;
  hasDocs: boolean;
  hasIndex: boolean;
  onGo: (screen: AppScreen) => void;
  onRunBusy: (action: () => Promise<void>) => Promise<void>;
}) {
  const steps = [
    {
      title: "Choose local GGUF model",
      done: hasModel,
      action: () => onGo("settings"),
      icon: Settings
    },
    {
      title: "Test local inference",
      done: modelHealthy,
      action: () => onRunBusy(async () => void (await window.frontendAgent.model.start())),
      icon: PlayCircle
    },
    {
      title: "Import UI UX Pro Max skill",
      done: hasUiUx,
      action: () => onRunBusy(async () => void (await window.frontendAgent.knowledge.importUiUx())),
      icon: Import
    },
    {
      title: "Import frontend documentation",
      done: hasDocs,
      action: () => onRunBusy(async () => void (await window.frontendAgent.knowledge.importDocs())),
      icon: BookOpen
    },
    {
      title: "Build local RAG index",
      done: hasIndex,
      action: () => onGo("knowledge"),
      icon: BrainIcon
    },
    {
      title: "Start using assistant",
      done: hasModel && hasIndex,
      action: () => onGo("chat"),
      icon: Bot
    }
  ];

  return (
    <div className="rounded-md border border-white/10 bg-ink-900 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Setup Wizard</h2>
        {busy ? <Loader2 className="h-4 w-4 animate-spin text-brass" /> : null}
      </div>
      <div className="space-y-2">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <button
              key={step.title}
              className="flex w-full items-center gap-3 rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 text-left hover:bg-white/[0.07] disabled:opacity-60"
              onClick={step.action}
              disabled={busy}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/[0.06] text-zinc-300">
                {step.done ? <CheckCircle2 className="h-4 w-4 text-fern" /> : <Icon className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-white">
                  Step {index + 1}: {step.title}
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-zinc-500" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BrainIcon(props: SVGProps<SVGSVGElement>) {
  return <BookOpen {...props} />;
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-3 border-b border-white/10 pb-2 last:border-0">
      <span className="text-zinc-500">{label}</span>
      <span className="truncate text-zinc-200" title={value}>
        {value}
      </span>
    </div>
  );
}

function EmptyLine({ icon: Icon, text }: { icon: ElementType; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-dashed border-white/10 px-3 py-6 text-sm text-zinc-500">
      <Icon className="h-4 w-4" />
      {text}
    </div>
  );
}

function QuickMode({ title, text, onClick }: { title: string; text: string; onClick: () => void }) {
  return (
    <button
      className="rounded-md border border-white/10 bg-ink-900 p-4 text-left transition hover:-translate-y-0.5 hover:border-brass/30 hover:bg-ink-850"
      onClick={onClick}
    >
      <div className="text-sm font-semibold text-white">{title}</div>
      <div className="mt-1 text-sm text-zinc-500">{text}</div>
    </button>
  );
}
