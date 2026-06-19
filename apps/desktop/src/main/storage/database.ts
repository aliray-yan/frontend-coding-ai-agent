import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import initSqlJs, { Database, SqlJsStatic } from "sql.js";
import type {
  AssistantMode,
  ChatMessage,
  ChatSummary,
  KnowledgeHit,
  KnowledgeSource,
  ModelConfig,
  ProjectSummary,
  SnapshotSummary,
  ThemePreference
} from "../../shared/types";

const nodeRequire = createRequire(
  typeof __filename !== "undefined" ? __filename : path.join(process.cwd(), "package.json")
);

export class LocalDatabase {
  private SQL?: SqlJsStatic;
  private db?: Database;
  private saveTimer?: NodeJS.Timeout;

  constructor(private readonly databasePath: string) {}

  async init(): Promise<void> {
    const wasmPath = nodeRequire.resolve("sql.js/dist/sql-wasm.wasm");
    this.SQL = await initSqlJs({
      locateFile: () => wasmPath
    });

    fs.mkdirSync(path.dirname(this.databasePath), { recursive: true });
    if (fs.existsSync(this.databasePath)) {
      const file = fs.readFileSync(this.databasePath);
      this.db = new this.SQL.Database(file);
    } else {
      this.db = new this.SQL.Database();
    }

    this.execSchema();
    this.ensureDefaults();
    this.saveNow();
  }

  close(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveNow();
    this.db?.close();
  }

  getModelConfig(): ModelConfig {
    const defaults: ModelConfig = {
      backendType: "llama.cpp",
      modelPath: "",
      llamaServerPath: "",
      port: Number(process.env.FRONTEND_AGENT_LLAMA_PORT || 39281),
      contextSize: 4096,
      temperature: 0.35,
      maxTokens: 1600,
      gpuLayers: 0,
      threads: Math.max(2, Math.min(8, os.cpus().length || 4)),
      autoStart: true
    };
    return { ...defaults, ...this.getJsonSetting<Partial<ModelConfig>>("model", {}) };
  }

  setModelConfig(config: ModelConfig): void {
    this.setJsonSetting("model", config);
  }

  getTheme(): ThemePreference {
    return this.getSetting("theme", "dark") as ThemePreference;
  }

  setTheme(theme: ThemePreference): void {
    this.setSetting("theme", theme);
  }

  getOfflineMode(): boolean {
    return this.getSetting("offlineMode", "true") === "true";
  }

  setOfflineMode(value: boolean): void {
    this.setSetting("offlineMode", String(value));
  }

  listChats(): ChatSummary[] {
    return this.all<ChatSummary>(
      "SELECT id, title, mode, model, createdAt, updatedAt FROM chats ORDER BY updatedAt DESC"
    ).map((chat) => ({ ...chat, mode: chat.mode as AssistantMode }));
  }

  createChat(mode: AssistantMode, title = "New frontend chat"): ChatSummary {
    const now = new Date().toISOString();
    const id = randomUUID();
    this.run(
      "INSERT INTO chats (id, title, mode, model, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)",
      [id, title, mode, this.getModelConfig().modelPath || "local-gguf", now, now]
    );
    this.scheduleSave();
    return { id, title, mode, model: this.getModelConfig().modelPath || "local-gguf", createdAt: now, updatedAt: now };
  }

  renameChat(chatId: string, title: string): void {
    this.run("UPDATE chats SET title = ?, updatedAt = ? WHERE id = ?", [
      title,
      new Date().toISOString(),
      chatId
    ]);
    this.scheduleSave();
  }

  deleteChat(chatId: string): void {
    this.run("DELETE FROM messages WHERE chatId = ?", [chatId]);
    this.run("DELETE FROM chats WHERE id = ?", [chatId]);
    this.scheduleSave();
  }

  listMessages(chatId: string): ChatMessage[] {
    return this.all<Record<string, string>>(
      "SELECT id, chatId, role, content, createdAt, sourcesJson FROM messages WHERE chatId = ? ORDER BY createdAt ASC",
      [chatId]
    ).map((row) => ({
      id: row.id,
      chatId: row.chatId,
      role: row.role as ChatMessage["role"],
      content: row.content,
      createdAt: row.createdAt,
      sources: row.sourcesJson ? JSON.parse(row.sourcesJson) : []
    }));
  }

