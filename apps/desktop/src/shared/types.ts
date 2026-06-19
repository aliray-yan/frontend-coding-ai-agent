export type AppScreen = "home" | "chat" | "project" | "knowledge" | "settings";

export type AssistantMode =
  | "general"
  | "tailwind"
  | "react-next"
  | "shopify-liquid"
  | "shopline"
  | "pixel-perfect"
  | "responsive"
  | "ui-ux-review";

export type ThemePreference = "dark" | "light" | "system";

export interface ModelConfig {
  backendType: "llama.cpp";
  modelPath: string;
  llamaServerPath: string;
  port: number;
  contextSize: number;
  temperature: number;
  maxTokens: number;
  gpuLayers: number;
  threads: number;
  autoStart: boolean;
}

export interface ModelStatus {
  configured: boolean;
  running: boolean;
  healthy: boolean;
  modelPath?: string;
  endpoint?: string;
  message: string;
  pid?: number;
}

export interface KnowledgeSource {
  id: string;
  name: string;
  type: "folder" | "repo" | "docs" | "seed" | "project";
  path: string;
  status: "indexed" | "pending" | "error";
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface KnowledgeHit {
  id: string;
  sourceId: string;
  sourceName: string;
  title: string;
  path: string;
  content: string;
  score: number;
  tags: string[];
}

export interface ChatSummary {
  id: string;
  title: string;
  mode: AssistantMode;
  model: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  sources?: KnowledgeHit[];
}

export interface ChatRequest {
  requestId: string;
  chatId: string;
  content: string;
  mode: AssistantMode;
  sourceIds?: string[];
  projectId?: string;
}

export interface ChatStreamEvent {
  requestId: string;
  chatId: string;
  delta?: string;
  done?: boolean;
  error?: string;
  sources?: KnowledgeHit[];
  message?: ChatMessage;
}

export interface ProjectSummary {
  id: string;
  name: string;
  path: string;
  createdAt: string;
  updatedAt: string;
}

export interface FileTreeNode {
  name: string;
  path: string;
  relativePath: string;
  type: "file" | "directory";
  children?: FileTreeNode[];
}

export interface FileReadResult {
  path: string;
  relativePath: string;
  content: string;
  language: string;
}

export interface SnapshotSummary {
  id: string;
  projectId: string;
  label: string;
  createdAt: string;
  files: string[];
}

export interface AppSettings {
  model: ModelConfig;
  theme: ThemePreference;
  offlineMode: boolean;
  storagePath: string;
  embeddingModel: "local-hash";
}

export interface SetupState {
  hasModel: boolean;
  inferenceTested: boolean;
  uiUxImported: boolean;
  docsImported: boolean;
  indexBuilt: boolean;
}

export interface SystemStatus {
  model: ModelStatus;
  knowledgeSources: KnowledgeSource[];
  projectCount: number;
  chatCount: number;
}

export interface ApplyFileChangeRequest {
  projectId: string;
  relativePath: string;
  content: string;
  label?: string;
}

export interface SearchFilesResult {
  relativePath: string;
  line: number;
  preview: string;
}
