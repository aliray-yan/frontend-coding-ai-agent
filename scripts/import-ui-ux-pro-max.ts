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
    const source = await rag.importUiUxProMax();
    console.log(`Indexed ${source.name}: ${source.chunkCount} chunks`);
    if (source.status === "error") process.exitCode = 1;
  } finally {
    db.close();
  }
}
