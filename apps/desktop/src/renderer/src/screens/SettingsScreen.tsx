import {
  Cpu,
  FileCode2,
  FolderSearch,
  HardDrive,
  Play,
  Save,
  Server,
  ShieldCheck,
  Square,
  TestTube2
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import type { AppSettings, ModelConfig, ModelStatus } from "../../../shared/types";
import { Button } from "../components/Button";
import { StatusPill } from "../components/StatusPill";

export function SettingsScreen({
  settings,
  status,
  onSettings,
  onRefresh,
  onRunBusy
}: {
  settings: AppSettings;
  status: ModelStatus;
  onSettings: (settings: AppSettings) => void;
  onRefresh: () => Promise<void>;
  onRunBusy: (action: () => Promise<void>) => Promise<void>;
}) {
  const [model, setModel] = useState<ModelConfig>(settings.model);
  const [theme, setTheme] = useState(settings.theme);
  const [offlineMode, setOfflineMode] = useState(settings.offlineMode);
  const [testOutput, setTestOutput] = useState("");

  useEffect(() => {
    setModel(settings.model);
    setTheme(settings.theme);
    setOfflineMode(settings.offlineMode);
  }, [settings]);

  async function saveSettings() {
    const next = await window.frontendAgent.settings.update({ model, theme, offlineMode });
    onSettings(next);
    await onRefresh();
  }

  async function selectModel() {
    const nextModel = await window.frontendAgent.model.selectGguf();
    setModel(nextModel);
    const next = await window.frontendAgent.settings.get();
    onSettings(next);
  }

  async function selectServer() {
    const nextModel = await window.frontendAgent.model.selectServer();
    setModel(nextModel);
    const next = await window.frontendAgent.settings.get();
    onSettings(next);
  }

  async function testInference() {
    setTestOutput("Testing local inference...");
    await saveSettings();
    await onRunBusy(async () => {
      const output = await window.frontendAgent.model.test();
      setTestOutput(output || "Local inference responded.");
    });
  }

  return (
    <div className="app-scrollbar h-full overflow-auto">
      <div className="mx-auto grid max-w-7xl grid-cols-[1fr_390px] gap-5 p-6">
        <section className="rounded-md border border-white/10 bg-ink-900">
          <div className="flex h-14 items-center justify-between border-b border-white/10 px-5">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-fern" />
              <h1 className="text-sm font-semibold text-white">Settings</h1>
            </div>
            <Button variant="primary" onClick={saveSettings}>
              <Save className="h-4 w-4" />
              Save settings
            </Button>
          </div>

          <div className="space-y-6 p-5">
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xs font-medium uppercase text-zinc-500">Local Model Backend</h2>
                <StatusPill tone={status.healthy ? "good" : status.configured ? "warn" : "bad"}>
                  {status.healthy ? "Running" : status.configured ? "Configured" : "Needs model"}
                </StatusPill>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Backend type">
                  <input className="input" value="llama.cpp" readOnly />
                </Field>
                <Field label="Port">
                  <NumberInput value={model.port} onChange={(port) => setModel({ ...model, port })} min={1024} max={65535} />
                </Field>
                <Field label="Local model path" wide>
                  <div className="flex gap-2">
                    <input className="input min-w-0 flex-1" value={model.modelPath} readOnly placeholder="No local GGUF model selected" />
                    <Button onClick={selectModel}>
                      <FolderSearch className="h-4 w-4" />
                      Browse
                    </Button>
                  </div>
                </Field>
                <Field label="llama.cpp server path" wide>
                  <div className="flex gap-2">
                    <input className="input min-w-0 flex-1" value={model.llamaServerPath} readOnly placeholder="vendor/llama.cpp/llama-server.exe" />
                    <Button onClick={selectServer}>
                      <FileCode2 className="h-4 w-4" />
                      Browse
                    </Button>
                  </div>
                </Field>
                <Field label="Context size">
                  <NumberInput
                    value={model.contextSize}
                    onChange={(contextSize) => setModel({ ...model, contextSize })}
                    min={1024}
                    max={32768}
                    step={512}
                  />
                </Field>
                <Field label="Temperature">
                  <NumberInput
                    value={model.temperature}
                    onChange={(temperature) => setModel({ ...model, temperature })}
                    min={0}
                    max={2}
                    step={0.05}
                  />
                </Field>
                <Field label="Max tokens">
                  <NumberInput
                    value={model.maxTokens}
                    onChange={(maxTokens) => setModel({ ...model, maxTokens })}
                    min={128}
                    max={8192}
                    step={128}
                  />
                </Field>
                <Field label="GPU layers">
                  <NumberInput
                    value={model.gpuLayers}
                    onChange={(gpuLayers) => setModel({ ...model, gpuLayers })}
                    min={0}
                    max={999}
                  />
                </Field>
                <Field label="CPU threads">
                  <NumberInput value={model.threads} onChange={(threads) => setModel({ ...model, threads })} min={1} max={64} />
                </Field>
                <Field label="Auto start">
                  <label className="flex h-10 items-center gap-3 rounded-md border border-white/10 bg-ink-950 px-3 text-sm text-zinc-200">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-fern"
                      checked={model.autoStart}
                      onChange={(event) => setModel({ ...model, autoStart: event.target.checked })}
                    />
                    Start backend when app opens
                  </label>
                </Field>
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-xs font-medium uppercase text-zinc-500">Assistant Preferences</h2>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Theme">
                  <select
                    className="input"
                    value={theme}
                    onChange={(event) => setTheme(event.target.value as AppSettings["theme"])}
                  >
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                    <option value="system">System</option>
                  </select>
                </Field>
                <Field label="Embedding model">
                  <input className="input" value={settings.embeddingModel} readOnly />
                </Field>
                <Field label="Storage path" wide>
                  <input className="input" value={settings.storagePath} readOnly />
                </Field>
                <Field label="Offline mode">
                  <label className="flex h-10 items-center gap-3 rounded-md border border-white/10 bg-ink-950 px-3 text-sm text-zinc-200">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-fern"
                      checked={offlineMode}
                      onChange={(event) => setOfflineMode(event.target.checked)}
                    />
                    Keep chat and project data local only
                  </label>
                </Field>
              </div>
            </section>
          </div>
        </section>

        <aside className="space-y-5">
          <section className="rounded-md border border-white/10 bg-ink-900 p-5">
            <div className="mb-4 flex items-center gap-2">
              <Cpu className="h-4 w-4 text-brass" />
              <h2 className="text-sm font-semibold text-white">Model Status</h2>
            </div>
            <div className="space-y-3 text-sm">
              <StatusLine label="Health" value={status.message} />
              <StatusLine label="Endpoint" value={status.endpoint || `http://127.0.0.1:${model.port}`} />
              <StatusLine label="PID" value={status.pid ? String(status.pid) : "Not running"} />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Button
                variant="primary"
                onClick={() =>
                  onRunBusy(async () => {
                    await saveSettings();
                    await window.frontendAgent.model.start();
                  })
                }
              >
                <Play className="h-4 w-4" />
                Start
              </Button>
              <Button variant="secondary" onClick={() => onRunBusy(async () => void (await window.frontendAgent.model.stop()))}>
                <Square className="h-4 w-4" />
                Stop
              </Button>
              <Button className="col-span-2" onClick={testInference}>
                <TestTube2 className="h-4 w-4" />
                Test local inference
              </Button>
            </div>
            {testOutput ? (
              <div className="mt-4 rounded-md border border-white/10 bg-black/20 p-3 text-sm leading-6 text-zinc-300">
                {testOutput}
              </div>
            ) : null}
          </section>

          <section className="rounded-md border border-white/10 bg-ink-900 p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
              <HardDrive className="h-4 w-4 text-tide" />
              Recommended GGUF coding models
            </div>
            <div className="space-y-2 text-sm text-zinc-400">
              <ModelLine name="Qwen2.5-Coder GGUF" />
              <ModelLine name="DeepSeek-Coder GGUF" />
              <ModelLine name="CodeLlama GGUF" />
              <ModelLine name="StarCoder2 GGUF" />
              <ModelLine name="Phi or small coder models" />
            </div>
          </section>

          <section className="rounded-md border border-fern/20 bg-fern/10 p-5">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-fern">
              <ShieldCheck className="h-4 w-4" />
              Privacy
            </div>
            <p className="text-sm leading-6 text-zinc-300">
              This app does not call ChatGPT, OpenAI, Codex, Claude, Gemini, or cloud AI APIs. Chat prompts, code,
              project files, embeddings, model output, and settings remain local. Documentation import may use Git or
              web downloads only when you choose an import action.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Field({ label, children, wide = false }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={wide ? "col-span-2 block" : "block"}>
      <span className="mb-2 block text-xs font-medium uppercase text-zinc-500">{label}</span>
      {children}
    </label>
  );
}

function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1
}: {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
}) {
  return (
    <input
      className="input"
      type="number"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
    />
  );
}

function StatusLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[78px_1fr] gap-3 border-b border-white/10 pb-2 last:border-0">
      <span className="text-zinc-500">{label}</span>
      <span className="break-words text-zinc-300">{value}</span>
    </div>
  );
}

function ModelLine({ name }: { name: string }) {
  return <div className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2">{name}</div>;
}
