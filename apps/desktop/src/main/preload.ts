import { contextBridge, ipcRenderer } from "electron";
import type {
  AppSettings,
  ApplyFileChangeRequest,
  AssistantMode,
  ChatMessage,
  ChatRequest,
  ChatStreamEvent,
  ChatSummary,
  FileReadResult,
  FileTreeNode,
  KnowledgeHit,
  KnowledgeSource,
  ModelConfig,
  ModelStatus,
  ProjectSummary,
  SearchFilesResult,
  SystemStatus
} from "../shared/types";

const api = {
  system: {
    status: (): Promise<SystemStatus> => ipcRenderer.invoke("system:status")
  },
  settings: {
    get: (): Promise<AppSettings> => ipcRenderer.invoke("settings:get"),
    update: (settings: Partial<AppSettings>): Promise<AppSettings> => ipcRenderer.invoke("settings:update", settings)
  },
  model: {
    selectGguf: (): Promise<ModelConfig> => ipcRenderer.invoke("model:selectGguf"),
    selectServer: (): Promise<ModelConfig> => ipcRenderer.invoke("model:selectServer"),
    status: (): Promise<ModelStatus> => ipcRenderer.invoke("model:status"),
    start: (): Promise<ModelStatus> => ipcRenderer.invoke("model:start"),
    stop: (): Promise<ModelStatus> => ipcRenderer.invoke("model:stop"),
    test: (): Promise<string> => ipcRenderer.invoke("model:test")
  },
  knowledge: {
    list: (): Promise<KnowledgeSource[]> => ipcRenderer.invoke("knowledge:list"),
    importUiUx: (): Promise<KnowledgeSource> => ipcRenderer.invoke("knowledge:importUiUx"),
    importDocs: (): Promise<KnowledgeSource> => ipcRenderer.invoke("knowledge:importDocs"),
    addFolder: (): Promise<KnowledgeSource | undefined> => ipcRenderer.invoke("knowledge:addFolder"),
    search: (query: string): Promise<KnowledgeHit[]> => ipcRenderer.invoke("knowledge:search", query)
  },
  chats: {
    list: (): Promise<ChatSummary[]> => ipcRenderer.invoke("chats:list"),
    create: (mode: AssistantMode): Promise<ChatSummary> => ipcRenderer.invoke("chats:create", mode),
    messages: (chatId: string): Promise<ChatMessage[]> => ipcRenderer.invoke("chats:messages", chatId),
    send: (request: ChatRequest): Promise<ChatMessage> => ipcRenderer.invoke("chats:send", request),
    onStream: (callback: (event: ChatStreamEvent) => void) => {
      const listener = (_: Electron.IpcRendererEvent, payload: ChatStreamEvent) => callback(payload);
      ipcRenderer.on("chat:stream", listener);
      return () => {
        ipcRenderer.removeListener("chat:stream", listener);
      };
    }
  },
  projects: {
    list: (): Promise<ProjectSummary[]> => ipcRenderer.invoke("projects:list"),
    openDialog: (): Promise<ProjectSummary | undefined> => ipcRenderer.invoke("projects:openDialog"),
    create: (input: { name: string; template: "portfolio" | "shopify-section" | "blank" }): Promise<ProjectSummary> =>
      ipcRenderer.invoke("projects:create", input),
    tree: (projectId: string): Promise<FileTreeNode[]> => ipcRenderer.invoke("projects:tree", projectId),
    readFile: (projectId: string, relativePath: string): Promise<FileReadResult> =>
      ipcRenderer.invoke("projects:readFile", projectId, relativePath),
    writeFile: (request: ApplyFileChangeRequest): Promise<FileReadResult> =>
      ipcRenderer.invoke("projects:writeFile", request),
    rollback: (projectId: string): Promise<string[]> => ipcRenderer.invoke("projects:rollback", projectId),
    search: (projectId: string, query: string): Promise<SearchFilesResult[]> =>
      ipcRenderer.invoke("projects:search", projectId, query)
  }
};

contextBridge.exposeInMainWorld("frontendAgent", api);

export type FrontendAgentApi = typeof api;
