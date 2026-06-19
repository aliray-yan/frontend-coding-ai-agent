import fs from "node:fs";
import path from "node:path";
import { LocalDatabase } from "../apps/desktop/src/main/storage/database";
import { getDefaultLlamaServerPath, validateModelConfig } from "../apps/desktop/src/main/llm/modelConfig";
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
    const config = db.getModelConfig();
    const serverPath = getDefaultLlamaServerPath(paths, config);
    const validation = validateModelConfig(paths, config);

    console.log(`Backend: llama.cpp`);
    console.log(`Configured model: ${config.modelPath || "(none)"}`);
    console.log(`Configured server: ${serverPath}`);
    console.log(`Server exists: ${fs.existsSync(serverPath)}`);
    console.log(`Model exists: ${config.modelPath ? fs.existsSync(config.modelPath) : false}`);
    console.log(`Port: ${config.port}`);
    console.log(`Status: ${validation.message}`);

    if (config.modelPath && path.extname(config.modelPath).toLowerCase() !== ".gguf") {
      process.exitCode = 1;
    }
  } finally {
    db.close();
  }
}
