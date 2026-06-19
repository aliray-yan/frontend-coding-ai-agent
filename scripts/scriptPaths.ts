import fs from "node:fs";
import path from "node:path";
import type { RuntimePaths } from "../apps/desktop/src/main/storage/paths";

export function getScriptRuntimePaths(): RuntimePaths {
  const appRoot = process.cwd();
  const dataDir = path.join(appRoot, "data");
  const paths: RuntimePaths = {
    appRoot,
    dataDir,
    databasePath: path.join(dataDir, "app.db"),
    knowledgeRawDir: path.join(appRoot, "knowledge", "raw"),
    knowledgeProcessedDir: path.join(appRoot, "knowledge", "processed"),
    bundledDocsDir: path.join(appRoot, "docs", "frontend-docs"),
    bundledTemplatesDir: path.join(appRoot, "examples", "templates"),
    bundledLlamaDir: path.join(appRoot, "vendor", "llama.cpp"),
    projectsDir: path.join(appRoot, "projects")
  };

  for (const dir of [
    paths.dataDir,
    paths.knowledgeRawDir,
    paths.knowledgeProcessedDir,
    paths.bundledDocsDir,
    paths.projectsDir
  ]) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return paths;
}
