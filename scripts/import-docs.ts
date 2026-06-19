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
    const folderArg = process.argv.find((arg) => arg.startsWith("--folder="));
    const urlArg = process.argv.find((arg) => arg.startsWith("--url="));

    if (urlArg) {
      const url = urlArg.slice("--url=".length);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to download ${url}: HTTP ${response.status}`);
      const text = await response.text();
      const targetDir = path.join(paths.knowledgeRawDir, "downloaded-docs");
      await fs.mkdir(targetDir, { recursive: true });
      const fileName = new URL(url).hostname.replace(/[^a-z0-9.-]+/gi, "-") + ".html";
      const target = path.join(targetDir, fileName);
      await fs.writeFile(target, text, "utf8");
      const source = await rag.importFolder({ folderPath: targetDir, name: "Downloaded Frontend Docs", type: "docs" });
      console.log(`Indexed ${source.name}: ${source.chunkCount} chunks`);
    } else if (folderArg) {
      const folderPath = path.resolve(folderArg.slice("--folder=".length));
      const source = await rag.importFolder({ folderPath, name: path.basename(folderPath), type: "docs" });
      console.log(`Indexed ${source.name}: ${source.chunkCount} chunks`);
    } else {
      const source = await rag.importBundledFrontendDocs();
      console.log(`Indexed ${source.name}: ${source.chunkCount} chunks`);
    }
  } finally {
    db.close();
  }
}
