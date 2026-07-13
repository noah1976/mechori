import type {
  MaintenanceRecord,
  RecordDraft,
  RecordFilters,
} from "./types.ts";

export interface ValidationResult {
  valid: boolean;
  errors: Partial<Record<keyof RecordDraft, string>>;
}

export function validateRecordDraft(draft: RecordDraft): ValidationResult {
  const errors: ValidationResult["errors"] = {};
  const odometer = Number(draft.odometerKm);

  if (!draft.serviceDate) errors.serviceDate = "required";
  if (!draft.summary.trim()) errors.summary = "required";
  if (!draft.odometerKm || !Number.isFinite(odometer) || odometer < 0) {
    errors.odometerKm = "invalid";
  }
  if (!draft.symptoms.trim()) errors.symptoms = "required";
  if (draft.partNumber.trim() && draft.partNumber.trim().length < 3) {
    errors.partNumber = "verify";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function filterRecords(
  records: MaintenanceRecord[],
  filters: RecordFilters,
): MaintenanceRecord[] {
  const keyword = filters.keyword?.trim().toLocaleLowerCase();
  const symptom = filters.symptom?.trim().toLocaleLowerCase();
  const partNumber = filters.partNumber?.trim().toLocaleLowerCase();

  return records.filter((record) => {
    const searchable = [
      record.summary,
      record.symptoms,
      record.causeCandidates,
      record.checksPerformed,
      record.workPerformed,
      record.result,
      ...record.parts.flatMap((part) => [
        part.name,
        part.manufacturer ?? "",
        part.partNumber ?? "",
      ]),
    ]
      .join(" ")
      .toLocaleLowerCase();

    if (keyword && !searchable.includes(keyword)) return false;
    if (symptom && !record.symptoms.toLocaleLowerCase().includes(symptom)) return false;
    if (
      partNumber &&
      !record.parts.some((part) =>
        part.partNumber?.toLocaleLowerCase().includes(partNumber),
      )
    ) {
      return false;
    }
    if (
      filters.resolutionStatus &&
      filters.resolutionStatus !== "all" &&
      record.resolutionStatus !== filters.resolutionStatus
    ) {
      return false;
    }
    if (
      filters.hazardLevel &&
      filters.hazardLevel !== "all" &&
      record.hazardLevel !== filters.hazardLevel
    ) {
      return false;
    }
    return true;
  });
}

export function createRecordFromDraft(
  draft: RecordDraft,
  vehicleId: string,
  existingId?: string,
  sourceLanguage: MaintenanceRecord["sourceLanguage"] = "ja",
): MaintenanceRecord {
  const now = new Date().toISOString();
  const parts = draft.partName.trim()
    ? [
        {
          name: draft.partName.trim(),
          manufacturer: draft.partManufacturer.trim() || undefined,
          partNumber: draft.partNumber.trim() || undefined,
        },
      ]
    : [];

  return {
    id: existingId ?? `record-${crypto.randomUUID()}`,
    vehicleId,
    serviceDate: draft.serviceDate,
    odometerKm: Number(draft.odometerKm),
    summary: draft.summary.trim(),
    sourceLanguage,
    symptoms: draft.symptoms.trim(),
    causeCandidates: draft.causeCandidates.trim() || "未確認",
    checksPerformed: draft.checksPerformed.trim() || "未入力",
    workPerformed: draft.workPerformed.trim() || "未入力",
    parts,
    cost: draft.cost ? Number(draft.cost) : undefined,
    resolutionStatus: draft.resolutionStatus,
    hazardLevel: draft.hazardLevel,
    visibility: draft.requestSharing ? "pending_review" : "private",
    verificationStatus: "owner_confirmed",
    sourceType: "owner_record",
    matchScope: "登録車両の記録",
    result:
      draft.resolutionStatus === "resolved"
        ? "ユーザーが解決済みとして記録"
        : "未解決",
    createdAt: now,
    updatedAt: now,
    isDemo: false,
  };
}
