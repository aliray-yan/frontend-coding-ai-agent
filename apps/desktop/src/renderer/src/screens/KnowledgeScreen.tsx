import {
  BookOpen,
  Database,
  FolderPlus,
  Import,
  Loader2,
  RefreshCw,
  Search,
  ServerCog
} from "lucide-react";
import { useState } from "react";
import type { KnowledgeHit, KnowledgeSource } from "../../../shared/types";
import { Button } from "../components/Button";
import { StatusPill } from "../components/StatusPill";

export function KnowledgeScreen({
  sources,
  busy,
  onRefresh,
  onRunBusy
}: {
  sources: KnowledgeSource[];
  busy: boolean;
  onRefresh: () => Promise<void>;
  onRunBusy: (action: () => Promise<void>) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<KnowledgeHit[]>([]);

  async function search() {
    if (!query.trim()) return;
    const results = await window.frontendAgent.knowledge.search(query.trim());
    setHits(results);
  }

  return (
    <div className="app-scrollbar h-full overflow-auto">
      <div className="mx-auto grid max-w-7xl grid-cols-[1fr_420px] gap-5 p-6">
        <section className="rounded-md border border-white/10 bg-ink-900">
          <div className="flex h-14 items-center justify-between border-b border-white/10 px-5">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-fern" />
              <h1 className="text-sm font-semibold text-white">Knowledge Base</h1>
            </div>
            <div className="flex items-center gap-2">
              {busy ? <Loader2 className="h-4 w-4 animate-spin text-brass" /> : null}
              <Button variant="ghost" className="h-8 px-2" onClick={() => onRefresh()} title="Refresh">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 border-b border-white/10 p-5">
            <Button
              variant="primary"
              className="h-11 justify-start"
              disabled={busy}
              onClick={() => onRunBusy(async () => void (await window.frontendAgent.knowledge.importUiUx()))}
            >
              <Import className="h-4 w-4" />
              Import UI UX Pro Max
            </Button>
            <Button
              className="h-11 justify-start"
              disabled={busy}
              onClick={() => onRunBusy(async () => void (await window.frontendAgent.knowledge.importDocs()))}
            >
              <BookOpen className="h-4 w-4" />
              Import frontend docs
            </Button>
            <Button
              className="h-11 justify-start"
              disabled={busy}
              onClick={() => onRunBusy(async () => void (await window.frontendAgent.knowledge.addFolder()))}
            >
              <FolderPlus className="h-4 w-4" />
              Add folder/docs
            </Button>
          </div>

          <div className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-medium uppercase text-zinc-500">Indexed Sources</h2>
              <StatusPill tone={sources.length ? "good" : "warn"}>{sources.length} sources</StatusPill>
            </div>
            <div className="space-y-3">
              {sources.map((source) => (
                <article key={source.id} className="rounded-md border border-white/10 bg-white/[0.04] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-white">{source.name}</h3>
                      <p className="mt-1 truncate text-xs text-zinc-500" title={source.path}>
                        {source.path}
                      </p>
                    </div>
                    <StatusPill tone={source.status === "indexed" ? "good" : source.status === "error" ? "bad" : "warn"}>
                      {source.status}
                    </StatusPill>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-3 text-xs text-zinc-500">
                    <Metric label="Chunks" value={String(source.chunkCount)} />
                    <Metric label="Type" value={source.type} />
                    <Metric label="Updated" value={new Date(source.updatedAt).toLocaleDateString()} />
                  </div>
                </article>
              ))}
              {!sources.length && (
                <div className="rounded-md border border-dashed border-white/10 p-8 text-center text-sm text-zinc-500">
                  Import the UI UX Pro Max skill or bundled frontend docs to build your first local index.
                </div>
              )}
            </div>
          </div>
        </section>

        <aside className="rounded-md border border-white/10 bg-ink-900">
          <div className="flex h-14 items-center gap-2 border-b border-white/10 px-5">
            <Search className="h-4 w-4 text-tide" />
            <h2 className="text-sm font-semibold text-white">Search RAG</h2>
          </div>
          <div className="p-5">
            <div className="flex gap-2">
              <input
                className="h-10 min-w-0 flex-1 rounded-md border border-white/10 bg-ink-950 px-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-fern/50"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") search().catch(console.error);
                }}
                placeholder="hero spacing, product card, contrast..."
              />
              <Button className="h-10 px-2.5" onClick={search} disabled={!query.trim()} title="Search knowledge">
                <Search className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-5 space-y-3">
              {hits.map((hit) => (
                <article key={hit.id} className="rounded-md border border-white/10 bg-white/[0.04] p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-white">{hit.title}</div>
                      <div className="truncate text-xs text-zinc-500">{hit.sourceName}</div>
                    </div>
                    <StatusPill tone="neutral">{hit.score.toFixed(2)}</StatusPill>
                  </div>
                  <p className="line-clamp-6 text-xs leading-5 text-zinc-400">{hit.content}</p>
                </article>
              ))}
              {!hits.length && (
                <div className="rounded-md border border-white/10 bg-white/[0.04] p-5 text-sm text-zinc-500">
                  <div className="mb-2 flex items-center gap-2 text-zinc-300">
                    <ServerCog className="h-4 w-4" />
                    Local vector search
                  </div>
                  Results come from SQLite-stored document chunks and local hashed embeddings.
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-black/10 px-3 py-2">
      <div className="text-zinc-600">{label}</div>
      <div className="mt-1 truncate text-zinc-300">{value}</div>
    </div>
  );
}
