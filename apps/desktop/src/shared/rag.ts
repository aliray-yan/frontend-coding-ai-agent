import path from "node:path";

export const VECTOR_DIMENSIONS = 384;

const TEXT_EXTENSIONS = new Set([
  ".md",
  ".mdx",
  ".txt",
  ".json",
  ".csv",
  ".html",
  ".css",
  ".scss",
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".vue",
  ".svelte",
  ".astro",
  ".liquid",
  ".yml",
  ".yaml"
]);

const IGNORED_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  ".next",
  ".svelte-kit",
  ".astro",
  "coverage",
  ".turbo",
  ".cache"
]);

export function isTextLikeFile(filePath: string): boolean {
  return TEXT_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

export function shouldIgnoreDirectory(name: string): boolean {
  return IGNORED_DIRS.has(name) || name.startsWith("__");
}

export function chunkText(input: string, maxChars = 1400, overlap = 180): string[] {
  const normalized = input.replace(/\r\n/g, "\n").replace(/\n{4,}/g, "\n\n\n").trim();
  if (!normalized) return [];

  const paragraphs = normalized.split(/\n\s*\n/g);
  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    const next = current ? `${current}\n\n${paragraph}` : paragraph;
    if (next.length <= maxChars) {
      current = next;
      continue;
    }

    if (current) chunks.push(current.trim());

    if (paragraph.length <= maxChars) {
      current = paragraph;
      continue;
    }

    for (let index = 0; index < paragraph.length; index += maxChars - overlap) {
      chunks.push(paragraph.slice(index, index + maxChars).trim());
    }
    current = "";
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

export function embedText(text: string, dimensions = VECTOR_DIMENSIONS): number[] {
  const vector = new Array<number>(dimensions).fill(0);
  const tokens = text
    .toLowerCase()
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .match(/[a-z0-9_:/.-]{2,}/g);

  if (!tokens) return vector;

  for (const token of tokens) {
    const hash = hashToken(token);
    const index = Math.abs(hash) % dimensions;
    const sign = hash % 2 === 0 ? 1 : -1;
    const weight = token.length > 12 ? 1.25 : 1;
    vector[index] += sign * weight;
  }

  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => Number((value / magnitude).toFixed(6)));
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const length = Math.min(a.length, b.length);
  let sum = 0;
  for (let index = 0; index < length; index += 1) sum += a[index] * b[index];
  return sum;
}

export function detectLanguage(filePath: string): string {
  const ext = path.extname(filePath).replace(".", "").toLowerCase();
  if (ext === "tsx" || ext === "jsx") return "tsx";
  if (ext === "mdx") return "markdown";
  if (ext === "liquid") return "liquid";
  if (ext === "vue") return "vue";
  if (ext === "svelte") return "svelte";
  if (ext === "astro") return "astro";
  if (ext === "scss") return "scss";
  return ext || "text";
}

export function sourceNameFromPath(filePath: string): string {
  const basename = path.basename(filePath);
  const parent = path.basename(path.dirname(filePath));
  return parent && parent !== "." ? `${parent}/${basename}` : basename;
}

function hashToken(token: string): number {
  let hash = 2166136261;
  for (let index = 0; index < token.length; index += 1) {
    hash ^= token.charCodeAt(index);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return hash | 0;
}
