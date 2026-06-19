import { ChevronDown, ChevronRight, FileCode2, Folder } from "lucide-react";
import { useState } from "react";
import clsx from "clsx";
import type { FileTreeNode } from "../../../shared/types";

export function FileTree({
  nodes,
  selectedPath,
  onSelect
}: {
  nodes: FileTreeNode[];
  selectedPath?: string;
  onSelect: (node: FileTreeNode) => void;
}) {
  return (
    <div className="space-y-1">
      {nodes.map((node) => (
        <TreeNode key={node.relativePath || node.path} node={node} selectedPath={selectedPath} onSelect={onSelect} />
      ))}
    </div>
  );
}

function TreeNode({
  node,
  selectedPath,
  onSelect
}: {
  node: FileTreeNode;
  selectedPath?: string;
  onSelect: (node: FileTreeNode) => void;
}) {
  const [open, setOpen] = useState(true);
  const isSelected = selectedPath === node.relativePath;

  if (node.type === "directory") {
    return (
      <div>
        <button
          className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-sm text-zinc-300 hover:bg-white/[0.06]"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <Folder className="h-4 w-4 text-brass" />
          <span className="truncate">{node.name}</span>
        </button>
        {open && node.children?.length ? (
          <div className="ml-4 border-l border-white/10 pl-2">
            <FileTree nodes={node.children} selectedPath={selectedPath} onSelect={onSelect} />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <button
      className={clsx(
        "flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-sm hover:bg-white/[0.06]",
        isSelected ? "bg-fern/15 text-fern" : "text-zinc-300"
      )}
      onClick={() => onSelect(node)}
    >
      <span className="w-4" />
      <FileCode2 className="h-4 w-4 text-tide" />
      <span className="truncate">{node.name}</span>
    </button>
  );
}
