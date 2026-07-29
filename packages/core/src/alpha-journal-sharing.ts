import type {
  GarageJournalPost,
  JournalContentBlock,
  JournalEventType,
  JournalMediaAttachment,
  JournalOccurrencePrecision,
  SocialProfile,
} from "./types.ts";
import type { LanguageTag } from "./language.ts";

export const alphaSharedJournalSchemaVersion = 1;
export interface AlphaSharedJournalPayload {
  schemaVersion: typeof alphaSharedJournalSchemaVersion;
  vehicleLabel: string;
  modelTargetId: string;
  title: string;
  eventType?: JournalEventType;
  bodyOriginal: string;
  sourceLanguage: LanguageTag;
  media: JournalMediaAttachment[];
  contentBlocks: JournalContentBlock[];
  occurredOn?: string;
  occurredYear?: number;
  occurredMonth?: number;
  occurredPrecision?: JournalOccurrencePrecision;
  occurredPeriodNote?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

export interface AlphaSharedJournalRow {
  share_id: string;
  journal_id: string;
  author_display_name: string;
  payload: unknown;
  published_at: string;
  updated_at: string;
}

export interface AlphaSharedJournal {
  journal: GarageJournalPost;
  author: SocialProfile;
}

export function createAlphaSharedJournalPayload(
  journal: GarageJournalPost,
): AlphaSharedJournalPayload {
  if (journal.visibility !== "public") throw new Error("journal_not_public");
  if (journal.moderationState !== "visible") throw new Error("journal_not_visible");

  // P0 shares text only. Real photos remain in the owner's private workspace
  // until irreversible masking and the public-media review gate are implemented.
  const publicMedia: JournalMediaAttachment[] = [];
  const contentBlocks = journal.contentBlocks
    .filter((block) => block.type === "text")
    .map((block) => ({ ...block }));

  return {
    schemaVersion: alphaSharedJournalSchemaVersion,
    vehicleLabel: bounded(journal.vehicleLabel, 160),
    modelTargetId: bounded(journal.modelTargetId, 160),
    title: bounded(journal.title, 180),
    eventType: journal.eventType,
    bodyOriginal: bounded(journal.bodyOriginal, 10000),
    sourceLanguage: journal.sourceLanguage,
    media: publicMedia,
    contentBlocks,
    occurredOn: journal.occurredOn,
    occurredYear: journal.occurredYear,
    occurredMonth: journal.occurredMonth,
    occurredPrecision: journal.occurredPrecision,
    occurredPeriodNote: journal.occurredPeriodNote
      ? bounded(journal.occurredPeriodNote, 160)
      : undefined,
    createdAt: journal.createdAt,
    updatedAt: journal.updatedAt,
    publishedAt: journal.publishedAt ?? journal.updatedAt,
  };
}

export function parseAlphaSharedJournalRow(
  row: AlphaSharedJournalRow,
): AlphaSharedJournal | null {
  const payload = parsePayload(row.payload);
  if (!payload) return null;
  const authorId = `alpha-shared-author-${row.share_id}`;
  const author: SocialProfile = {
    id: authorId,
    displayName: bounded(row.author_display_name, 80) || "MECHORI User",
    role: "owner",
    bio: "",
    visibility: "private",
    displayFields: [],
    isProfessional: false,
    isDemo: false,
  };
  return {
    author,
    journal: {
      id: row.journal_id,
      authorProfileId: authorId,
      vehicleLabel: payload.vehicleLabel,
      modelTargetId: payload.modelTargetId,
      title: payload.title,
      eventType: payload.eventType,
      bodyOriginal: payload.bodyOriginal,
      sourceLanguage: payload.sourceLanguage,
      visibility: "public",
      moderationState: "visible",
      displayFields: [],
      media: payload.media,
      contentBlocks: payload.contentBlocks,
      knowledgeExtractionConsent: false,
      appreciationCount: 0,
      occurredOn: payload.occurredOn,
      occurredYear: payload.occurredYear,
      occurredMonth: payload.occurredMonth,
      occurredPrecision: payload.occurredPrecision,
      occurredPeriodNote: payload.occurredPeriodNote,
      createdAt: payload.createdAt,
      updatedAt: row.updated_at || payload.updatedAt,
      publishedAt: row.published_at || payload.publishedAt,
      isDemo: false,
    },
  };
}

function parsePayload(value: unknown): AlphaSharedJournalPayload | null {
  if (!isRecord(value) || value.schemaVersion !== alphaSharedJournalSchemaVersion) {
    return null;
  }
  if (
    typeof value.vehicleLabel !== "string" ||
    typeof value.modelTargetId !== "string" ||
    typeof value.title !== "string" ||
    typeof value.bodyOriginal !== "string" ||
    typeof value.sourceLanguage !== "string" ||
    typeof value.createdAt !== "string" ||
    typeof value.updatedAt !== "string" ||
    typeof value.publishedAt !== "string" ||
    !Array.isArray(value.media) ||
    !Array.isArray(value.contentBlocks)
  ) {
    return null;
  }
  if (value.media.length > 0) return null;
  const media: JournalMediaAttachment[] = [];
  const contentBlocks = value.contentBlocks.filter(
    (block): block is JournalContentBlock =>
      isTextBlock(block),
  );
  if (contentBlocks.length !== value.contentBlocks.length) return null;

  return {
    schemaVersion: alphaSharedJournalSchemaVersion,
    vehicleLabel: bounded(value.vehicleLabel, 160),
    modelTargetId: bounded(value.modelTargetId, 160),
    title: bounded(value.title, 180),
    eventType: isJournalEventType(value.eventType) ? value.eventType : undefined,
    bodyOriginal: bounded(value.bodyOriginal, 10000),
    sourceLanguage: value.sourceLanguage,
    media,
    contentBlocks,
    occurredOn: optionalString(value.occurredOn, 10),
    occurredYear: optionalInteger(value.occurredYear),
    occurredMonth: optionalInteger(value.occurredMonth),
    occurredPrecision: isOccurrencePrecision(value.occurredPrecision)
      ? value.occurredPrecision
      : undefined,
    occurredPeriodNote: optionalString(value.occurredPeriodNote, 160),
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    publishedAt: value.publishedAt,
  };
}

function isTextBlock(value: unknown): value is JournalContentBlock {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    value.type === "text" &&
    (value.style === "paragraph" || value.style === "heading" || value.style === "quote") &&
    typeof value.text === "string"
  );
}

function isJournalEventType(value: unknown): value is JournalEventType {
  return [
    "delivery",
    "photo",
    "drive",
    "inspection",
    "tire",
    "oil",
    "breakdown",
    "repair",
    "part",
    "custom",
    "event",
    "memory",
    "other",
  ].includes(String(value));
}

function isOccurrencePrecision(value: unknown): value is JournalOccurrencePrecision {
  return ["day", "month", "year", "unknown"].includes(String(value));
}

function bounded(value: string, maxLength: number): string {
  return value.trim().slice(0, maxLength);
}

function optionalString(value: unknown, maxLength: number): string | undefined {
  return typeof value === "string" ? bounded(value, maxLength) || undefined : undefined;
}

function optionalInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
