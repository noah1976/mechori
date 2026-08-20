import type {
  JournalCaptureIntent,
  JournalEventType,
  Locale,
} from "@mechori/core";

export function quickRecordTitle(note: string, locale: "ja" | "en"): string {
  const firstLine = note
    .trim()
    .split(/\r?\n/, 1)[0]
    ?.replace(/\s+/g, " ")
    .trim();

  if (firstLine) return firstLine.slice(0, 80);
  return locale === "ja" ? "記録" : "Record";
}

const serviceEventTypes = new Set<JournalEventType>([
  "inspection",
  "tire",
  "oil",
  "breakdown",
  "repair",
  "part",
]);

export function isJournalCaptureIntent(value: unknown): value is JournalCaptureIntent {
  return ["issue", "service", "drive", "other"].includes(String(value));
}

export function defaultEventTypeForCaptureIntent(
  intent: JournalCaptureIntent,
): JournalEventType | undefined {
  if (intent === "issue") return "issue";
  if (intent === "drive") return "drive";
  if (intent === "other") return "other";
  return undefined;
}

export function captureIntentForJournal(
  captureIntent?: JournalCaptureIntent,
  eventType?: JournalEventType,
): JournalCaptureIntent {
  if (captureIntent) return captureIntent;
  if (eventType === "issue") return "issue";
  if (eventType === "drive" || eventType === "memory") return "drive";
  if (eventType && serviceEventTypes.has(eventType)) return "service";
  return "other";
}

export function captureIntentLabel(
  intent: JournalCaptureIntent,
  locale: Locale,
): string {
  const labels: Record<JournalCaptureIntent, [string, string]> = {
    issue: ["気になること・不具合", "Issue / something noticed"],
    service: ["整備・修理", "Maintenance / repair"],
    drive: ["ドライブ・思い出", "Drive / memory"],
    other: ["その他", "Other"],
  };
  return labels[intent][locale === "ja" ? 0 : 1];
}

export function captureIntentPlaceholder(
  intent: JournalCaptureIntent,
  locale: Locale,
): string {
  const labels: Record<JournalCaptureIntent, [string, string]> = {
    issue: ["何が気になりますか？", "What have you noticed?"],
    service: ["何をしましたか？", "What did you do?"],
    drive: ["どんなことがありましたか？", "What happened along the way?"],
    other: ["愛車に何がありましたか？", "What happened with your vehicle?"],
  };
  return labels[intent][locale === "ja" ? 0 : 1];
}
