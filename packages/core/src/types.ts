import type { LanguageTag, SupportedUiLocale } from "./language.ts";

/** @deprecated Prefer SupportedUiLocale for new UI-facing APIs. */
export type Locale = SupportedUiLocale;
export type HazardLevel = "LOW" | "CAUTION" | "CRITICAL";
export type ResolutionStatus = "resolved" | "unresolved";
export type Visibility = "private" | "pending_review" | "public";
export type VerificationStatus =
  | "owner_confirmed"
  | "ai_draft"
  | "mechanic_confirmed"
  | "official_source"
  | "unconfirmed";
export type SourceType = "owner_record" | "mechanic_record" | "official" | "demo";
export type PrototypeOdometerUnit = "km" | "mi" | "unknown";
export type PrototypeOdometerEpisodeReason =
  | "initial"
  | "replacement"
  | "repair"
  | "reset"
  | "rollover"
  | "unit_change"
  | "unknown";
export type PrototypeOdometerSequenceAssessment =
  | "consistent_increase"
  | "same_reading"
  | "new_episode"
  | "unit_changed"
  | "needs_context";
export type VehicleRelationshipType =
  | "owned"
  | "previously_owned"
  | "unknown"
  | "family"
  | "shared";
export type VehicleCategory = "car" | "motorcycle" | "moped" | "other";
export type VehicleOdometerContext =
  | "current"
  | "at_ownership_end"
  | "during_ownership"
  | "unknown";
export type RecordEvidenceBasis =
  | "contemporaneous"
  | "invoice_or_receipt"
  | "photo_or_service_book"
  | "recalled_later"
  | "unknown";

export interface PrototypeOdometerEpisode {
  id: string;
  reason: PrototypeOdometerEpisodeReason;
  startedAt?: string;
  previousEpisodeId?: string;
  notes?: string;
}

export interface PrototypeOdometerReading {
  episodeId: string;
  displayedValue: number;
  unit: PrototypeOdometerUnit;
  sequenceAssessment: PrototypeOdometerSequenceAssessment;
}

export interface Vehicle {
  id: string;
  ownerProfileId: string;
  vehicleCategory: VehicleCategory;
  make: string;
  model: string;
  year?: number;
  grade?: string;
  modelCode?: string;
  nickname?: string;
  ownershipType: VehicleRelationshipType;
  ownershipStartedYear?: number;
  ownershipStartedMonth?: number;
  ownershipEndedYear?: number;
  ownershipEndedMonth?: number;
  ownershipPeriodNote?: string;
  primaryUse?: string;
  dispositionReason?: string;
  engine: string;
  steering: string;
  transmission: string;
  /** @deprecated Use currentOdometerReading. */
  odometerKm: number;
  odometerEpisodes: PrototypeOdometerEpisode[];
  currentOdometerReading: PrototypeOdometerReading;
  odometerContext: VehicleOdometerContext;
  imagePath?: string;
  ownerComment?: string;
  isDemo: boolean;
}

export interface VehicleDraft {
  imagePath: string;
  vehicleCategory: VehicleCategory;
  make: string;
  model: string;
  year: string;
  grade: string;
  modelCode: string;
  nickname: string;
  ownershipType: VehicleRelationshipType;
  ownershipStartedYear: string;
  ownershipStartedMonth: string;
  ownershipEndedYear: string;
  ownershipEndedMonth: string;
  ownershipPeriodNote: string;
  primaryUse: string;
  dispositionReason: string;
  engine: string;
  steering: string;
  transmission: string;
  odometer: string;
  odometerUnit: PrototypeOdometerUnit;
  odometerContext: VehicleOdometerContext;
  ownerComment: string;
}

export interface PartReference {
  name: string;
  manufacturer?: string;
  partNumber?: string;
}

export interface MaintenanceRecordAction {
  id: string;
  summary: string;
  causeCandidates: string;
  checksPerformed: string;
  workPerformed: string;
  parts: PartReference[];
  result: string;
  resolutionStatus: ResolutionStatus;
  hazardLevel: HazardLevel;
}

export interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  serviceDate: string;
  /** @deprecated Use odometerReading. */
  odometerKm?: number;
  odometerReading?: PrototypeOdometerReading;
  summary: string;
  sourceLanguage: LanguageTag;
  demoTranslation?: Partial<Record<Locale, string>>;
  symptoms: string;
  causeCandidates: string;
  checksPerformed: string;
  workPerformed: string;
  parts: PartReference[];
  cost?: number;
  resolutionStatus: ResolutionStatus;
  hazardLevel: HazardLevel;
  visibility: Visibility;
  verificationStatus: VerificationStatus;
  sourceType: SourceType;
  evidenceBasis: RecordEvidenceBasis;
  matchScope: string;
  result: string;
  actions: MaintenanceRecordAction[];
  createdAt: string;
  updatedAt: string;
  isDemo: boolean;
}

export interface RecordActionDraft {
  clientId: string;
  summary: string;
  causeCandidates: string;
  checksPerformed: string;
  workPerformed: string;
  partName: string;
  partManufacturer: string;
  partNumber: string;
  result: string;
  resolutionStatus: ResolutionStatus;
  hazardLevel: HazardLevel;
}

