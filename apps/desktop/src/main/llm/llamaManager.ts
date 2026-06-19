import { ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import type { ModelConfig, ModelStatus } from "../../shared/types";
import type { RuntimePaths } from "../storage/paths";
import { getDefaultLlamaServerPath, validateModelConfig } from "./modelConfig";

export class LlamaManager {
  private process?: ChildProcessWithoutNullStreams;
  private lastMessage = "Local backend is stopped.";
  private booting = false;

  constructor(
    private readonly paths: RuntimePaths,
    private getConfig: () => ModelConfig,
    private setConfig: (config: ModelConfig) => void
  ) {}

  get endpoint(): string {
    return `http://127.0.0.1:${this.getConfig().port}`;
  }

  async status(): Promise<ModelStatus> {
    const config = this.getConfig();
    const validation = validateModelConfig(this.paths, config);
    const healthy = validation.ok ? await this.isHealthy() : false;
    return {
      configured: validation.ok,
      running: Boolean(this.process && !this.process.killed),
      healthy,
      modelPath: config.modelPath,
      endpoint: this.endpoint,
      message: healthy ? "Local llama.cpp backend is ready." : validation.ok ? this.lastMessage : validation.message,
      pid: this.process?.pid
    };
  }

  async start(): Promise<ModelStatus> {
    const config = this.getConfig();
    const validation = validateModelConfig(this.paths, config);
    if (!validation.ok) {
      this.lastMessage = validation.message;
      return this.status();
    }

    if (await this.isHealthy()) {
      this.lastMessage = "Connected to an already running local llama.cpp backend.";
      return this.status();
    }

    if (this.process && !this.process.killed) return this.status();
    if (this.booting) return this.status();

    this.booting = true;
    const serverPath = validation.serverPath || getDefaultLlamaServerPath(this.paths, config);
    if (serverPath !== config.llamaServerPath) {
      this.setConfig({ ...config, llamaServerPath: serverPath });
    }

    const args = [
      "--model",
      config.modelPath,
      "--host",
      "127.0.0.1",
      "--port",
      String(config.port),
      "--ctx-size",
      String(config.contextSize),
      "--threads",
      String(config.threads),
      "--n-gpu-layers",
      String(config.gpuLayers)
    ];

    this.lastMessage = "Starting local llama.cpp backend...";
    this.process = spawn(serverPath, args, {
      cwd: this.paths.bundledLlamaDir,
      windowsHide: true,
      stdio: "pipe"
    });

    this.process.stdout.on("data", (data) => {
      const text = data.toString().trim();
      if (text) this.lastMessage = text.slice(-500);
    });

    this.process.stderr.on("data", (data) => {
      const text = data.toString().trim();
      if (text) this.lastMessage = text.slice(-500);
    });

    this.process.on("exit", (code) => {
      this.lastMessage = code === 0 ? "Local backend stopped." : `Local backend exited with code ${code}.`;
      this.process = undefined;
    });

    const healthy = await this.waitForHealth(45000);
    this.booting = false;
    this.lastMessage = healthy
      ? "Local llama.cpp backend is ready."
      : "llama.cpp backend did not become ready. Check the model, server binary, and available memory.";
    return this.status();
  }

  async stop(): Promise<ModelStatus> {
    if (this.process && !this.process.killed) {
      this.process.kill();
      this.lastMessage = "Stopping local backend...";
    }
    this.process = undefined;
    return this.status();
  }

  async restart(): Promise<ModelStatus> {
    await this.stop();
    return this.start();
  }

  async ensureReady(): Promise<void> {
    const current = await this.status();
    if (current.healthy) return;

    const afterStart = await this.start();
    if (!afterStart.healthy) {
      throw new Error(afterStart.message);
    }
  }

  private async isHealthy(): Promise<boolean> {
    try {
      const response = await fetch(`${this.endpoint}/v1/models`, { method: "GET" });
      return response.ok;
    } catch {
      try {
        const response = await fetch(`${this.endpoint}/health`, { method: "GET" });
        return response.ok;
      } catch {
        return false;
      }
    }
  }

  private async waitForHealth(timeoutMs: number): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (await this.isHealthy()) return true;
      await new Promise((resolve) => setTimeout(resolve, 800));
    }
    return false;
  }
}
