import fs from "node:fs";
import path from "node:path";
import type { ModelConfig } from "../../shared/types";
import type { RuntimePaths } from "../storage/paths";

export function getDefaultLlamaServerPath(paths: RuntimePaths, config?: Partial<ModelConfig>): string {
  const bundledDefault = path.join(paths.bundledLlamaDir, "llama-server.exe");
  const candidates = [
    config?.llamaServerPath,
    process.env.FRONTEND_AGENT_LLAMA_SERVER_PATH,
    bundledDefault,
    path.join(paths.bundledLlamaDir, "llama-server"),
    path.join(paths.bundledLlamaDir, "server.exe"),
    path.join(paths.bundledLlamaDir, "server")
  ].filter(Boolean) as string[];

  return candidates.find((candidate) => fs.existsSync(candidate)) || bundledDefault;
}

export function validateModelConfig(paths: RuntimePaths, config: ModelConfig): {
  ok: boolean;
  message: string;
  serverPath: string;
} {
  if (!config.modelPath) {
    return {
      ok: false,
      message: "No local GGUF model selected. Please choose a local coding model file before chatting.",
      serverPath: getDefaultLlamaServerPath(paths, config)
    };
  }

  if (!fs.existsSync(config.modelPath) || path.extname(config.modelPath).toLowerCase() !== ".gguf") {
    return {
      ok: false,
      message: "The selected model file was not found or is not a .gguf file.",
      serverPath: getDefaultLlamaServerPath(paths, config)
    };
  }

  const serverPath = getDefaultLlamaServerPath(paths, config);
  if (!serverPath || !fs.existsSync(serverPath)) {
    return {
      ok: false,
      message:
        "llama.cpp server executable not found. Add llama-server.exe to vendor/llama.cpp or set a llama.cpp server path in Settings.",
      serverPath
    };
  }

  return { ok: true, message: "Local GGUF model is configured.", serverPath };
}
