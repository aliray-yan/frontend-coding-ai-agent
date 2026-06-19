import { dialog } from "electron";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { detectLanguage, isTextLikeFile, shouldIgnoreDirectory } from "../../shared/rag";
import type {
  ApplyFileChangeRequest,
  FileReadResult,
  FileTreeNode,
  ProjectSummary,
  SearchFilesResult
} from "../../shared/types";
import type { LocalDatabase } from "../storage/database";
import type { RuntimePaths } from "../storage/paths";
import { resolveInside } from "../storage/paths";

const MAX_TREE_DEPTH = 5;
const MAX_READ_BYTES = 1_200_000;

export class ProjectService {
  constructor(
    private readonly db: LocalDatabase,
    private readonly paths: RuntimePaths
  ) {}

  listProjects(): ProjectSummary[] {
    return this.db.listProjects();
  }

  async openProjectDialog(): Promise<ProjectSummary | undefined> {
    const result = await dialog.showOpenDialog({
      title: "Open frontend project",
      properties: ["openDirectory"]
    });
    if (result.canceled || !result.filePaths[0]) return undefined;
    return this.openProject(result.filePaths[0]);
  }

  async openProject(projectPath: string): Promise<ProjectSummary> {
    const stat = await fs.stat(projectPath);
    if (!stat.isDirectory()) throw new Error("Selected path is not a directory.");
    return this.db.upsertProject({
      name: path.basename(projectPath),
      path: projectPath
    });
  }

  async createProject(input: { name: string; template: "portfolio" | "shopify-section" | "blank" }): Promise<ProjectSummary> {
    const safeName = input.name.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-|-$/g, "") || "frontend-project";
    const target = path.join(this.paths.projectsDir, safeName);
    await fs.mkdir(target, { recursive: true });

    if (input.template !== "blank") {
      const templatePath = path.join(this.paths.bundledTemplatesDir, input.template);
      if (fsSync.existsSync(templatePath)) {
        await fs.cp(templatePath, target, { recursive: true, force: false, errorOnExist: false });
      }
    } else {
      await fs.writeFile(
        path.join(target, "index.html"),
        `<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="utf-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1" />\n  <title>${safeName}</title>\n  <style>\n    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }\n    body { margin: 0; background: #fafaf8; color: #181817; }\n    main { width: min(100% - 32px, 960px); margin: 0 auto; padding: 64px 0; }\n    h1 { font-size: clamp(2.25rem, 6vw, 4.75rem); line-height: 0.95; margin: 0; letter-spacing: 0; }\n  </style>\n</head>\n<body>\n  <main>\n    <h1>${safeName}</h1>\n  </main>\n</body>\n</html>\n`,
        "utf8"
      );
    }

    return this.db.upsertProject({ name: safeName, path: target });
  }

  async getTree(projectId: string): Promise<FileTreeNode[]> {
    const project = this.requireProject(projectId);
    return listTree(project.path, project.path, 0);
  }

  async readFile(projectId: string, relativePath: string): Promise<FileReadResult> {
    const project = this.requireProject(projectId);
    const filePath = resolveInside(project.path, relativePath);
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) throw new Error("Selected path is not a file.");
    if (stat.size > MAX_READ_BYTES) throw new Error("File is too large to open in the editor.");
    const content = await fs.readFile(filePath, "utf8");
    return {
      path: filePath,
      relativePath,
      content,
      language: detectLanguage(filePath)
    };
  }

  async writeFile(input: ApplyFileChangeRequest): Promise<FileReadResult> {
    const project = this.requireProject(input.projectId);
    const filePath = resolveInside(project.path, input.relativePath);
    const exists = fsSync.existsSync(filePath);
    const previous = exists ? await fs.readFile(filePath, "utf8").catch(() => null) : null;

    this.db.createSnapshot({
      projectId: input.projectId,
      label: input.label || `Before writing ${input.relativePath}`,
      files: [{ relativePath: input.relativePath, content: previous }]
    });

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, input.content, "utf8");
    this.db.upsertProject({ id: project.id, name: project.name, path: project.path });
    return this.readFile(input.projectId, input.relativePath);
  }

  async rollbackLatest(projectId: string): Promise<string[]> {
    const project = this.requireProject(projectId);
    const snapshot = this.db.getLatestSnapshot(projectId);
    if (!snapshot) return [];

    const files = JSON.parse(snapshot.filesJson) as Array<{ relativePath: string; content: string | null }>;
    const restored: string[] = [];

    for (const file of files) {
      const filePath = resolveInside(project.path, file.relativePath);
      if (file.content === null) {
        if (fsSync.existsSync(filePath)) await fs.unlink(filePath);
      } else {
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, file.content, "utf8");
      }
      restored.push(file.relativePath);
    }

    return restored;
  }

  async searchFiles(projectId: string, query: string): Promise<SearchFilesResult[]> {
    const project = this.requireProject(projectId);
    const files = await listFiles(project.path);
    const results: SearchFilesResult[] = [];
    const needle = query.toLowerCase();

    for (const filePath of files) {
      if (!isTextLikeFile(filePath)) continue;
      const stat = await fs.stat(filePath);
      if (stat.size > MAX_READ_BYTES) continue;
      const content = await fs.readFile(filePath, "utf8").catch(() => "");
      const lines = content.split(/\r?\n/g);
      lines.forEach((line, index) => {
        if (line.toLowerCase().includes(needle)) {
          results.push({
            relativePath: path.relative(project.path, filePath),
            line: index + 1,
            preview: line.trim().slice(0, 180)
          });
        }
      });
      if (results.length >= 80) break;
    }

    return results;
  }

  async buildProjectContext(projectId?: string): Promise<string | undefined> {
    if (!projectId) return undefined;
    const project = this.requireProject(projectId);
    const files = await listFiles(project.path);
    const packageJson = files.find((file) => path.basename(file) === "package.json");
    const important = files
      .filter((file) => /\.(tsx|jsx|vue|svelte|astro|liquid|html|css)$/i.test(file))
      .slice(0, 12)
      .map((file) => path.relative(project.path, file));

    let summary = `Project: ${project.name}\nPath: ${project.path}\nImportant files:\n${important.map((file) => `- ${file}`).join("\n")}`;
    if (packageJson) {
      const content = await fs.readFile(packageJson, "utf8").catch(() => "");
      summary += `\n\npackage.json:\n${content.slice(0, 1800)}`;
    }
    return summary;
  }

  private requireProject(projectId: string): ProjectSummary {
    const project = this.db.getProject(projectId);
    if (!project) throw new Error("Project was not found.");
    return project;
  }
}

async function listTree(root: string, current: string, depth: number): Promise<FileTreeNode[]> {
  if (depth > MAX_TREE_DEPTH) return [];
  const entries = await fs.readdir(current, { withFileTypes: true });
  const nodes: FileTreeNode[] = [];

  for (const entry of entries) {
    if (entry.isDirectory() && shouldIgnoreDirectory(entry.name)) continue;
    const fullPath = path.join(current, entry.name);
    const relativePath = path.relative(root, fullPath);
    if (entry.isDirectory()) {
      nodes.push({
        name: entry.name,
        path: fullPath,
        relativePath,
        type: "directory",
        children: await listTree(root, fullPath, depth + 1)
      });
    } else {
      nodes.push({ name: entry.name, path: fullPath, relativePath, type: "file" });
    }
  }

  return nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

async function listFiles(root: string): Promise<string[]> {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (!shouldIgnoreDirectory(entry.name)) files.push(...(await listFiles(fullPath)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}
