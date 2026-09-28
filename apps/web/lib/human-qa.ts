export const QA_TASK = "history-reading-v1";
export const QA_VERSION = "qa-v0.1";
export const QA_NOTE_LIMIT = 300;
export const QA_BODY_LIMIT = 2048;
export const QA_RESULTS = ["done", "confusing", "blocked"] as const;
export type QaResult = typeof QA_RESULTS[number];
export type QaSource = "x" | "facebook" | "direct" | "unknown";
export type QaDevice = "mobile" | "tablet" | "desktop" | "unknown";

export interface QaFeedbackInput {
  submissionId: string;
  task: typeof QA_TASK;
  step: number;
  source: QaSource;
  device: QaDevice;
  result: QaResult;
  note: string;
}

export function sanitizeQaSource(value: unknown): QaSource {
  if (value === null || value === undefined || value === "") return "direct";
  return value === "x" || value === "facebook" || value === "direct" ? value : "unknown";
}

export function qaDeviceClass(width: number): QaDevice {
  if (!Number.isFinite(width) || width <= 0) return "unknown";
  return width < 600 ? "mobile" : width < 1024 ? "tablet" : "desktop";
}

export function safeQaBuild(value: unknown): string {
  return typeof value === "string" && /^[a-f0-9]{7,40}$/i.test(value) ? value.toLowerCase() : "unknown";
}

// Reject obvious identifiers/capability URLs. This is not a guarantee that arbitrary
// prose is anonymous; the UI also asks participants not to enter personal details.
export function qaNoteHasSensitiveData(note: string): boolean {
  return /https?:\/\/|www\.|\/p\/|\/join(?:[?#/]|$)|(?:invite|token|code)\s*=|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|(?:\d{1,3}\.){3}\d{1,3}|Mozilla\/|AppleWebKit\/|[A-Za-z0-9_-]{32,}|\b[A-HJ-NPR-Z0-9]{17}\b|[一-龠ぁ-んァ-ヶ]{1,6}\s?\d{2,3}\s?[ぁ-ん]\s?\d{1,2}[-・ ]?\d{2}/i.test(note);
}

export function validateQaFeedback(value: unknown): QaFeedbackInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const keys = ["submissionId", "task", "step", "source", "device", "result", "note"];
  if (Object.keys(input).some((key) => !keys.includes(key))) return null;
  if (typeof input.submissionId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.submissionId)) return null;
  if (input.task !== QA_TASK || !Number.isInteger(input.step) || Number(input.step) < 0 || Number(input.step) > 3) return null;
  if (!QA_RESULTS.includes(input.result as QaResult)) return null;
  if (typeof input.device !== "string" || !["mobile", "tablet", "desktop", "unknown"].includes(input.device)) return null;
  if (typeof input.note !== "string") return null;
  const note = input.note.normalize("NFKC").trim();
  if ([...note].length > QA_NOTE_LIMIT || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(note) || qaNoteHasSensitiveData(note)) return null;
  return {
    submissionId: input.submissionId.toLowerCase(), task: QA_TASK, step: Number(input.step),
    source: sanitizeQaSource(input.source), device: input.device as QaDevice,
    result: input.result as QaResult, note,
  };
}

export function qaAnalyticsContext(source: QaSource, step: number, device: QaDevice) {
  return { task: QA_TASK, version: QA_VERSION, source, step, device_class: device };
}
