import {
  parseJournalLocalDraft,
  parseRecordLocalDraft,
  normalizeServiceAttribution,
  serializeLocalDraft,
  type LocalDraftEnvelope,
  type RecordDraft,
  type MaintenanceServiceAttributionV1,
  type RestorableJournalDraft,
} from "@mechori/core";

const recordDraftPrefix = "mechori.prototype.draft.record.";
const journalDraftPrefix = "mechori.prototype.draft.journal.";
const quickEventDraftPrefix = "mechori.prototype.draft.quick-event.";
const localDraftMaxAgeMs = 30 * 24 * 60 * 60 * 1000;

export interface QuickEventLocalDraft {
  eventType: string;
  occurredOn?: string;
  occurredYear?: number;
  occurredMonth?: number;
  occurredPrecision?: string;
  occurredPeriodNote?: string;
  note: string;
  visibility: string;
  hasPhoto: boolean;
  serviceAttribution?: MaintenanceServiceAttributionV1;
}

export function recordLocalDraftKey(recordId?: string): string {
  return `${recordDraftPrefix}${recordId ?? "new"}`;
}

export function journalLocalDraftKey(
  profileId: string | undefined,
  journalId?: string,
  promptId?: string,
): string {
  return `${journalDraftPrefix}${draftKeyPart(profileId ?? "unknown")}.${draftKeyPart(journalId ?? "new")}.${draftKeyPart(promptId ?? "none")}`;
}

export function loadRecordLocalDraft(
  key: string,
): LocalDraftEnvelope<RecordDraft> | null {
  return parseRecordLocalDraft(read(key));
}

export function loadJournalLocalDraft(
  key: string,
): LocalDraftEnvelope<RestorableJournalDraft> | null {
  return parseFreshDraft(parseJournalLocalDraft(read(key)));
}

export function quickEventLocalDraftKey(
  profileId: string | undefined,
  vehicleId: string,
  journalId?: string,
): string {
  return `${quickEventDraftPrefix}${draftKeyPart(profileId ?? "unknown")}.${draftKeyPart(vehicleId)}.${draftKeyPart(journalId ?? "new")}`;
}

export function loadQuickEventLocalDraft(
  key: string,
): LocalDraftEnvelope<QuickEventLocalDraft> | null {
  const parsed = parseFreshDraft(parseQuickEventDraft(read(key)));
  return parsed;
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
      .filter(
        (key) =>
          key.startsWith(recordDraftPrefix) ||
          key.startsWith(journalDraftPrefix) ||
          key.startsWith(quickEventDraftPrefix),
      )
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

function parseQuickEventDraft(raw: string | null): LocalDraftEnvelope<QuickEventLocalDraft> | null {
  if (raw === null) return null;
  try {
    const envelope = JSON.parse(raw) as Record<string, unknown>;
    const value = envelope.value as Record<string, unknown> | undefined;
    if (
      envelope.version !== 1 ||
      typeof envelope.savedAt !== "string" ||
      !Number.isFinite(Date.parse(envelope.savedAt)) ||
      !value ||
      typeof value.eventType !== "string" ||
      typeof value.note !== "string" ||
      typeof value.visibility !== "string" ||
      typeof value.hasPhoto !== "boolean"
    ) {
      return null;
    }
    return {
      version: 1,
      savedAt: envelope.savedAt,
      value: {
        eventType: value.eventType,
        occurredOn: typeof value.occurredOn === "string" ? value.occurredOn : undefined,
        occurredYear: typeof value.occurredYear === "number" ? value.occurredYear : undefined,
        occurredMonth: typeof value.occurredMonth === "number" ? value.occurredMonth : undefined,
        occurredPrecision: typeof value.occurredPrecision === "string" ? value.occurredPrecision : undefined,
        occurredPeriodNote: typeof value.occurredPeriodNote === "string" ? value.occurredPeriodNote : undefined,
        note: value.note,
        visibility: value.visibility,
        hasPhoto: value.hasPhoto,
        serviceAttribution: normalizeServiceAttribution(value.serviceAttribution),
      },
    };
  } catch {
    return null;
  }
}

function parseFreshDraft<T>(draft: LocalDraftEnvelope<T> | null): LocalDraftEnvelope<T> | null {
  if (!draft) return null;
  const age = Date.now() - Date.parse(draft.savedAt);
  return age >= 0 && age <= localDraftMaxAgeMs ? draft : null;
}

function draftKeyPart(value: string): string {
  return encodeURIComponent(value).replace(/%/g, "_");
}
