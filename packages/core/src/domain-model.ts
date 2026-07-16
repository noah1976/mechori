import type {
  HazardLevel,
  Locale,
  ResolutionStatus,
  VerificationStatus,
} from "./types.ts";

export type UnknownState = "known" | "unknown" | "not_applicable";
export type SpecificationState = "user_entered" | "confirmed" | "unknown";
export type EventVisibility = "private" | "sharing_draft_created";
export type ObservationType =
  | "symptom"
  | "warning"
  | "inspection_note"
  | "scheduled_service"
  | "other";
export type FactState =
  | "user_confirmed"
  | "extracted_candidate"
  | "inferred"
  | "unreadable";
export type ActionType =
  | "inspection"
  | "replacement"
  | "adjustment"
  | "repair"
  | "cleaning"
  | "measurement"
  | "other";
export type PartUsageType =
  | "replaced"
  | "installed"
  | "removed"
  | "refilled"
  | "inspected"
  | "other";
export type PartNumberVerification =
  | "missing"
  | "needs_review"
  | "user_confirmed"
  | "source_confirmed";

export interface VehicleProfile {
  id: string;
  ownerUserId: string;
  makeName: string;
  modelName: string;
  modelYear?: number;
  engineDescriptor?: string;
  transmissionDescriptor?: string;
  steeringPosition?: string;
  marketRegion?: string;
  variantDescriptor?: string;
  relationshipType: "owned" | "previously_owned" | "family" | "shared";
  ownershipStartedYear?: number;
  ownershipStartedMonth?: number;
  ownershipEndedYear?: number;
  ownershipEndedMonth?: number;
  specificationState: SpecificationState;
  visibility: "private";
  createdAt: string;
  updatedAt: string;
}

export type OdometerUnit = "km" | "mi" | "unknown";
export type OdometerEpisodeReason =
  | "initial"
  | "replacement"
  | "repair"
  | "reset"
  | "rollover"
  | "unit_change"
  | "unknown";
export type OdometerContinuityState = "confirmed" | "partially_estimated" | "unknown";
export type OdometerContextState =
  | "normal"
  | "before_change"
  | "after_change"
  | "after_rollover"
  | "unit_changed"
  | "unknown";

export interface OdometerEpisode {
  id: string;
  vehicleId: string;
  startedAt?: string;
  endedAt?: string;
  episodeReason: OdometerEpisodeReason;
  previousEpisodeId?: string;
  continuityState: OdometerContinuityState;
  changeEvidenceSourceId?: string;
  notes?: string;
}

export interface OdometerReading {
  id: string;
  vehicleId: string;
  odometerEpisodeId: string;
  displayedValue: number;
  unit: OdometerUnit;
  recordedAt: string;
  verificationStatus: VerificationStatus;
  evidenceSourceId?: string;
  contextState: OdometerContextState;
}

export interface CumulativeDistanceEstimate {
  vehicleId: string;
  estimatedValue?: number;
  minimumValue?: number;
  maximumValue?: number;
  unit: Exclude<OdometerUnit, "unknown">;
  calculationBasis: string;
  confidenceState: "confirmed" | "estimated" | "unknown";
  calculatedAt: string;
}

export interface Observation {
  id: string;
  maintenanceEventId: string;
  observationType: ObservationType;
  originalText: string;
  sourceLanguage: Locale;
  normalizedCode?: string;
  factState: FactState;
}

export interface PartUsage {
  id: string;
  maintenanceActionId: string;
  partNameOriginal: string;
  manufacturerOriginal?: string;
  partNumberOriginal?: string;
  usageType: PartUsageType;
  quantity?: number;
  unit?: string;
  partNumberVerification: PartNumberVerification;
  sourceFieldAssertionId?: string;
}

export interface MaintenanceAction {
  id: string;
  maintenanceEventId: string;
  actionType: ActionType;
  originalText: string;
  sourceLanguage: Locale;
  normalizedCode?: string;
  causeCandidateText?: string;
  checksPerformedText?: string;
  resultText?: string;
  resolutionStatus: ResolutionStatus | "partially_resolved" | "not_applicable" | "unknown";
  hazardTags: string[];
  hazardLevel: HazardLevel;
  verificationStatus: VerificationStatus;
  displayOrder: number;
  parts: PartUsage[];
}

export interface MaintenanceEvent {
  id: string;
  vehicleId: string;
  ownerUserId: string;
  serviceDate?: string;
  serviceDateState: UnknownState;
  odometerReadingId?: string;
  summary: string;
  sourceLanguage: Locale;
  providerType: "self" | "repair_shop" | "unknown";
  totalCost?: number;
  currencyCode?: string;
  resolutionStatus: ResolutionStatus | "partially_resolved" | "not_applicable" | "unknown";
  verificationStatus: VerificationStatus;
  visibility: EventVisibility;
  observations: Observation[];
  actions: MaintenanceAction[];
  evidenceSourceIds: string[];
  createdAt: string;
  updatedAt: string;
}

export type ImportInputType = "pdf" | "image" | "csv" | "audio" | "other";
export type ProcessingLocation = "on_device" | "local" | "approved_external_provider";
export type ImportSessionStatus =
  | "created"
  | "extracting"
  | "extracted"
  | "structuring"
  | "awaiting_review"
  | "confirmed"
  | "persisted"
  | "partially_failed"
  | "failed"
  | "discarded";
export type CandidateStatus =
  | "unreviewed"
  | "in_review"
  | "confirmed"
  | "rejected"
  | "merged"
  | "split";
export type InferenceState = "read" | "inferred" | "unreadable" | "manual";
export type FieldVerificationState =
  | "unreviewed"
  | "needs_review"
  | "user_confirmed"
  | "rejected";

export interface FieldAssertion {
  id: string;
  extractedCandidateId: string;
  fieldCode: string;
  rawExtractedText?: string;
  suggestedValue?: string;
  sourcePage?: number;
  sourceRegionReference?: string;
  confidenceBand?: "high" | "medium" | "low" | "unknown";
  inferenceState: InferenceState;
  verificationState: FieldVerificationState;
  correctedValue?: string;
}

export interface ExtractedCandidate {
  id: string;
  importSessionId: string;
  candidateType: "maintenance_event" | "maintenance_action" | "part_usage";
  suggestedParentId?: string;
  sourcePageReferences: number[];
  status: CandidateStatus;
  modelOrRuleVersion?: string;
  fieldAssertions: FieldAssertion[];
  createdAt: string;
  confirmedAt?: string;
  confirmedByUserId?: string;
}

export interface ImportSession {
  id: string;
  ownerUserId: string;
  vehicleId: string;
  inputType: ImportInputType;
  processingLocation: ProcessingLocation;
  status: ImportSessionStatus;
  pageCount?: number;
  candidates: ExtractedCandidate[];
  createdAt: string;
  expiresAt?: string;
  completedAt?: string;
}
