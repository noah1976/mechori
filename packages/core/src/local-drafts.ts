import type {
  HazardLevel,
  JournalDisplayField,
  JournalDraft,
  JournalTextBlock,
  JournalVisibility,
  MaintenanceOccurrencePrecision,
  PrototypeOdometerEpisodeReason,
  PrototypeOdometerUnit,
  RecordEvidenceBasis,
  RecordActionDraft,
  RecordDraft,
  ResolutionStatus,
} from "./types.ts";

export interface LocalDraftEnvelope<T> {
  version: 1;
  savedAt: string;
  value: T;
}

export interface RestorableJournalDraft {
  draft: JournalDraft;
  omittedMediaCount: number;
}

export function serializeLocalDraft<T>(value: T, savedAt = new Date().toISOString()): string {
  return JSON.stringify({ version: 1, savedAt, value } satisfies LocalDraftEnvelope<T>);
}

export function parseRecordLocalDraft(raw: string | null): LocalDraftEnvelope<RecordDraft> | null {
  const parsed = parseLocalDraft(raw, isRecordDraft);
  if (!parsed) return null;
  return {
    ...parsed,
    value: {
      ...parsed.value,
      evidenceBasis: isRecordEvidenceBasis(parsed.value.evidenceBasis)
        ? parsed.value.evidenceBasis
        : "unknown",
      serviceDatePrecision: isMaintenanceOccurrencePrecision(parsed.value.serviceDatePrecision)
        ? parsed.value.serviceDatePrecision
        : inferMaintenanceOccurrencePrecision(parsed.value.serviceDate),
      servicePeriodNote:
        typeof parsed.value.servicePeriodNote === "string"
          ? parsed.value.servicePeriodNote
          : "",
    },
  };
}

export function parseJournalLocalDraft(
  raw: string | null,
): LocalDraftEnvelope<RestorableJournalDraft> | null {
  return parseLocalDraft(raw, isRestorableJournalDraft);
}

export function createRestorableJournalDraft(draft: JournalDraft): RestorableJournalDraft {
  const textBlocks = draft.contentBlocks.filter(
    (block): block is JournalTextBlock => block.type === "text",
  );
  return {
    draft: {
      ...draft,
      media: [],
      contentBlocks: textBlocks.map((block) => ({ ...block })),
      visibility: draft.visibility,
    },
    omittedMediaCount: draft.media.length,
  };
}

function parseLocalDraft<T>(
  raw: string | null,
  isValue: (value: unknown) => value is T,
): LocalDraftEnvelope<T> | null {
  if (raw === null) return null;
  try {
    const envelope = JSON.parse(raw) as Record<string, unknown>;
    if (
      !isObject(envelope) ||
      envelope.version !== 1 ||
      typeof envelope.savedAt !== "string" ||
      !Number.isFinite(Date.parse(envelope.savedAt)) ||
      !isValue(envelope.value)
    ) {
      return null;
    }
    return {
      version: 1,
      savedAt: envelope.savedAt,
      value: envelope.value,
    };
  } catch {
    return null;
  }
}

function isRecordDraft(value: unknown): value is RecordDraft {
  if (!isObject(value) || !hasStringFields(value, recordDraftStringFields)) return false;
  return (
    isOdometerUnit(value.odometerUnit) &&
    isOdometerChangeReason(value.odometerChangeReason) &&
    isResolutionStatus(value.resolutionStatus) &&
    isHazardLevel(value.hazardLevel) &&
    typeof value.requestSharing === "boolean" &&
    Array.isArray(value.additionalActions) &&
    value.additionalActions.every(isRecordActionDraft)
  );
}

function isRecordEvidenceBasis(value: unknown): value is RecordEvidenceBasis {
  return [
    "contemporaneous",
    "invoice_or_receipt",
    "photo_or_service_book",
    "recalled_later",
    "unknown",
  ].includes(String(value));
}

function isMaintenanceOccurrencePrecision(
  value: unknown,
): value is MaintenanceOccurrencePrecision {
  return ["day", "month", "year", "unknown"].includes(String(value));
}

