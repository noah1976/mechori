import {
  parseJournalLocalDraft,
  parseRecordLocalDraft,
  serializeLocalDraft,
  type LocalDraftEnvelope,
  type RecordDraft,
  type RestorableJournalDraft,
} from "@mechori/core";

const recordDraftPrefix = "mechori.prototype.draft.record.";
const journalDraftKey = "mechori.prototype.draft.journal.new";

export function recordLocalDraftKey(recordId?: string): string {
  return `${recordDraftPrefix}${recordId ?? "new"}`;
}

export function journalLocalDraftKey(): string {
  return journalDraftKey;
}

export function loadRecordLocalDraft(
  key: string,
): LocalDraftEnvelope<RecordDraft> | null {
  return parseRecordLocalDraft(read(key));
}

export function loadJournalLocalDraft(): LocalDraftEnvelope<RestorableJournalDraft> | null {
  return parseJournalLocalDraft(read(journalDraftKey));
}

export function saveLocalDraft<T>(key: string, value: T): string | null {
  const savedAt = new Date().toISOString();
  try {
    window.localStorage.setItem(key, serializeLocalDraft(value, savedAt));
    return savedAt;
  } catch {
    return null;
  }
}

export function clearLocalDraft(key: string): boolean {
  try {
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function clearAllLocalDrafts(): boolean {
  try {
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith(recordDraftPrefix) || key === journalDraftKey)
      .forEach((key) => window.localStorage.removeItem(key));
    return true;
  } catch {
    return false;
  }
}

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
