import type {
  AppData,
  FollowRelation,
  FollowTargetSummary,
  FollowTargetType,
  GarageJournalPost,
  JournalDraft,
  JournalOccurrencePrecision,
  Locale,
  ProfileDisplayField,
  ProfileSafetyRelation,
  ProfileVisibility,
} from "./types.ts";
import { canonicalModelTargetId, resolveVehicleIdentity } from "./vehicle-catalog.ts";
import { inferJournalSourceLanguage } from "./translations.ts";
import {
  isValidServiceAttribution,
  journalSupportsServiceAttribution,
  normalizeServiceAttribution,
} from "./service-attribution.ts";

export interface JournalValidationResult {
  valid: boolean;
  errors: Partial<Record<
    "title" | "bodyOriginal" | "media" | "occurredOn" | "serviceAttribution",
    "required" | "invalid" | "description_required"
  >>;
}

export type JournalKnowledgeClassification =
  | "not_searchable"
  | "related_owner_record";

export function validateJournalDraft(draft: JournalDraft): JournalValidationResult {
  const errors: JournalValidationResult["errors"] = {};
  if (!draft.title.trim()) errors.title = "required";
  const occurrencePrecision = resolveOccurrencePrecision(draft);
  if (occurrencePrecision === "day" && !isValidDateOnly(draft.occurredOn ?? "")) {
    errors.occurredOn = draft.occurredOn ? "invalid" : "required";
  }
  if (
    (occurrencePrecision === "month" || occurrencePrecision === "year") &&
    !isValidOccurrenceYear(draft.occurredYear)
  ) {
    errors.occurredOn = draft.occurredYear === undefined ? "required" : "invalid";
  }
  if (
    occurrencePrecision === "month" &&
    (!Number.isInteger(draft.occurredMonth) || draft.occurredMonth! < 1 || draft.occurredMonth! > 12)
  ) {
    errors.occurredOn = draft.occurredMonth === undefined ? "required" : "invalid";
  }
  const hasContent = draft.contentBlocks.some((block) =>
    block.type === "media" ? true : Boolean(block.text.trim()),
  );
  if (!hasContent && !draft.linkedRecordId) errors.bodyOriginal = "required";
  const displayedMediaIds = new Set(
    draft.contentBlocks
      .filter((block) => block.type === "media")
      .map((block) => block.mediaId),
  );
  if (
    draft.media.some(
      (attachment) =>
        displayedMediaIds.has(attachment.id) && !attachment.altText.trim(),
    )
  ) {
    errors.media = "description_required";
  }
  if (
    journalSupportsServiceAttribution(draft.eventType) &&
    draft.serviceAttribution !== undefined &&
    !isValidServiceAttribution(draft.serviceAttribution)
  ) {
    errors.serviceAttribution = "invalid";
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function journalMediaForViewer(
  journal: GarageJournalPost,
  viewerIsAuthor: boolean,
): GarageJournalPost["media"] {
  if (viewerIsAuthor) return journal.media;
  if (journal.visibility === "private") return [];
  return journal.media.filter(
    (attachment) => attachment.privacyState === "public_ready",
  );
}

export function journalContentBlocksForViewer(
  journal: GarageJournalPost,
  viewerIsAuthor: boolean,
): GarageJournalPost["contentBlocks"] {
  if (viewerIsAuthor) return journal.contentBlocks;
  const visibleMediaIds = new Set(
    journalMediaForViewer(journal, false).map((attachment) => attachment.id),
  );
  return journal.contentBlocks.filter(
    (block) => block.type === "text" || visibleMediaIds.has(block.mediaId),
  );
}

export function createJournalPost(
  data: AppData,
  draft: JournalDraft,
  sourceLanguage: GarageJournalPost["sourceLanguage"],
  now = new Date().toISOString(),
  previousJournal?: GarageJournalPost,
): GarageJournalPost {
  const vehicle = data.vehicles.find((item) => item.id === draft.vehicleId);
  if (!vehicle) throw new Error("vehicle_required");
  if (vehicle.ownerProfileId !== data.currentProfileId) {
    throw new Error("journal_vehicle_owner_required");
  }
  const bodyOriginal = draft.contentBlocks
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .filter((text) => text.trim())
    .join("\n\n");
  const detectedSourceLanguage = inferJournalSourceLanguage(
    `${draft.title}\n${bodyOriginal}`,
    draft.sourceLanguage ?? sourceLanguage,
  );

  return {
    id: `journal-${crypto.randomUUID()}`,
    authorProfileId: data.currentProfileId,
    vehicleId: vehicle.id,
    vehicleTargetId: vehicle.id,
    vehicleLabel: `${vehicle.make} ${vehicle.model}`,
    modelTargetId: canonicalModelTargetId(vehicle),
    title: draft.title.trim(),
    eventType: draft.eventType,
    bodyOriginal,
    sourceLanguage: detectedSourceLanguage,
    visibility: draft.visibility,
    moderationState: "visible",
    linkedRecordId: draft.linkedRecordId || undefined,
    displayFields: draft.linkedRecordId ? [...draft.displayFields] : [],
    media: journalMediaWithDerivedPrivacy(draft, previousJournal),
    contentBlocks: draft.contentBlocks.map((block) => ({ ...block })),
    knowledgeExtractionConsent: draft.knowledgeExtractionConsent,
    ...(journalSupportsServiceAttribution(draft.eventType)
      ? { serviceAttribution: normalizeServiceAttribution(draft.serviceAttribution) }
      : {}),
    appreciationCount: 0,
    ...occurrenceFieldsFromDraft(draft),
    createdAt: now,
    updatedAt: now,
    publishedAt: draft.visibility === "private" ? undefined : now,
    isDemo: false,
  };
}

function journalMediaWithDerivedPrivacy(
  draft: JournalDraft,
  previousJournal?: GarageJournalPost,
): GarageJournalPost["media"] {
  const previousMediaById = new Map(
    previousJournal?.media.map((attachment) => [attachment.id, attachment]) ?? [],
  );

  return draft.media.map((attachment) => {
    if (attachment.kind !== "image") {
      return { ...attachment, privacyState: "private_only" };
    }
    if (draft.visibility === "private") {
      return { ...attachment, privacyState: "private_only" };
    }

    const previousAttachment = previousMediaById.get(attachment.id);
    const isLegacyPrivatePhoto =
      draft.visibility === "public" &&
      previousJournal?.visibility === "public" &&
      previousAttachment?.privacyState === "private_only";

    // Preserve old public-post/private-photo choices until the owner explicitly
    // changes the record audience; new writes always derive from the record.
    return {
      ...attachment,
      privacyState: isLegacyPrivatePhoto ? "private_only" : "public_ready",
    };
  });
}

export function journalOccurrenceDate(journal: GarageJournalPost): string {
  if (journal.occurredOn) return journal.occurredOn;
  if (journal.occurredYear && journal.occurredMonth) {
    return `${journal.occurredYear}-${String(journal.occurredMonth).padStart(2, "0")}`;
  }
  if (journal.occurredYear) return String(journal.occurredYear);
  if (journal.occurredPrecision === "unknown") return "0000";
  return journal.createdAt;
}

export function journalOccurrenceLabel(
  journal: GarageJournalPost,
  locale: Locale,
): string {
  const ja = locale === "ja";
  let label: string;
  if (journal.occurredOn) {
    label = new Intl.DateTimeFormat(ja ? "ja-JP" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(`${journal.occurredOn}T00:00:00`));
  } else if (journal.occurredYear && journal.occurredMonth) {
    label = ja
      ? `${journal.occurredYear}年${journal.occurredMonth}月ごろ`
      : `Around ${new Intl.DateTimeFormat("en-US", { month: "long" }).format(new Date(2000, journal.occurredMonth - 1, 1))} ${journal.occurredYear}`;
  } else if (journal.occurredYear) {
    label = ja ? `${journal.occurredYear}年ごろ` : `Around ${journal.occurredYear}`;
  } else if (journal.occurredPrecision === "unknown") {
    label = ja ? "時期不明" : "Date unknown";
  } else {
    label = new Intl.DateTimeFormat(ja ? "ja-JP" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(journal.createdAt));
  }
  if (!journal.occurredPeriodNote?.trim()) return label;
  return ja
    ? `${label}（${journal.occurredPeriodNote.trim()}）`
    : `${label} (${journal.occurredPeriodNote.trim()})`;
}

function isValidDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
}

function isValidOccurrenceYear(value: number | undefined): boolean {
  return Number.isInteger(value) && value! >= 1886 && value! <= new Date().getFullYear();
}

function resolveOccurrencePrecision(
  value: Pick<JournalDraft, "occurredOn" | "occurredPrecision">,
): JournalOccurrencePrecision | undefined {
  return value.occurredPrecision ?? (value.occurredOn !== undefined ? "day" : undefined);
}

function occurrenceFieldsFromDraft(draft: JournalDraft): Pick<
  GarageJournalPost,
  "occurredOn" | "occurredYear" | "occurredMonth" | "occurredPrecision" | "occurredPeriodNote"
> {
  const occurredPrecision = resolveOccurrencePrecision(draft);
  const occurredPeriodNote = draft.occurredPeriodNote?.trim() || undefined;
  if (occurredPrecision === "day") {
    return { occurredOn: draft.occurredOn, occurredPrecision, occurredPeriodNote };
  }
  if (occurredPrecision === "month") {
    return {
      occurredYear: draft.occurredYear,
      occurredMonth: draft.occurredMonth,
      occurredPrecision,
      occurredPeriodNote,
    };
  }
  if (occurredPrecision === "year") {
    return { occurredYear: draft.occurredYear, occurredPrecision, occurredPeriodNote };
  }
  if (occurredPrecision === "unknown") {
    return { occurredPrecision, occurredPeriodNote };
  }
  return {};
}

export function addJournalToData(
  data: AppData,
  draft: JournalDraft,
  sourceLanguage: GarageJournalPost["sourceLanguage"],
  now?: string,
): { data: AppData; journal: GarageJournalPost } {
  const journal = createJournalPost(data, draft, sourceLanguage, now);
  return { journal, data: { ...data, journals: [journal, ...data.journals] } };
}

export function journalToDraft(journal: GarageJournalPost): JournalDraft {
  return {
    title: journal.title,
    sourceLanguage: journal.sourceLanguage,
    eventType: journal.eventType,
    occurredOn: journal.occurredOn,
    occurredYear: journal.occurredYear,
    occurredMonth: journal.occurredMonth,
    occurredPrecision: journal.occurredPrecision ?? (journal.occurredOn ? "day" : "unknown"),
    occurredPeriodNote: journal.occurredPeriodNote,
    bodyOriginal: journal.bodyOriginal,
    vehicleId: journal.vehicleId ?? "",
    linkedRecordId: journal.linkedRecordId ?? "",
    displayFields: [...journal.displayFields],
    media: journal.media.map((attachment) => ({ ...attachment })),
    contentBlocks: journal.contentBlocks.map((block) => ({ ...block })),
    visibility: journal.visibility,
    knowledgeExtractionConsent: journal.knowledgeExtractionConsent,
    ...(journalSupportsServiceAttribution(journal.eventType)
      ? { serviceAttribution: normalizeServiceAttribution(journal.serviceAttribution) }
      : {}),
  };
}

export function updateJournalInData(
  data: AppData,
  journalId: string,
  draft: JournalDraft,
  now = new Date().toISOString(),
): { data: AppData; journal: GarageJournalPost } {
  const previous = data.journals.find((journal) => journal.id === journalId);
  if (!previous) throw new Error("journal_not_found");
  if (previous.authorProfileId !== data.currentProfileId) {
    throw new Error("journal_owner_required");
  }
  if (!validateJournalDraft(draft).valid) throw new Error("journal_invalid");

  const next = createJournalPost(data, draft, previous.sourceLanguage, now, previous);
  const journal: GarageJournalPost = {
    ...next,
    id: previous.id,
    authorProfileId: previous.authorProfileId,
    appreciationCount: previous.appreciationCount,
    moderationState: previous.moderationState,
    createdAt: previous.createdAt,
    updatedAt: now,
    publishedAt:
      draft.visibility === "private"
        ? undefined
        : previous.publishedAt ?? now,
    isDemo: previous.isDemo,
  };
  const sourceChanged =
    previous.title !== journal.title ||
    JSON.stringify(previous.contentBlocks.filter((block) => block.type === "text")) !==
      JSON.stringify(journal.contentBlocks.filter((block) => block.type === "text"));

  return {
    journal,
    data: {
      ...data,
      journals: data.journals.map((item) => item.id === journalId ? journal : item),
      contentTranslations: data.contentTranslations.map((translation) =>
        translation.entityType === "garage_journal" &&
        translation.entityId === journalId &&
        translation.reviewStatus !== "rejected"
          ? sourceChanged
            ? { ...translation, reviewStatus: "outdated" as const }
            : { ...translation, sourceContentVersion: now }
          : translation,
      ),
    },
  };
}

export function isFollowing(
  data: AppData,
  targetType: FollowTargetType,
  targetId: string,
): boolean {
  return data.follows.some(
    (follow) =>
      follow.followerProfileId === data.currentProfileId &&
      follow.targetType === targetType &&
      follow.targetId === targetId,
  );
}

export function toggleFollowInData(
  data: AppData,
  targetType: FollowTargetType,
  targetId: string,
  now = new Date().toISOString(),
): AppData {
  if (targetType === "profile" && isProfileBlocked(data, targetId)) return data;
  if (
    targetType === "vehicle" &&
    data.journals.some(
      (journal) =>
        journal.vehicleTargetId === targetId &&
        isProfileBlocked(data, journal.authorProfileId),
    )
  ) {
    return data;
  }

  if (isFollowing(data, targetType, targetId)) {
    return {
      ...data,
      follows: data.follows.filter(
        (follow) =>
          !(
            follow.followerProfileId === data.currentProfileId &&
            follow.targetType === targetType &&
            follow.targetId === targetId
          ),
      ),
    };
  }

  const follow: FollowRelation = {
    id: `follow-${crypto.randomUUID()}`,
    followerProfileId: data.currentProfileId,
    targetType,
    targetId,
    createdAt: now,
  };
  return { ...data, follows: [...data.follows, follow] };
}

export function isProfileMuted(data: AppData, targetProfileId: string): boolean {
  return hasProfileSafetyRelation(data, targetProfileId, "mute");
}

export function isProfileBlocked(data: AppData, targetProfileId: string): boolean {
  return hasProfileSafetyRelation(data, targetProfileId, "block");
}

export function toggleMuteProfileInData(
  data: AppData,
  targetProfileId: string,
  now = new Date().toISOString(),
): AppData {
  if (targetProfileId === data.currentProfileId || isProfileBlocked(data, targetProfileId)) {
    return data;
  }
  if (isProfileMuted(data, targetProfileId)) {
    return {
      ...data,
      profileSafetyRelations: data.profileSafetyRelations.filter(
        (relation) =>
          !(
            relation.actorProfileId === data.currentProfileId &&
            relation.targetProfileId === targetProfileId &&
            relation.type === "mute"
          ),
      ),
    };
  }
  const relation: ProfileSafetyRelation = {
    id: `profile-safety-${crypto.randomUUID()}`,
    actorProfileId: data.currentProfileId,
    targetProfileId,
    type: "mute",
    createdAt: now,
  };
  return { ...data, profileSafetyRelations: [...data.profileSafetyRelations, relation] };
}

export function toggleBlockProfileInData(
  data: AppData,
  targetProfileId: string,
  now = new Date().toISOString(),
  relatedVehicleTargetIds: Iterable<string> = [],
): AppData {
  if (targetProfileId === data.currentProfileId) return data;
  if (isProfileBlocked(data, targetProfileId)) {
    return {
      ...data,
      profileSafetyRelations: data.profileSafetyRelations.filter(
        (relation) =>
          !(
            relation.actorProfileId === data.currentProfileId &&
            relation.targetProfileId === targetProfileId &&
            relation.type === "block"
          ),
      ),
    };
  }

  const blockedVehicleIds = new Set([
    ...relatedVehicleTargetIds,
    ...data.journals
      .filter((journal) => journal.authorProfileId === targetProfileId)
      .flatMap((journal) =>
        journal.vehicleTargetId ? [journal.vehicleTargetId] : [],
      ),
  ]);
  const relation: ProfileSafetyRelation = {
    id: `profile-safety-${crypto.randomUUID()}`,
    actorProfileId: data.currentProfileId,
    targetProfileId,
    type: "block",
    createdAt: now,
  };
  return {
    ...data,
    follows: data.follows.filter(
      (follow) =>
        follow.followerProfileId !== data.currentProfileId ||
        !(
          (follow.targetType === "profile" && follow.targetId === targetProfileId) ||
          (follow.targetType === "vehicle" && blockedVehicleIds.has(follow.targetId))
        ),
    ),
    profileSafetyRelations: [
      ...data.profileSafetyRelations.filter(
        (item) =>
          !(
            item.actorProfileId === data.currentProfileId &&
            item.targetProfileId === targetProfileId
          ),
      ),
      relation,
    ],
  };
}

export function canCurrentProfileViewJournal(
  data: AppData,
  journal: GarageJournalPost,
): boolean {
  if (journal.authorProfileId === data.currentProfileId) return true;
  if (isProfileBlocked(data, journal.authorProfileId)) return false;
  if (journal.moderationState === "temporarily_hidden") return false;
  if (journal.visibility === "private") return false;
  if (journal.visibility === "public") return true;
  return isFollowing(data, "profile", journal.authorProfileId);
}

export function canProfileViewProfile(
  data: AppData,
  targetProfileId: string,
  viewerProfileId?: string,
): boolean {
  const target = data.profiles.find((profile) => profile.id === targetProfileId);
  if (!target) return false;
  if (viewerProfileId === targetProfileId) return true;
  if (!viewerProfileId) return target.visibility === "public";
  if (
    data.profileSafetyRelations.some(
      (relation) =>
        relation.actorProfileId === viewerProfileId &&
        relation.targetProfileId === targetProfileId &&
        relation.type === "block",
    )
  ) {
    return false;
  }
  if (target.visibility === "public") return true;
  if (target.visibility === "private") return false;
  return data.follows.some(
    (follow) =>
      follow.followerProfileId === viewerProfileId &&
      follow.targetType === "profile" &&
      follow.targetId === targetProfileId,
  );
}

export function updateCurrentProfilePrivacy(
  data: AppData,
  visibility: ProfileVisibility,
  displayFields: ProfileDisplayField[],
): AppData {
  const allowedFields = new Set<ProfileDisplayField>([
    "role",
    "bio",
    "vehicles",
    "ownership_duration",
    "journal_count",
  ]);
  const uniqueFields = [...new Set(displayFields)].filter((field) => allowedFields.has(field));
  return {
    ...data,
    profiles: data.profiles.map((profile) =>
      profile.id === data.currentProfileId
        ? { ...profile, visibility, displayFields: uniqueFields }
        : profile,
    ),
  };
}

export function updateCurrentProfileIdentity(
  data: AppData,
  displayName: string,
  publicUsername?: string,
  bio?: string,
): AppData {
  const normalizedDisplayName = displayName.trim();
  if (!normalizedDisplayName || normalizedDisplayName.length > 80) {
    throw new Error("invalid_display_name");
  }
  const normalizedPublicUsername = publicUsername?.trim().toLowerCase() || undefined;
  if (
    normalizedPublicUsername &&
    !/^[a-z0-9_]{3,30}$/.test(normalizedPublicUsername)
  ) {
    throw new Error("invalid_public_username");
  }
  const normalizedBio = bio?.normalize("NFKC").trim() ?? "";
  if (normalizedBio.length > 300 || /<[^>]+>/.test(normalizedBio)) {
    throw new Error("invalid_profile_bio");
  }
  return {
    ...data,
    profiles: data.profiles.map((profile) =>
      profile.id === data.currentProfileId
        ? {
            ...profile,
            displayName: normalizedDisplayName,
            publicUsername: normalizedPublicUsername,
            bio: normalizedBio,
          }
        : profile,
    ),
  };
}

export function updateCurrentProfileImage(
  data: AppData,
  profileImagePath?: string,
): AppData {
  const normalizedPath = profileImagePath?.trim() || undefined;
  if (
    normalizedPath &&
    (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/avatar-[A-Za-z0-9_.-]+\.(?:jpg|webp)$/.test(normalizedPath) ||
      normalizedPath.includes("..") ||
      normalizedPath.length > 240)
  ) {
    throw new Error("invalid_profile_image_path");
  }
  return {
    ...data,
    profiles: data.profiles.map((profile) =>
      profile.id === data.currentProfileId
        ? { ...profile, profileImagePath: normalizedPath }
        : profile,
    ),
  };
}

export function getFollowingFeed(data: AppData): GarageJournalPost[] {
  const follows = data.follows.filter(
    (follow) => follow.followerProfileId === data.currentProfileId,
  );

  return data.journals
    .filter((journal) => {
      if (journal.authorProfileId === data.currentProfileId) return journal.visibility !== "private";
      if (journal.moderationState === "temporarily_hidden") return false;
      if (!canCurrentProfileViewJournal(data, journal)) return false;
      if (isProfileMuted(data, journal.authorProfileId)) return false;
      return follows.some((follow) => journalMatchesFollow(journal, follow));
    })
    .sort((left, right) =>
      (right.publishedAt ?? right.createdAt).localeCompare(
        left.publishedAt ?? left.createdAt,
      ),
    );
}

export function getFollowedSharedVehicleFeed(
  data: AppData,
  journals: GarageJournalPost[],
): GarageJournalPost[] {
  return journals
    .filter(
      (journal) =>
        Boolean(journal.vehicleTargetId) &&
        journal.visibility === "public" &&
        journal.moderationState === "visible" &&
        !isProfileBlocked(data, journal.authorProfileId) &&
        !isProfileMuted(data, journal.authorProfileId) &&
        isFollowing(data, "vehicle", journal.vehicleTargetId!),
    )
    .sort((left, right) =>
      (right.publishedAt ?? right.createdAt).localeCompare(
        left.publishedAt ?? left.createdAt,
      ),
    );
}

export function getFollowedSharedFeed(
  data: AppData,
  journals: GarageJournalPost[],
): GarageJournalPost[] {
  const profileTargets = new Set(
    data.follows
      .filter(
        (follow) =>
          follow.followerProfileId === data.currentProfileId &&
          follow.targetType === "profile",
      )
      .map((follow) => follow.targetId),
  );
  const vehicleTargets = new Set(
    data.follows
      .filter(
        (follow) =>
          follow.followerProfileId === data.currentProfileId &&
          follow.targetType === "vehicle",
      )
      .map((follow) => follow.targetId),
  );

  return [
    ...new Map(
      journals
        .filter(
          (journal) =>
            journal.visibility === "public" &&
            journal.moderationState === "visible" &&
            !isProfileBlocked(data, journal.authorProfileId) &&
            !isProfileMuted(data, journal.authorProfileId) &&
            (profileTargets.has(journal.authorProfileId) ||
              Boolean(
                journal.vehicleTargetId &&
                vehicleTargets.has(journal.vehicleTargetId),
              )),
        )
        .map((journal) => [journal.id, journal]),
    ).values(),
  ].sort((left, right) =>
    (right.publishedAt ?? right.createdAt).localeCompare(
      left.publishedAt ?? left.createdAt,
    ),
  );
}

export function getOwnJournals(data: AppData): GarageJournalPost[] {
  return data.journals
    .filter((journal) => journal.authorProfileId === data.currentProfileId)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function classifyJournalForKnowledge(
  journal: GarageJournalPost,
): JournalKnowledgeClassification {
  if (
    journal.visibility !== "public" ||
    journal.moderationState === "temporarily_hidden" ||
    !journal.knowledgeExtractionConsent
  ) {
    return "not_searchable";
  }
  return "related_owner_record";
}

export function createFollowTargets(data: AppData): FollowTargetSummary[] {
  const profileTargets = data.profiles
    .filter(
      (profile) =>
        profile.id !== data.currentProfileId && !isProfileBlocked(data, profile.id),
    )
    .map((profile) => ({
      type: "profile" as const,
      id: profile.id,
      label: profile.displayName,
      description: profile.isProfessional
        ? "DEMO Professional profile"
        : "DEMO owner profile",
      isDemo: profile.isDemo,
    }));
  const vehicleTargets = uniqueTargets(
    data.journals
      .filter(
        (journal) =>
          journal.vehicleTargetId &&
          journal.authorProfileId !== data.currentProfileId &&
          !isProfileBlocked(data, journal.authorProfileId) &&
          journal.visibility !== "private",
      )
      .map((journal) => {
        const owner = data.profiles.find(
          (profile) => profile.id === journal.authorProfileId,
        );
        return {
          type: "vehicle" as const,
          id: journal.vehicleTargetId!,
          label: `${owner?.displayName ?? "DEMO"} / ${journal.vehicleLabel}`,
          description: "DEMO individual vehicle",
          isDemo: journal.isDemo,
        };
      }),
  );
  const modelTargets = uniqueTargets(
    data.journals.map((journal) => ({
      type: "model" as const,
      id: journal.modelTargetId,
      label: journal.vehicleLabel.replace(/^DEMO:\s*/, ""),
      description: "DEMO vehicle model",
      isDemo: journal.isDemo,
    })),
  );
  return [...profileTargets, ...vehicleTargets, ...modelTargets];
}

function hasProfileSafetyRelation(
  data: AppData,
  targetProfileId: string,
  type: ProfileSafetyRelation["type"],
): boolean {
  return data.profileSafetyRelations.some(
    (relation) =>
      relation.actorProfileId === data.currentProfileId &&
      relation.targetProfileId === targetProfileId &&
      relation.type === type,
  );
}

export function modelTargetId(make: string, model: string): string {
  const identity = resolveVehicleIdentity(make, model);
  return canonicalModelTargetId({
    make: identity.canonicalMake,
    model: identity.modelInput,
    modelFamilyId: identity.modelFamilyId,
  });
}

function journalMatchesFollow(
  journal: GarageJournalPost,
  follow: FollowRelation,
): boolean {
  if (follow.targetType === "profile") return journal.authorProfileId === follow.targetId;
  if (follow.targetType === "vehicle") return journal.vehicleTargetId === follow.targetId;
  return journal.modelTargetId === follow.targetId;
}

function uniqueTargets(targets: FollowTargetSummary[]): FollowTargetSummary[] {
  return [...new Map(targets.map((target) => [`${target.type}:${target.id}`, target])).values()];
}
