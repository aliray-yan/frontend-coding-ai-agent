import { app, BrowserWindow, dialog, ipcMain } from "electron";
import path from "node:path";
import { LocalDatabase } from "./storage/database";
import { getRuntimePaths, type RuntimePaths } from "./storage/paths";
import { LlamaManager } from "./llm/llamaManager";
import { streamLocalChatCompletion } from "./llm/inferenceClient";
import { RagService, formatHitsForPrompt } from "./rag/ragService";
import { ProjectService } from "./projects/projectService";
import { buildPromptWithContext } from "../shared/prompts";
import type {
  AppSettings,
  AssistantMode,
  ChatRequest,
  ChatStreamEvent,
  ModelConfig,
  SystemStatus
} from "../shared/types";

let mainWindow: BrowserWindow | undefined;
let db: LocalDatabase;
let llama: LlamaManager;
let rag: RagService;
let projects: ProjectService;
let paths: RuntimePaths;

async function bootstrap(): Promise<void> {
  paths = getRuntimePaths();
  db = new LocalDatabase(paths.databasePath);
  await db.init();

  llama = new LlamaManager(
    paths,
    () => db.getModelConfig(),
    (config) => db.setModelConfig(config)
  );
  rag = new RagService(db, paths);
  projects = new ProjectService(db, paths);

  registerIpc();
  createWindow();

  const config = db.getModelConfig();
  if (config.autoStart && config.modelPath) {
    llama.start().catch(() => undefined);
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 1080,
    minHeight: 720,
    title: "Frontend Coding AI Agent",
    icon: app.isPackaged
      ? path.join(process.resourcesPath, "build", "icon.ico")
      : path.join(process.cwd(), "build", "icon.ico"),
    backgroundColor: "#11100e",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.once("ready-to-show", () => mainWindow?.show());

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}

function registerIpc(): void {
  ipcMain.handle("system:status", async (): Promise<SystemStatus> => {
    const stats = db.getStats();
    return {
      model: await llama.status(),
      knowledgeSources: rag.listSources(),
      projectCount: stats.projectCount,
      chatCount: stats.chatCount
    };
  });

  ipcMain.handle("settings:get", async (): Promise<AppSettings> => ({
    model: db.getModelConfig(),
    theme: db.getTheme(),
    offlineMode: db.getOfflineMode(),
    storagePath: paths.dataDir,
    embeddingModel: "local-hash"
  }));

  ipcMain.handle("settings:update", async (_event, partial: Partial<AppSettings>) => {
    if (partial.model) db.setModelConfig({ ...db.getModelConfig(), ...partial.model });
    if (partial.theme) db.setTheme(partial.theme);
    if (typeof partial.offlineMode === "boolean") db.setOfflineMode(partial.offlineMode);
    return {
      model: db.getModelConfig(),
      theme: db.getTheme(),
      offlineMode: db.getOfflineMode(),
      storagePath: paths.dataDir,
      embeddingModel: "local-hash"
    } satisfies AppSettings;
  });

  ipcMain.handle("model:selectGguf", async () => {
    const result = await dialog.showOpenDialog({
      title: "Choose a local GGUF model",
      properties: ["openFile"],
      filters: [{ name: "GGUF models", extensions: ["gguf"] }]
    });
    if (result.canceled || !result.filePaths[0]) return db.getModelConfig();
    const config = { ...db.getModelConfig(), modelPath: result.filePaths[0] };
    db.setModelConfig(config);
    return config;
  });

  ipcMain.handle("model:selectServer", async () => {
    const result = await dialog.showOpenDialog({
      title: "Choose llama.cpp server executable",
      properties: ["openFile"],
      filters: [{ name: "llama.cpp server", extensions: ["exe", "*"] }]
    });
    if (result.canceled || !result.filePaths[0]) return db.getModelConfig();
    const config = { ...db.getModelConfig(), llamaServerPath: result.filePaths[0] };
    db.setModelConfig(config);
    return config;
  });

  ipcMain.handle("model:status", () => llama.status());
  ipcMain.handle("model:start", () => llama.start());
  ipcMain.handle("model:stop", () => llama.stop());
  ipcMain.handle("model:test", async () => {
    await llama.ensureReady();
    let output = "";
    await streamLocalChatCompletion({
      endpoint: llama.endpoint,
      config: { ...db.getModelConfig(), maxTokens: 64, temperature: 0 },
      messages: [
        {
          role: "system",
          content: "You are a local test endpoint. Reply with one short sentence confirming readiness."
        },
        { role: "user", content: "Confirm local inference is working." }
      ],
      onToken: (token) => {
        output += token;
      }
    });
    return output.trim();
  });

  ipcMain.handle("knowledge:list", () => rag.listSources());
  ipcMain.handle("knowledge:importUiUx", () => rag.importUiUxProMax());
  ipcMain.handle("knowledge:importDocs", () => rag.importBundledFrontendDocs());
  ipcMain.handle("knowledge:addFolder", async () => {
    const result = await dialog.showOpenDialog({
      title: "Add documentation folder",
      properties: ["openDirectory"]
    });
    if (result.canceled || !result.filePaths[0]) return undefined;
    return rag.importFolder({ folderPath: result.filePaths[0] });
  });
  ipcMain.handle("knowledge:search", (_event, query: string) => rag.search(query, { limit: 12 }));

  ipcMain.handle("chats:list", () => db.listChats());
  ipcMain.handle("chats:create", (_event, mode: AssistantMode) => db.createChat(mode));
  ipcMain.handle("chats:messages", (_event, chatId: string) => db.listMessages(chatId));
  ipcMain.handle("chats:send", async (event, request: ChatRequest) => {
    const sender = event.sender;
    const stream = (payload: ChatStreamEvent) => sender.send("chat:stream", payload);

    try {
      const currentChat = db.listChats().find((chat) => chat.id === request.chatId);
      db.addMessage({ chatId: request.chatId, role: "user", content: request.content });
      if (currentChat?.title === "New frontend chat") {
        db.renameChat(request.chatId, request.content.replace(/\s+/g, " ").slice(0, 54));
      }

      const hits = rag.search(`${request.mode}\n${request.content}`, {
        sourceIds: request.sourceIds,
        limit: 8
      });
      stream({ requestId: request.requestId, chatId: request.chatId, sources: hits });

      const projectContext = await projects.buildProjectContext(request.projectId);
      const systemPrompt = buildPromptWithContext({
        mode: request.mode,
        contextBlocks: formatHitsForPrompt(hits),
        projectContext
      });
      const history = db
        .listMessages(request.chatId)
        .slice(-12)
        .filter((message) => message.role !== "system")
        .map((message) => ({ role: message.role as "user" | "assistant", content: message.content }));

      await llama.ensureReady();
      const fullText = await streamLocalChatCompletion({
        endpoint: llama.endpoint,
        config: db.getModelConfig(),
        messages: [{ role: "system", content: systemPrompt }, ...history],
        onToken: (delta) => stream({ requestId: request.requestId, chatId: request.chatId, delta })
      });

      const assistantMessage = db.addMessage({
        chatId: request.chatId,
        role: "assistant",
        content: fullText || "The local model returned an empty response.",
        sources: hits
      });
      stream({
        requestId: request.requestId,
        chatId: request.chatId,
        done: true,
        sources: hits,
        message: assistantMessage
      });
      return assistantMessage;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      stream({ requestId: request.requestId, chatId: request.chatId, error: message, done: true });
      throw error;
    }
  });

  ipcMain.handle("projects:list", () => projects.listProjects());
  ipcMain.handle("projects:openDialog", () => projects.openProjectDialog());
  ipcMain.handle("projects:create", (_event, input: { name: string; template: "portfolio" | "shopify-section" | "blank" }) =>
    projects.createProject(input)
  );
  ipcMain.handle("projects:tree", (_event, projectId: string) => projects.getTree(projectId));
  ipcMain.handle("projects:readFile", (_event, projectId: string, relativePath: string) =>
    projects.readFile(projectId, relativePath)
  );
  ipcMain.handle("projects:writeFile", (_event, request) => projects.writeFile(request));
  ipcMain.handle("projects:rollback", (_event, projectId: string) => projects.rollbackLatest(projectId));
  ipcMain.handle("projects:search", (_event, projectId: string, query: string) => projects.searchFiles(projectId, query));
}

app.whenReady().then(bootstrap).catch((error) => {
  dialog.showErrorBox("Frontend Coding AI Agent failed to start", error instanceof Error ? error.message : String(error));
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", async () => {
  await llama?.stop();
  db?.close();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
