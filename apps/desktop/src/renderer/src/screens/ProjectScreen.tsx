import {
  Bot,
  FileSearch,
  FolderOpen,
  FolderPlus,
  History,
  RefreshCw,
  Save,
  Search,
  Wand2
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import type {
  FileReadResult,
  FileTreeNode,
  ProjectSummary,
  SearchFilesResult
} from "../../../shared/types";
import { Button } from "../components/Button";
import { FileTree } from "../components/FileTree";
import { StatusPill } from "../components/StatusPill";

export function ProjectScreen({
  projects,
  activeProject,
  onSelectProject,
  onOpenProject,
  onCreateProject,
  onRefresh,
  onAskAi
}: {
  projects: ProjectSummary[];
  activeProject?: ProjectSummary;
  onSelectProject: (projectId: string) => void;
  onOpenProject: () => void;
  onCreateProject: () => void;
  onRefresh: () => Promise<void>;
  onAskAi: (prompt: string) => void;
}) {
  const [tree, setTree] = useState<FileTreeNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileReadResult>();
  const [editorValue, setEditorValue] = useState("");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchFilesResult[]>([]);
  const [aiInstruction, setAiInstruction] = useState("");
  const [status, setStatus] = useState("");

  const dirty = selectedFile ? editorValue !== selectedFile.content : false;
  const canPreview = selectedFile?.language === "html";

  useEffect(() => {
    if (!activeProject) {
      setTree([]);
      setSelectedFile(undefined);
      return;
    }
    loadTree(activeProject.id).catch(console.error);
  }, [activeProject?.id]);

  async function loadTree(projectId = activeProject?.id) {
    if (!projectId) return;
    const nextTree = await window.frontendAgent.projects.tree(projectId);
    setTree(nextTree);
  }

  async function selectNode(node: FileTreeNode) {
    if (!activeProject || node.type !== "file") return;
    const file = await window.frontendAgent.projects.readFile(activeProject.id, node.relativePath);
    setSelectedFile(file);
    setEditorValue(file.content);
  }

  async function saveFile() {
    if (!activeProject || !selectedFile) return;
    const file = await window.frontendAgent.projects.writeFile({
      projectId: activeProject.id,
      relativePath: selectedFile.relativePath,
      content: editorValue,
      label: `Manual save before editing ${selectedFile.relativePath}`
    });
    setSelectedFile(file);
    setEditorValue(file.content);
    await loadTree();
    setStatus("Saved with snapshot.");
  }

  async function rollback() {
    if (!activeProject) return;
    const restored = await window.frontendAgent.projects.rollback(activeProject.id);
    await loadTree();
    if (selectedFile) {
      const file = await window.frontendAgent.projects.readFile(activeProject.id, selectedFile.relativePath).catch(() => undefined);
      if (file) {
        setSelectedFile(file);
        setEditorValue(file.content);
      }
    }
    setStatus(restored.length ? `Rolled back ${restored.join(", ")}` : "No snapshot to roll back.");
  }

  async function runSearch() {
    if (!activeProject || !query.trim()) return;
    const results = await window.frontendAgent.projects.search(activeProject.id, query.trim());
    setSearchResults(results);
  }

  function askAi() {
    if (!activeProject) return;
    const instruction = aiInstruction.trim() || "Review this file and suggest practical frontend improvements.";
    const fileBlock = selectedFile
      ? `\n\nSelected file: ${selectedFile.relativePath}\n\n\`\`\`${selectedFile.language}\n${editorValue.slice(0, 12000)}\n\`\`\``
      : "";
    onAskAi(`Project: ${activeProject.name}\nPath: ${activeProject.path}\n\n${instruction}${fileBlock}`);
  }

  const previewDoc = useMemo(() => {
    if (!canPreview) return "";
    return editorValue;
  }, [canPreview, editorValue]);

  return (
    <div className="grid h-full grid-cols-[292px_1fr_420px] overflow-hidden">
      <aside className="min-h-0 border-r border-white/10 bg-ink-900">
        <div className="flex h-14 items-center justify-between border-b border-white/10 px-3">
          <span className="text-sm font-semibold text-white">Projects</span>
          <div className="flex gap-1">
            <Button variant="ghost" className="h-8 px-2" onClick={onOpenProject} title="Open project">
              <FolderOpen className="h-4 w-4" />
            </Button>
            <Button variant="ghost" className="h-8 px-2" onClick={onCreateProject} title="Create project">
              <FolderPlus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="app-scrollbar h-[170px] overflow-auto border-b border-white/10 p-2">
          {projects.map((project) => (
            <button
              key={project.id}
              className={clsx(
                "mb-1 w-full rounded-md px-3 py-2 text-left text-sm",
                activeProject?.id === project.id ? "bg-fern/15 text-fern" : "text-zinc-300 hover:bg-white/[0.06]"
              )}
              onClick={() => onSelectProject(project.id)}
            >
              <div className="truncate font-medium">{project.name}</div>
              <div className="truncate text-xs text-zinc-500">{project.path}</div>
            </button>
          ))}
          {!projects.length && <div className="p-3 text-sm text-zinc-500">No projects opened yet.</div>}
        </div>

        <div className="flex h-[calc(100%-14rem)] flex-col">
          <div className="flex h-11 items-center justify-between px-3">
            <span className="text-xs font-medium uppercase text-zinc-500">Files</span>
            <Button variant="ghost" className="h-8 px-2" onClick={() => loadTree()} title="Refresh files">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <div className="app-scrollbar min-h-0 flex-1 overflow-auto px-2 pb-3">
            <FileTree nodes={tree} selectedPath={selectedFile?.relativePath} onSelect={selectNode} />
          </div>
        </div>
      </aside>

      <section className="flex min-w-0 flex-col bg-ink-950">
        <div className="flex h-14 items-center justify-between border-b border-white/10 px-4">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-white">
              {selectedFile?.relativePath || activeProject?.name || "No project selected"}
            </div>
            <div className="text-xs text-zinc-500">{dirty ? "Unsaved changes" : selectedFile ? "Snapshot on save" : "Open a file"}</div>
          </div>
          <div className="flex items-center gap-2">
            {status ? <StatusPill tone="neutral">{status}</StatusPill> : null}
            <Button variant="secondary" onClick={rollback} disabled={!activeProject}>
              <History className="h-4 w-4" />
              Rollback
            </Button>
            <Button variant="primary" onClick={saveFile} disabled={!selectedFile || !dirty}>
              <Save className="h-4 w-4" />
              Save
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1">
          {selectedFile ? (
            <textarea
              className="app-scrollbar h-full w-full resize-none border-0 bg-[#12110f] p-5 font-mono text-[13px] leading-6 text-zinc-100 outline-none"
              value={editorValue}
              spellCheck={false}
              onChange={(event) => setEditorValue(event.target.value)}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-zinc-500">
              Select a file from the project tree.
            </div>
          )}
        </div>
      </section>

      <aside className="min-h-0 border-l border-white/10 bg-ink-900">
        <div className="flex h-14 items-center gap-2 border-b border-white/10 px-4">
          <Wand2 className="h-4 w-4 text-brass" />
          <span className="text-sm font-semibold text-white">Preview & AI</span>
        </div>
        <div className="app-scrollbar h-[calc(100%-3.5rem)] overflow-auto p-4">
          <section className="mb-5">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xs font-medium uppercase text-zinc-500">Preview</h2>
              <StatusPill tone={canPreview ? "good" : "neutral"}>{canPreview ? "HTML" : "Editor"}</StatusPill>
            </div>
            <div className="h-[270px] overflow-hidden rounded-md border border-white/10 bg-white">
              {canPreview ? (
                <iframe className="preview-frame h-full w-full border-0" srcDoc={previewDoc} title="HTML preview" />
              ) : (
                <div className="flex h-full items-center justify-center bg-ink-850 p-6 text-center text-sm text-zinc-500">
                  HTML files can be previewed here. Framework projects can still be edited and reviewed.
                </div>
              )}
            </div>
          </section>

          <section className="mb-5">
            <h2 className="mb-2 text-xs font-medium uppercase text-zinc-500">Ask About Project</h2>
            <textarea
              className="app-scrollbar min-h-[108px] w-full resize-none rounded-md border border-white/10 bg-ink-950 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-fern/50"
              value={aiInstruction}
              onChange={(event) => setAiInstruction(event.target.value)}
              placeholder="Describe the change, review, refactor, responsive fix, or design improvement..."
            />
            <Button variant="primary" className="mt-3 w-full" onClick={askAi} disabled={!activeProject}>
              <Bot className="h-4 w-4" />
              Send to chat
            </Button>
          </section>

          <section>
            <h2 className="mb-2 text-xs font-medium uppercase text-zinc-500">Search Files</h2>
            <div className="flex gap-2">
              <input
                className="h-9 min-w-0 flex-1 rounded-md border border-white/10 bg-ink-950 px-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-fern/50"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="class, component, color..."
              />
              <Button className="h-9 px-2.5" onClick={runSearch} disabled={!activeProject || !query.trim()} title="Search">
                <Search className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-3 space-y-2">
              {searchResults.map((result) => (
                <button
                  key={`${result.relativePath}:${result.line}:${result.preview}`}
                  className="w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-left text-sm hover:bg-white/[0.07]"
                  onClick={() => {
                    const node: FileTreeNode = {
                      name: result.relativePath.split(/[\\/]/).pop() || result.relativePath,
                      path: result.relativePath,
                      relativePath: result.relativePath,
                      type: "file"
                    };
                    selectNode(node).catch(console.error);
                  }}
                >
                  <div className="flex items-center gap-2 text-zinc-200">
                    <FileSearch className="h-4 w-4 text-tide" />
                    <span className="truncate">{result.relativePath}</span>
                    <span className="text-xs text-zinc-500">:{result.line}</span>
                  </div>
                  <div className="mt-1 truncate text-xs text-zinc-500">{result.preview}</div>
                </button>
              ))}
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}
