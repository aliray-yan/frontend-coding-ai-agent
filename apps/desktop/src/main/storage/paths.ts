import { app } from "electron";
import fs from "node:fs";
import path from "node:path";

export interface RuntimePaths {
  appRoot: string;
  dataDir: string;
  databasePath: string;
  knowledgeRawDir: string;
  knowledgeProcessedDir: string;
  bundledDocsDir: string;
  bundledTemplatesDir: string;
  bundledLlamaDir: string;
  projectsDir: string;
}

export function getRuntimePaths(): RuntimePaths {
  const appRoot = app.isPackaged ? process.resourcesPath : process.cwd();
  const writableRoot = app.isPackaged ? path.join(app.getPath("userData"), "workspace") : appRoot;
  const configuredDataDir = process.env.FRONTEND_AGENT_DATA_DIR;
  const dataDir = configuredDataDir
    ? path.resolve(configuredDataDir)
    : app.isPackaged
      ? path.join(app.getPath("userData"), "data")
      : path.join(appRoot, "data");

  const paths: RuntimePaths = {
    appRoot,
    dataDir,
    databasePath: path.join(dataDir, "app.db"),
    knowledgeRawDir: path.join(writableRoot, "knowledge", "raw"),
    knowledgeProcessedDir: path.join(writableRoot, "knowledge", "processed"),
    bundledDocsDir: path.join(appRoot, "docs", "frontend-docs"),
    bundledTemplatesDir: path.join(appRoot, "examples", "templates"),
    bundledLlamaDir: path.join(appRoot, "vendor", "llama.cpp"),
    projectsDir: path.join(writableRoot, "projects")
  };

  for (const dir of [
    paths.dataDir,
    paths.knowledgeRawDir,
    paths.knowledgeProcessedDir,
    paths.projectsDir
  ]) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return paths;
}

export function resolveInside(base: string, requested: string): string {
  const resolved = path.resolve(base, requested);
  const normalizedBase = path.resolve(base);
  if (resolved !== normalizedBase && !resolved.startsWith(`${normalizedBase}${path.sep}`)) {
    throw new Error("Requested path is outside the allowed project folder.");
  }
  return resolved;
}
