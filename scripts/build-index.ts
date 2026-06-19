import fs from "node:fs/promises";
import path from "node:path";
import { LocalDatabase } from "../apps/desktop/src/main/storage/database";
import { RagService } from "../apps/desktop/src/main/rag/ragService";
import { getScriptRuntimePaths } from "./scriptPaths";

const paths = getScriptRuntimePaths();
const db = new LocalDatabase(paths.databasePath);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main(): Promise<void> {
  try {
    await db.init();
    const rag = new RagService(db, paths);
    const indexed = [];

    indexed.push(await rag.importBundledFrontendDocs());

    const rawEntries = await fs.readdir(paths.knowledgeRawDir, { withFileTypes: true }).catch(() => []);
    for (const entry of rawEntries) {
      if (!entry.isDirectory()) continue;
      const folderPath = path.join(paths.knowledgeRawDir, entry.name);
      indexed.push(
        await rag.importFolder({
          folderPath,
          name: entry.name === "ui-ux-pro-max-skill" ? "UI UX Pro Max Skill" : entry.name,
          type: entry.name.includes("ui-ux") ? "repo" : "folder"
        })
      );
    }

    for (const source of indexed) {
      console.log(`${source.status}: ${source.name} (${source.chunkCount} chunks)`);
    }
  } finally {
    db.close();
  }
}