export interface RecordDraft {
  serviceDate: string;
  odometerKm: string;
  odometerUnit: PrototypeOdometerUnit;
  odometerEpisodeId: string;
  odometerChangeReason: PrototypeOdometerEpisodeReason | "same_episode";
  summary: string;
  symptoms: string;
  causeCandidates: string;
  checksPerformed: string;
  workPerformed: string;
  partName: string;
  partManufacturer: string;
  partNumber: string;
  cost: string;
  resolutionStatus: ResolutionStatus;
  hazardLevel: HazardLevel;
  evidenceBasis: RecordEvidenceBasis;
  additionalActions: RecordActionDraft[];
  requestSharing: boolean;
}

export interface RecordFilters {
  keyword?: string;
  year?: number;
  engine?: string;
  symptom?: string;
  partNumber?: string;
  resolutionStatus?: ResolutionStatus | "all";
  hazardLevel?: HazardLevel | "all";
}

export type JournalVisibility = "private" | "followers" | "public";
export type JournalModerationState = "visible" | "under_review" | "temporarily_hidden";
export type SocialProfileRole = "owner" | "mechanic";
export type ProfileVisibility = "private" | "followers" | "public";
export type ProfileDisplayField =
  | "role"
  | "bio"
  | "vehicles"
  | "ownership_duration"
  | "journal_count";
export type FollowTargetType = "profile" | "vehicle" | "model";
export type ProfileSafetyRelationType = "mute" | "block";
export type JournalDisplayField = "service_date" | "odometer" | "actions";
export type JournalMediaKind = "image" | "video";
export type JournalMediaSource = "local_blob" | "demo_asset" | "alpha_inline";
export type JournalMediaPrivacyState = "private_only" | "public_ready";
export type JournalTextBlockStyle = "paragraph" | "heading" | "quote";
export type JournalEventType =
  | "delivery"
  | "photo"
  | "drive"
  | "inspection"
  | "tire"
  | "oil"
  | "breakdown"
  | "repair"
  | "part"
  | "custom"
  | "event"
  | "memory"
  | "other";

export interface JournalTextBlock {
  id: string;
  type: "text";
  style: JournalTextBlockStyle;
  text: string;
}

export interface JournalMediaBlock {
  id: string;
  type: "media";
  mediaId: string;
}

export type JournalContentBlock = JournalTextBlock | JournalMediaBlock;

export interface JournalMediaAttachment {
  id: string;
  kind: JournalMediaKind;
  source: JournalMediaSource;
  storageKey?: string;
  assetPath?: string;
  mimeType: string;
  sizeBytes: number;
  altText: string;
  privacyState: JournalMediaPrivacyState;
  createdAt: string;
  isDemo: boolean;
}

export interface SocialProfile {
  id: string;
  displayName: string;
  role: SocialProfileRole;
  bio: string;
  visibility: ProfileVisibility;
  displayFields: ProfileDisplayField[];
  isProfessional: boolean;
  isDemo: boolean;
}

export interface GarageJournalPost {
  id: string;
  authorProfileId: string;
  vehicleId?: string;
  vehicleTargetId?: string;
  vehicleLabel: string;
  modelTargetId: string;
  title: string;
  eventType?: JournalEventType;
  bodyOriginal: string;
  sourceLanguage: LanguageTag;
  visibility: JournalVisibility;
  moderationState: JournalModerationState;
  linkedRecordId?: string;
  displayFields: JournalDisplayField[];
  media: JournalMediaAttachment[];
  contentBlocks: JournalContentBlock[];
  knowledgeExtractionConsent: boolean;
  appreciationCount: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  isDemo: boolean;
}

export interface FollowRelation {
  id: string;
  followerProfileId: string;
  targetType: FollowTargetType;
  targetId: string;
  createdAt: string;
}

export interface ProfileSafetyRelation {
  id: string;
  actorProfileId: string;
  targetProfileId: string;
  type: ProfileSafetyRelationType;
  createdAt: string;
}

export type ContentReportReason =
  | "personal_information"
  | "dangerous_claim"
  | "harassment"
  | "copyright"
  | "spam"
  | "other";
export type ContentReportStatus =
  | "submitted"
  | "under_review"
  | "action_requested"
  | "temporarily_hidden"
  | "closed_no_action";
export type ModerationAction =
  | "submitted"
  | "start_review"
  | "request_correction"
  | "hide_temporarily"
  | "close_no_action"
  | "restore_content";

export interface ModerationEvent {
  id: string;
  actorProfileId: string;
  action: ModerationAction;
  createdAt: string;
}

export interface ContentReport {
  id: string;
  reporterProfileId: string;
  targetType: "journal";
  targetId: string;
  reason: ContentReportReason;
  details?: string;
  status: ContentReportStatus;
  events: ModerationEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface FollowTargetSummary {
  type: FollowTargetType;
  id: string;
  label: string;
  description: string;
  isDemo: boolean;
}

export interface JournalDraft {
  title: string;
  eventType?: JournalEventType;
  bodyOriginal: string;
  vehicleId: string;
  linkedRecordId: string;
  displayFields: JournalDisplayField[];
  media: JournalMediaAttachment[];
  contentBlocks: JournalContentBlock[];
  visibility: JournalVisibility;
  knowledgeExtractionConsent: boolean;
}

export interface AppData {
  schemaVersion: 9;
  vehicles: Vehicle[];
  records: MaintenanceRecord[];
  profiles: SocialProfile[];
  currentProfileId: string;
  journals: GarageJournalPost[];
  follows: FollowRelation[];
  profileSafetyRelations: ProfileSafetyRelation[];
  contentReports: ContentReport[];
}
