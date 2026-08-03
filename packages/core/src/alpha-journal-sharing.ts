import type {
  GarageJournalPost,
  JournalContentBlock,
  JournalEventType,
  JournalMediaAttachment,
  JournalMediaBlock,
  JournalOccurrencePrecision,
  SocialProfile,
} from "./types.ts";
import type { LanguageTag } from "./language.ts";

export const alphaSharedJournalSchemaVersion = 1;
export const alphaSharedJournalMaxMediaCount = 6;
export const alphaSharedJournalMaxMediaBytes = 512 * 1024;

export interface AlphaSharedJournalPayloadOptions {
  sharedMedia?: JournalMediaAttachment[];
}

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
  public_profile_id?: string | null;
  vehicle_target_id?: string | null;
  author_display_name: string;
  payload: unknown;
  published_at: string;
  updated_at: string;
}

export interface AlphaSharedJournal {
  shareId: string;
  journal: GarageJournalPost;
  author: SocialProfile;
}

export function preferSharedJournalMediaForDisplay(
  journal: GarageJournalPost,
  sharedJournal?: GarageJournalPost,
): GarageJournalPost {
  if (!sharedJournal || journal.id !== sharedJournal.id) return journal;
  const sharedMediaById = new Map(
    sharedJournal.media.map((attachment) => [attachment.id, attachment]),
  );
  let changed = false;
  const media = journal.media.map((attachment) => {
    if (attachment.privacyState !== "public_ready") return attachment;
    const sharedAttachment = sharedMediaById.get(attachment.id);
    if (!sharedAttachment) return attachment;
    changed = true;
    return sharedAttachment;
  });
  return changed ? { ...journal, media } : journal;
}

export function createAlphaSharedJournalPayload(
  journal: GarageJournalPost,
  options: AlphaSharedJournalPayloadOptions = {},
): AlphaSharedJournalPayload {
  if (journal.visibility !== "public") throw new Error("journal_not_public");
  if (journal.moderationState !== "visible") throw new Error("journal_not_visible");

  const requestedMedia = options.sharedMedia ?? [];
  if (requestedMedia.length > alphaSharedJournalMaxMediaCount) {
    throw new Error("too_many_shared_media");
  }
  const publicMedia = requestedMedia.map(normalizeSharedMedia);
  const publicMediaIds = new Set(publicMedia.map((attachment) => attachment.id));
  const contentBlocks = journal.contentBlocks
    .filter(
      (block) => block.type === "text" || publicMediaIds.has(block.mediaId),
    )
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
  const authorId =
    optionalString(row.public_profile_id, 80) ??
    `alpha-shared-author-${row.share_id}`;
  const vehicleTargetId = optionalString(row.vehicle_target_id, 160);
  const author: SocialProfile = {
    id: authorId,
    displayName: bounded(row.author_display_name, 80) || "MECHORI User",
    role: "owner",
    bio: "",
    visibility: row.public_profile_id ? "public" : "private",
    displayFields: row.public_profile_id ? ["vehicles"] : [],
    isProfessional: false,
    isDemo: false,
  };
  return {
    shareId: row.share_id,
    author,
    journal: {
      id: row.journal_id,
      authorProfileId: authorId,
      vehicleTargetId,
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
  if (value.media.length > alphaSharedJournalMaxMediaCount) return null;
  const media = value.media
    .map(parseSharedMedia)
    .filter((attachment): attachment is JournalMediaAttachment => Boolean(attachment));
  if (media.length !== value.media.length) return null;
  const mediaIds = new Set(media.map((attachment) => attachment.id));
  const contentBlocks = value.contentBlocks.filter((block): block is JournalContentBlock => {
    if (isTextBlock(block)) return true;
    return isMediaBlock(block) && mediaIds.has(block.mediaId);
  });
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

function isMediaBlock(value: unknown): value is JournalMediaBlock {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    value.type === "media" &&
    typeof value.mediaId === "string"
  );
}

function normalizeSharedMedia(
  attachment: JournalMediaAttachment,
): JournalMediaAttachment {
  const parsed = parseSharedMedia(attachment);
  if (!parsed) throw new Error("invalid_shared_media");
  return parsed;
}

function parseSharedMedia(value: unknown): JournalMediaAttachment | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    value.kind !== "image" ||
    value.source !== "alpha_shared" ||
    typeof value.assetPath !== "string" ||
    "storageKey" in value ||
    !isSharedMediaPath(value.assetPath) ||
    !isSharedImageMimeType(value.mimeType) ||
    typeof value.sizeBytes !== "number" ||
    !Number.isInteger(value.sizeBytes) ||
    value.sizeBytes < 1 ||
    value.sizeBytes > alphaSharedJournalMaxMediaBytes ||
    typeof value.altText !== "string" ||
    value.privacyState !== "public_ready" ||
    typeof value.createdAt !== "string" ||
    value.isDemo !== false
  ) {
    return null;
  }
  return {
    id: bounded(value.id, 160),
    kind: "image",
    source: "alpha_shared",
    assetPath: value.assetPath,
    mimeType: value.mimeType,
    sizeBytes: value.sizeBytes,
    altText: bounded(value.altText, 500),
    privacyState: "public_ready",
    createdAt: value.createdAt,
    isDemo: false,
  };
}

function isSharedMediaPath(value: string): boolean {
  return (
    value.length <= 500 &&
    !value.includes("..") &&
    /^[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\/[A-Za-z0-9_.-]+$/.test(value)
  );
}

function isSharedImageMimeType(value: unknown): value is string {
  return ["image/jpeg", "image/png", "image/webp"].includes(String(value));
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
