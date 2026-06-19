import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  chunkText,
  cosineSimilarity,
  embedText,
  isTextLikeFile,
  shouldIgnoreDirectory,
  sourceNameFromPath
} from "../../shared/rag";
import type { KnowledgeHit, KnowledgeSource } from "../../shared/types";
import type { LocalDatabase } from "../storage/database";
import type { RuntimePaths } from "../storage/paths";

const UI_UX_REPO_URL = "https://github.com/nextlevelbuilder/ui-ux-pro-max-skill.git";
const MAX_FILE_BYTES = 850_000;

export class RagService {
  constructor(
    private readonly db: LocalDatabase,
    private readonly paths: RuntimePaths
  ) {}

  listSources(): KnowledgeSource[] {
    return this.db.listKnowledgeSources();
  }

  search(query: string, options: { sourceIds?: string[]; limit?: number } = {}): KnowledgeHit[] {
    const sourceFilter = new Set(options.sourceIds || []);
    const queryEmbedding = embedText(query);
    const hits = this.db
      .listKnowledgeChunks()
      .filter((chunk) => !sourceFilter.size || sourceFilter.has(chunk.sourceId))
      .map((chunk) => ({
        ...chunk,
        score: cosineSimilarity(queryEmbedding, chunk.embedding)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, options.limit || 8);

    return hits.map(({ embedding: _embedding, ...hit }) => hit);
  }

  async importFolder(input: {
    folderPath: string;
    name?: string;
    type?: KnowledgeSource["type"];
  }): Promise<KnowledgeSource> {
    const stat = await fs.stat(input.folderPath);
    if (!stat.isDirectory()) throw new Error("Selected knowledge source is not a folder.");

    const sourceName = input.name || path.basename(input.folderPath);
    const sourceId = stableId(input.folderPath);
    const source = this.db.upsertKnowledgeSource({
      id: sourceId,
      name: sourceName,
      type: input.type || "folder",
      path: input.folderPath,
      status: "pending",
      chunkCount: 0,
      metadata: { indexedBy: "local-hash", importedAt: new Date().toISOString() }
    });

    try {
      const files = await listTextFiles(input.folderPath);
      const chunks: Parameters<LocalDatabase["replaceChunks"]>[1] = [];

      for (const filePath of files) {
        const fileStat = await fs.stat(filePath);
        if (fileStat.size > MAX_FILE_BYTES || shouldSkipFile(filePath)) continue;

        const content = await fs.readFile(filePath, "utf8").catch(() => "");
        if (!content.trim()) continue;

        const relativePath = path.relative(input.folderPath, filePath);
        const fileChunks = chunkText(content);
        fileChunks.forEach((chunk, index) => {
          const title = `${relativePath}${fileChunks.length > 1 ? ` #${index + 1}` : ""}`;
          chunks.push({
            title,
            path: filePath,
            content: chunk,
            embedding: embedText(`${sourceName}\n${relativePath}\n${chunk}`),
            tags: [path.extname(filePath).replace(".", ""), sourceName].filter(Boolean)
          });
        });
      }

      this.db.replaceChunks({ id: source.id, name: sourceName }, chunks);
      return {
        ...source,
        status: "indexed",
        chunkCount: chunks.length,
        updatedAt: new Date().toISOString()
      };
    } catch (error) {
      return this.db.upsertKnowledgeSource({
        ...source,
        status: "error",
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });
    }
  }

  async importUiUxProMax(): Promise<KnowledgeSource> {
    const target = path.join(this.paths.knowledgeRawDir, "ui-ux-pro-max-skill");
    await fs.mkdir(this.paths.knowledgeRawDir, { recursive: true });

    try {
      await fs.stat(target);
    } catch {
      await cloneRepo(UI_UX_REPO_URL, target);
    }

    return this.importFolder({
      folderPath: target,
      name: "UI UX Pro Max Skill",
      type: "repo"
    });
  }

  async importBundledFrontendDocs(): Promise<KnowledgeSource> {
    return this.importFolder({
      folderPath: this.paths.bundledDocsDir,
      name: "Bundled Frontend Docs",
      type: "docs"
    });
  }
}

async function listTextFiles(root: string): Promise<string[]> {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (!shouldIgnoreDirectory(entry.name)) files.push(...(await listTextFiles(fullPath)));
      continue;
    }

    if (entry.isFile() && isTextLikeFile(fullPath)) files.push(fullPath);
  }

  return files;
}

function shouldSkipFile(filePath: string): boolean {
  const base = path.basename(filePath).toLowerCase();
  return (
    base === "package-lock.json" ||
    base === "bun.lock" ||
    base === "pnpm-lock.yaml" ||
    base === "yarn.lock" ||
    base.includes(".min.")
  );
}

function stableId(input: string): string {
  return createHash("sha1").update(path.resolve(input).toLowerCase()).digest("hex");
}

function cloneRepo(repoUrl: string, target: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("git", ["clone", "--depth", "1", repoUrl, target], {
      windowsHide: true,
      stdio: "pipe"
    });

    let stderr = "";
    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr || `git clone exited with code ${code}`));
    });
  });
}

export function formatHitsForPrompt(hits: KnowledgeHit[]): string[] {
  return hits.map((hit, index) => {
    const label = `[${index + 1}] ${hit.sourceName} - ${sourceNameFromPath(hit.path)} (score ${hit.score.toFixed(2)})`;
    return `${label}\n${hit.content}`;
  });
}
