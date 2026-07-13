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

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  engine: string;
  steering: string;
  transmission: string;
  odometerKm: number;
  imagePath: string;
  isDemo: boolean;
}

export interface PartReference {
  name: string;
  manufacturer?: string;
  partNumber?: string;
}

export interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  serviceDate: string;
  odometerKm: number;
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
  createdAt: string;
  updatedAt: string;
  isDemo: boolean;
}

export interface RecordDraft {
  serviceDate: string;
  odometerKm: string;
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
  vehicles: Vehicle[];
  records: MaintenanceRecord[];
}
