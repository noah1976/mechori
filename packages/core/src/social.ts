import type {
  AppData,
  FollowRelation,
  FollowTargetSummary,
  FollowTargetType,
  GarageJournalPost,
  JournalDraft,
} from "./types.ts";

export interface JournalValidationResult {
  valid: boolean;
  errors: Partial<Record<"title" | "bodyOriginal" | "media", "required" | "private_only">>;
}

export type JournalKnowledgeClassification =
  | "not_searchable"
  | "related_owner_record";

export function validateJournalDraft(draft: JournalDraft): JournalValidationResult {
  const errors: JournalValidationResult["errors"] = {};
  if (!draft.title.trim()) errors.title = "required";
  const hasContent = draft.contentBlocks.some((block) =>
    block.type === "media" ? true : Boolean(block.text.trim()),
  );
  if (!hasContent && !draft.linkedRecordId) errors.bodyOriginal = "required";
  if (
    draft.visibility !== "private" &&
    draft.media.some((attachment) => attachment.privacyState !== "public_ready")
  ) {
    errors.media = "private_only";
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function createJournalPost(
  data: AppData,
  draft: JournalDraft,
  sourceLanguage: GarageJournalPost["sourceLanguage"],
  now = new Date().toISOString(),
): GarageJournalPost {
  const vehicle = data.vehicles.find((item) => item.id === draft.vehicleId);
  if (!vehicle) throw new Error("vehicle_required");
  const bodyOriginal = draft.contentBlocks
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .filter((text) => text.trim())
    .join("\n\n");

  return {
    id: `journal-${crypto.randomUUID()}`,
    authorProfileId: data.currentProfileId,
    vehicleId: vehicle.id,
    vehicleTargetId: vehicle.id,
    vehicleLabel: `${vehicle.make} ${vehicle.model}`,
    modelTargetId: modelTargetId(vehicle.make, vehicle.model),
    title: draft.title.trim(),
    bodyOriginal,
    sourceLanguage,
    visibility: draft.visibility,
    linkedRecordId: draft.linkedRecordId || undefined,
    displayFields: draft.linkedRecordId ? [...draft.displayFields] : [],
    media: draft.media.map((attachment) => ({ ...attachment })),
    contentBlocks: draft.contentBlocks.map((block) => ({ ...block })),
    knowledgeExtractionConsent: draft.knowledgeExtractionConsent,
    appreciationCount: 0,
    createdAt: now,
    updatedAt: now,
    publishedAt: draft.visibility === "private" ? undefined : now,
    isDemo: false,
  };
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

export function getFollowingFeed(data: AppData): GarageJournalPost[] {
  const follows = data.follows.filter(
    (follow) => follow.followerProfileId === data.currentProfileId,
  );

  return data.journals
    .filter((journal) => {
      if (journal.authorProfileId === data.currentProfileId) {
        return journal.visibility !== "private";
      }
      if (journal.visibility === "private") return false;
      if (journal.visibility === "followers") {
        return follows.some(
          (follow) =>
            follow.targetType === "profile" &&
            follow.targetId === journal.authorProfileId,
        );
      }
      return follows.some((follow) => journalMatchesFollow(journal, follow));
    })
    .sort((left, right) =>
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
  if (journal.visibility !== "public" || !journal.knowledgeExtractionConsent) {
    return "not_searchable";
  }
  return "related_owner_record";
}

export function createFollowTargets(data: AppData): FollowTargetSummary[] {
  const profileTargets = data.profiles
    .filter((profile) => profile.id !== data.currentProfileId)
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

export function modelTargetId(make: string, model: string): string {
  return `model:${make.trim().toLocaleLowerCase()}:${model.trim().toLocaleLowerCase()}`;
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