  addMessage(message: Omit<ChatMessage, "id" | "createdAt"> & { id?: string; createdAt?: string }): ChatMessage {
    const createdAt = message.createdAt || new Date().toISOString();
    const id = message.id || randomUUID();
    const sourcesJson = JSON.stringify(message.sources || []);
    this.run(
      "INSERT INTO messages (id, chatId, role, content, createdAt, sourcesJson) VALUES (?, ?, ?, ?, ?, ?)",
      [id, message.chatId, message.role, message.content, createdAt, sourcesJson]
    );
    this.run("UPDATE chats SET updatedAt = ? WHERE id = ?", [createdAt, message.chatId]);
    this.scheduleSave();
    return { id, chatId: message.chatId, role: message.role, content: message.content, createdAt, sources: message.sources };
  }

  listKnowledgeSources(): KnowledgeSource[] {
    return this.all<Record<string, string | number>>(
      "SELECT id, name, type, path, status, chunkCount, createdAt, updatedAt, metadataJson FROM knowledge_sources ORDER BY updatedAt DESC"
    ).map((row) => ({
      id: String(row.id),
      name: String(row.name),
      type: row.type as KnowledgeSource["type"],
      path: String(row.path),
      status: row.status as KnowledgeSource["status"],
      chunkCount: Number(row.chunkCount),
      createdAt: String(row.createdAt),
      updatedAt: String(row.updatedAt),
      metadata: row.metadataJson ? JSON.parse(String(row.metadataJson)) : {}
    }));
  }

  upsertKnowledgeSource(source: Omit<KnowledgeSource, "createdAt" | "updatedAt">): KnowledgeSource {
    const existing = this.get<Record<string, string>>("SELECT createdAt FROM knowledge_sources WHERE id = ?", [
      source.id
    ]);
    const now = new Date().toISOString();
    this.run(
      `INSERT INTO knowledge_sources (id, name, type, path, status, chunkCount, createdAt, updatedAt, metadataJson)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         type = excluded.type,
         path = excluded.path,
         status = excluded.status,
         chunkCount = excluded.chunkCount,
         updatedAt = excluded.updatedAt,
         metadataJson = excluded.metadataJson`,
      [
        source.id,
        source.name,
        source.type,
        source.path,
        source.status,
        source.chunkCount,
        existing?.createdAt || now,
        now,
        JSON.stringify(source.metadata || {})
      ]
    );
    this.scheduleSave();
    return {
      ...source,
      createdAt: existing?.createdAt || now,
      updatedAt: now
    };
  }

