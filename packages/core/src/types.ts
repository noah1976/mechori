export type Locale = "ja" | "en";
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
  make: string;
  model: string;
  year: number;
  engine: string;
  steering: string;
  transmission: string;
  /** @deprecated Use currentOdometerReading. */
  odometerKm: number;
  odometerEpisodes: PrototypeOdometerEpisode[];
  currentOdometerReading: PrototypeOdometerReading;
  imagePath: string;
  isDemo: boolean;
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
  odometerKm: number;
  odometerReading: PrototypeOdometerReading;
  summary: string;
  sourceLanguage: Locale;
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

export interface AppData {
  schemaVersion: 2;
  vehicles: Vehicle[];
  records: MaintenanceRecord[];
}
