import { marked } from "marked";
import mammoth from "mammoth";

export const SUPPORTED_EXTENSIONS = [".txt", ".md", ".docx"] as const;
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // 2 MB

export type SupportedExtension = (typeof SUPPORTED_EXTENSIONS)[number];

export function detectExtension(filename: string): SupportedExtension | null {
  const lower = filename.toLowerCase();
  const ext = SUPPORTED_EXTENSIONS.find((e) => lower.endsWith(e));
  return ext ?? null;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Plain text becomes one paragraph per non-empty line block. */
export function textToHtml(text: string): string {
  const blocks = text.replace(/\r\n/g, "\n").split(/\n{2,}/);
  return blocks
    .filter((b) => b.trim().length > 0)
    .map((b) => `<p>${escapeHtml(b.trim()).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export function markdownToHtml(md: string): string {
  return marked.parse(md, { async: false });
}

export async function docxToHtml(buffer: Buffer): Promise<string> {
  const result = await mammoth.convertToHtml({ buffer });
  return result.value;
}

/** Strips the extension to produce an initial document title. */
export function titleFromFilename(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, "").trim();
  return base.length > 0 ? base.slice(0, 120) : "Imported document";
}

/**
 * Converts an uploaded file into HTML that the TipTap editor can load.
 * Throws with a user-facing message for unsupported/oversized input.
 */
export async function fileToHtml(filename: string, buffer: Buffer): Promise<string> {
  if (buffer.byteLength > MAX_UPLOAD_BYTES) {
    throw new Error("File is too large (max 2 MB).");
  }
  const ext = detectExtension(filename);
  if (!ext) {
    throw new Error("Unsupported file type. Supported: .txt, .md, .docx");
  }
  if (ext === ".docx") return docxToHtml(buffer);
  const text = buffer.toString("utf-8");
  return ext === ".md" ? markdownToHtml(text) : textToHtml(text);
}
