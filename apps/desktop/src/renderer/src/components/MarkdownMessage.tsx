import { Check, Clipboard, FileDown } from "lucide-react";
import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "./Button";
import type { KnowledgeHit } from "../../../shared/types";

export function MarkdownMessage({
  content,
  sources,
  activeProjectId,
  onApplied
}: {
  content: string;
  sources?: KnowledgeHit[];
  activeProjectId?: string;
  onApplied?: () => void;
}) {
  return (
    <div className="prose-agent max-w-none text-sm leading-6 text-zinc-100">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children }) {
            const code = String(children);
            const isInline = !className && !code.includes("\n");
            if (isInline) return <code className={className}>{children}</code>;
            return (
              <CodeBlock
                className={className}
                activeProjectId={activeProjectId}
                onApplied={onApplied}
                code={code.replace(/\n$/, "")}
              />
            );
          }
        }}
      >
        {content}
      </ReactMarkdown>
      {sources?.length ? (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-3">
          {sources.slice(0, 6).map((source) => (
            <span
              key={source.id}
              className="rounded-md border border-tide/30 bg-tide/10 px-2 py-1 text-xs text-tide"
              title={source.path}
            >
              {source.sourceName}: {source.title}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CodeBlock({
  code,
  className,
  activeProjectId,
  onApplied
}: {
  code: string;
  className?: string;
  activeProjectId?: string;
  onApplied?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const language = useMemo(() => className?.replace("language-", "") || "code", [className]);

  async function copyCode() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  async function applyCode() {
    if (!activeProjectId) {
      window.alert("Open or create a project before applying generated code.");
      return;
    }
    const relativePath = window.prompt("Apply code to which project file?", inferPathFromCode(code));
    if (!relativePath) return;
    await window.frontendAgent.projects.writeFile({
      projectId: activeProjectId,
      relativePath,
      content: code,
      label: `Applied AI code to ${relativePath}`
    });
    onApplied?.();
  }

  return (
    <div className="my-3 overflow-hidden rounded-md border border-white/10 bg-black/35">
      <div className="flex h-10 items-center justify-between border-b border-white/10 bg-white/[0.04] px-3">
        <span className="text-xs font-medium uppercase text-zinc-400">{language}</span>
        <div className="flex items-center gap-2">
          <Button variant="ghost" className="h-7 px-2" onClick={copyCode} title="Copy code">
            {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" className="h-7 px-2" onClick={applyCode} title="Apply to project">
            <FileDown className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <pre className="app-scrollbar max-h-[520px] overflow-auto p-4 text-[13px] leading-6 text-zinc-100">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function inferPathFromCode(code: string): string {
  if (code.includes("export default") || code.includes("function ") || code.includes("const ")) return "src/App.tsx";
  if (code.includes("{%") || code.includes("schema")) return "sections/generated-section.liquid";
  if (code.includes("<!doctype html") || code.includes("<html")) return "index.html";
  if (code.includes("@tailwind") || code.includes(":root")) return "src/styles.css";
  return "src/generated.tsx";
}