  replaceChunks(
    source: Pick<KnowledgeSource, "id" | "name">,
    chunks: Array<{
      title: string;
      path: string;
      content: string;
      embedding: number[];
      tags?: string[];
    }>
  ): void {
    this.run("DELETE FROM knowledge_chunks WHERE sourceId = ?", [source.id]);
    for (const chunk of chunks) {
      this.run(
        `INSERT INTO knowledge_chunks
          (id, sourceId, sourceName, title, path, content, embeddingJson, tagsJson, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          randomUUID(),
          source.id,
          source.name,
          chunk.title,
          chunk.path,
          chunk.content,
          JSON.stringify(chunk.embedding),
          JSON.stringify(chunk.tags || []),
          new Date().toISOString()
        ]
      );
    }
    this.run("UPDATE knowledge_sources SET chunkCount = ?, status = ?, updatedAt = ? WHERE id = ?", [
      chunks.length,
      "indexed",
      new Date().toISOString(),
      source.id
    ]);
    this.scheduleSave();
  }

  listKnowledgeChunks(): Array<KnowledgeHit & { embedding: number[] }> {
    return this.all<Record<string, string>>(
      "SELECT id, sourceId, sourceName, title, path, content, embeddingJson, tagsJson FROM knowledge_chunks"
    ).map((row) => ({
      id: row.id,
      sourceId: row.sourceId,
      sourceName: row.sourceName,
      title: row.title,
      path: row.path,
      content: row.content,
      score: 0,
      tags: row.tagsJson ? JSON.parse(row.tagsJson) : [],
      embedding: row.embeddingJson ? JSON.parse(row.embeddingJson) : []
    }));
  }

  listProjects(): ProjectSummary[] {
    return this.all<ProjectSummary>(
      "SELECT id, name, path, createdAt, updatedAt FROM projects ORDER BY updatedAt DESC"
    );
  }

  upsertProject(input: { id?: string; name: string; path: string }): ProjectSummary {
    const existing = input.id
      ? this.get<ProjectSummary>("SELECT id, name, path, createdAt, updatedAt FROM projects WHERE id = ?", [input.id])
      : this.get<ProjectSummary>("SELECT id, name, path, createdAt, updatedAt FROM projects WHERE path = ?", [
          input.path
        ]);
    const now = new Date().toISOString();
    const id = existing?.id || input.id || randomUUID();
    this.run(
      `INSERT INTO projects (id, name, path, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name = excluded.name, path = excluded.path, updatedAt = excluded.updatedAt`,
      [id, input.name, input.path, existing?.createdAt || now, now]
    );
    this.scheduleSave();
    return { id, name: input.name, path: input.path, createdAt: existing?.createdAt || now, updatedAt: now };
  }

  getProject(projectId: string): ProjectSummary | undefined {
    return this.get<ProjectSummary>("SELECT id, name, path, createdAt, updatedAt FROM projects WHERE id = ?", [
      projectId
    ]);
  }

  createSnapshot(input: {
    projectId: string;
    label: string;
    files: Array<{ relativePath: string; content: string | null }>;
  }): SnapshotSummary {
    const now = new Date().toISOString();
    const id = randomUUID();
    this.run(
      "INSERT INTO snapshots (id, projectId, label, createdAt, filesJson) VALUES (?, ?, ?, ?, ?)",
      [id, input.projectId, input.label, now, JSON.stringify(input.files)]
    );
    this.scheduleSave();
    return {
      id,
      projectId: input.projectId,
      label: input.label,
      createdAt: now,
      files: input.files.map((file) => file.relativePath)
    };
  }

  getLatestSnapshot(projectId: string): { id: string; label: string; filesJson: string } | undefined {
    return this.get("SELECT id, label, filesJson FROM snapshots WHERE projectId = ? ORDER BY createdAt DESC LIMIT 1", [
      projectId
    ]);
  }

  getStats(): { chatCount: number; projectCount: number } {
    return {
      chatCount: Number(this.get<{ count: number }>("SELECT COUNT(*) as count FROM chats")?.count || 0),
      projectCount: Number(this.get<{ count: number }>("SELECT COUNT(*) as count FROM projects")?.count || 0)
    };
  }

  getSetting(key: string, fallback = ""): string {
    return this.get<{ value: string }>("SELECT value FROM settings WHERE key = ?", [key])?.value ?? fallback;
  }

  setSetting(key: string, value: string): void {
    this.run("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", [
      key,
      value
    ]);
    this.scheduleSave();
  }

  getJsonSetting<T>(key: string, fallback: T): T {
    const raw = this.getSetting(key, "");
    if (!raw) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  setJsonSetting(key: string, value: unknown): void {
    this.setSetting(key, JSON.stringify(value));
  }

  private execSchema(): void {
    this.requireDb().exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS chats (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        mode TEXT NOT NULL,
        model TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        chatId TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        sourcesJson TEXT NOT NULL,
        FOREIGN KEY(chatId) REFERENCES chats(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS knowledge_sources (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        path TEXT NOT NULL,
        status TEXT NOT NULL,
        chunkCount INTEGER NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        metadataJson TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS knowledge_chunks (
        id TEXT PRIMARY KEY,
        sourceId TEXT NOT NULL,
        sourceName TEXT NOT NULL,
        title TEXT NOT NULL,
        path TEXT NOT NULL,
        content TEXT NOT NULL,
        embeddingJson TEXT NOT NULL,
        tagsJson TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        FOREIGN KEY(sourceId) REFERENCES knowledge_sources(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        path TEXT NOT NULL UNIQUE,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS snapshots (
        id TEXT PRIMARY KEY,
        projectId TEXT NOT NULL,
        label TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        filesJson TEXT NOT NULL,
        FOREIGN KEY(projectId) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chatId);
      CREATE INDEX IF NOT EXISTS idx_chunks_source ON knowledge_chunks(sourceId);
      CREATE INDEX IF NOT EXISTS idx_projects_path ON projects(path);
    `);
  }

  private ensureDefaults(): void {
    if (!this.getSetting("theme")) this.setTheme("dark");
    if (!this.getSetting("offlineMode")) this.setOfflineMode(true);
    if (!this.getSetting("model")) this.setModelConfig(this.getModelConfig());
  }

  private run(sql: string, params: unknown[] = []): void {
    const statement = this.requireDb().prepare(sql);
    try {
      statement.run(params);
    } finally {
      statement.free();
    }
  }

  private get<T>(sql: string, params: unknown[] = []): T | undefined {
    const rows = this.all<T>(sql, params);
    return rows[0];
  }

  private all<T>(sql: string, params: unknown[] = []): T[] {
    const statement = this.requireDb().prepare(sql);
    try {
      statement.bind(params);
      const rows: T[] = [];
      while (statement.step()) rows.push(statement.getAsObject() as T);
      return rows;
    } finally {
      statement.free();
    }
  }

  private scheduleSave(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.saveNow(), 200);
  }

  private saveNow(): void {
    if (!this.db) return;
    const data = this.db.export();
    fs.writeFileSync(this.databasePath, Buffer.from(data));
  }

  private requireDb(): Database {
    if (!this.db) throw new Error("Database has not been initialized.");
    return this.db;
  }
}