function inferMaintenanceOccurrencePrecision(value: string): MaintenanceOccurrencePrecision {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return "day";
  if (/^\d{4}-\d{2}$/.test(value)) return "month";
  if (/^\d{4}$/.test(value)) return "year";
  return "unknown";
}

function isRecordActionDraft(value: unknown): value is RecordActionDraft {
  return (
    isObject(value) &&
    hasStringFields(value, recordActionStringFields) &&
    isResolutionStatus(value.resolutionStatus) &&
    isHazardLevel(value.hazardLevel)
  );
}

function isJournalDraft(value: unknown): value is JournalDraft {
  if (!isObject(value) || !hasStringFields(value, journalDraftStringFields)) return false;
  return (
    (value.occurredOn === undefined ||
      (typeof value.occurredOn === "string" && isValidDateOnly(value.occurredOn))) &&
    (value.occurredPrecision === undefined ||
      ["day", "month", "year", "unknown"].includes(String(value.occurredPrecision))) &&
    (value.occurredYear === undefined || typeof value.occurredYear === "number") &&
    (value.occurredMonth === undefined || typeof value.occurredMonth === "number") &&
    (value.occurredPeriodNote === undefined || typeof value.occurredPeriodNote === "string") &&
    (value.sourceLanguage === undefined || typeof value.sourceLanguage === "string") &&
    Array.isArray(value.displayFields) &&
    value.displayFields.every(isJournalDisplayField) &&
    Array.isArray(value.media) &&
    value.media.length === 0 &&
    Array.isArray(value.contentBlocks) &&
    value.contentBlocks.every(isJournalTextBlock) &&
    isJournalVisibility(value.visibility) &&
    typeof value.knowledgeExtractionConsent === "boolean"
  );
}

function isValidDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
}

function isRestorableJournalDraft(value: unknown): value is RestorableJournalDraft {
  return (
    isObject(value) &&
    isJournalDraft(value.draft) &&
    typeof value.omittedMediaCount === "number" &&
    Number.isInteger(value.omittedMediaCount) &&
    value.omittedMediaCount >= 0
  );
}

function isJournalTextBlock(value: unknown): value is JournalTextBlock {
  return (
    isObject(value) &&
    value.type === "text" &&
    typeof value.id === "string" &&
    typeof value.text === "string" &&
    ["paragraph", "heading", "quote"].includes(String(value.style))
  );
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasStringFields(value: Record<string, unknown>, fields: readonly string[]): boolean {
  return fields.every((field) => typeof value[field] === "string");
}

function isOdometerUnit(value: unknown): value is PrototypeOdometerUnit {
  return ["km", "mi", "unknown"].includes(String(value));
}

function isOdometerChangeReason(
  value: unknown,
): value is PrototypeOdometerEpisodeReason | "same_episode" {
  return ["same_episode", "initial", "replacement", "repair", "reset", "rollover", "unit_change", "unknown"].includes(
    String(value),
  );
}

function isResolutionStatus(value: unknown): value is ResolutionStatus {
  return ["resolved", "unresolved"].includes(String(value));
}

function isHazardLevel(value: unknown): value is HazardLevel {
  return ["LOW", "CAUTION", "CRITICAL"].includes(String(value));
}

function isJournalVisibility(value: unknown): value is JournalVisibility {
  return ["private", "followers", "public"].includes(String(value));
}

function isJournalDisplayField(value: unknown): value is JournalDisplayField {
  return ["service_date", "odometer", "actions"].includes(String(value));
}

const recordDraftStringFields = [
  "serviceDate",
  "odometerKm",
  "odometerEpisodeId",
  "summary",
  "symptoms",
  "causeCandidates",
  "checksPerformed",
  "workPerformed",
  "partName",
  "partManufacturer",
  "partNumber",
  "cost",
] as const;

const recordActionStringFields = [
  "clientId",
  "summary",
  "causeCandidates",
  "checksPerformed",
  "workPerformed",
  "partName",
  "partManufacturer",
  "partNumber",
  "result",
] as const;

const journalDraftStringFields = ["title", "bodyOriginal", "vehicleId", "linkedRecordId"] as const;
