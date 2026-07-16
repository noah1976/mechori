import type {
  AppData,
  MaintenanceRecord,
  MaintenanceRecordAction,
  PrototypeOdometerEpisode,
  PrototypeOdometerReading,
  RecordActionDraft,
  RecordDraft,
  RecordFilters,
  Vehicle,
} from "./types.ts";
import { demoData } from "./demo.ts";

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
  if (
    draft.additionalActions.some(
      (action) =>
        !action.summary.trim() ||
        (action.partNumber.trim() !== "" && action.partNumber.trim().length < 3),
    )
  ) {
    errors.additionalActions = "invalid";
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
      ...record.actions.flatMap((action) => [
        action.summary,
        action.causeCandidates,
        action.checksPerformed,
        action.workPerformed,
        action.result,
        ...action.parts.flatMap((part) => [
          part.name,
          part.manufacturer ?? "",
          part.partNumber ?? "",
        ]),
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
      ) &&
      !record.actions.some((action) =>
        action.parts.some((part) =>
          part.partNumber?.toLocaleLowerCase().includes(partNumber),
        ),
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
  const primaryAction = actionFromDraft(
    {
      clientId: "primary",
      summary: draft.summary,
      causeCandidates: draft.causeCandidates,
      checksPerformed: draft.checksPerformed,
      workPerformed: draft.workPerformed,
      partName: draft.partName,
      partManufacturer: draft.partManufacturer,
      partNumber: draft.partNumber,
      result: draft.resolutionStatus === "resolved" ? "ユーザーが解決済みとして記録" : "未解決",
      resolutionStatus: draft.resolutionStatus,
      hazardLevel: draft.hazardLevel,
    },
    existingId ? `action-${existingId}-primary` : undefined,
  );
  const actions = [
    primaryAction,
    ...draft.additionalActions.map((action) => actionFromDraft(action)),
  ];
  const episodeId = draft.odometerEpisodeId || "episode-prototype";
  const odometerReading: PrototypeOdometerReading = {
    episodeId,
    displayedValue: Number(draft.odometerKm),
    unit: draft.odometerUnit,
    sequenceAssessment:
      draft.odometerChangeReason === "same_episode" ? "consistent_increase" : "new_episode",
  };
  const resolutionStatus = actions.every((action) => action.resolutionStatus === "resolved")
    ? "resolved"
    : "unresolved";
  const hazardLevel = highestHazardLevel(actions);

  return {
    id: existingId ?? `record-${crypto.randomUUID()}`,
    vehicleId,
    serviceDate: draft.serviceDate,
    odometerKm: Number(draft.odometerKm),
    odometerReading,
    summary: draft.summary.trim(),
    sourceLanguage,
    symptoms: draft.symptoms.trim(),
    causeCandidates: draft.causeCandidates.trim() || "未確認",
    checksPerformed: draft.checksPerformed.trim() || "未入力",
    workPerformed: draft.workPerformed.trim() || "未入力",
    parts: primaryAction.parts,
    cost: draft.cost ? Number(draft.cost) : undefined,
    resolutionStatus,
    hazardLevel,
    visibility: draft.requestSharing ? "pending_review" : "private",
    verificationStatus: "owner_confirmed",
    sourceType: "owner_record",
    matchScope: "登録車両の記録",
    result: primaryAction.result,
    actions,
    createdAt: now,
    updatedAt: now,
    isDemo: false,
  };
}

export function createEmptyActionDraft(): RecordActionDraft {
  return {
    clientId: `draft-action-${crypto.randomUUID()}`,
    summary: "",
    causeCandidates: "",
    checksPerformed: "",
    workPerformed: "",
    partName: "",
    partManufacturer: "",
    partNumber: "",
    result: "",
    resolutionStatus: "unresolved",
    hazardLevel: "LOW",
  };
}

export function applyRecordDraftToData(
  data: AppData,
  draft: RecordDraft,
  existingId?: string,
  sourceLanguage: MaintenanceRecord["sourceLanguage"] = "ja",
): { data: AppData; record: MaintenanceRecord } {
  const existingRecord = existingId
    ? data.records.find((record) => record.id === existingId)
    : undefined;
  const vehicleId = existingRecord?.vehicleId ?? data.vehicles[0]?.id;
  if (!vehicleId) throw new Error("vehicle_required");
  const vehicle = data.vehicles.find((item) => item.id === vehicleId);
  if (!vehicle) throw new Error("vehicle_not_found");

  const newEpisodeReason =
    draft.odometerChangeReason === "same_episode"
      ? undefined
      : draft.odometerChangeReason;
  const existingEpisode = existingRecord
    ? vehicle.odometerEpisodes.find(
        (episode) => episode.id === existingRecord.odometerReading.episodeId,
      )
    : undefined;
  const reusingRecordedChange = Boolean(
    newEpisodeReason &&
      existingRecord &&
      existingEpisode &&
      existingEpisode.reason !== "initial" &&
      existingEpisode.startedAt === existingRecord.serviceDate,
  );
  const creatingEpisode = newEpisodeReason !== undefined && !reusingRecordedChange;
  const currentEpisodeId =
    reusingRecordedChange && existingRecord
      ? existingRecord.odometerReading.episodeId
      : draft.odometerEpisodeId || vehicle.currentOdometerReading.episodeId;
  const episodeId = creatingEpisode
    ? `episode-${crypto.randomUUID()}`
    : currentEpisodeId;
  const nextEpisode: PrototypeOdometerEpisode | undefined = creatingEpisode
    ? {
        id: episodeId,
        reason: newEpisodeReason,
        startedAt: draft.serviceDate,
        previousEpisodeId: currentEpisodeId,
      }
    : undefined;

  const previousReading = [...data.records]
    .filter(
      (record) =>
        record.id !== existingId &&
        record.odometerReading.episodeId === episodeId &&
        record.serviceDate <= draft.serviceDate,
    )
    .sort((left, right) => right.serviceDate.localeCompare(left.serviceDate))[0]
    ?.odometerReading;
  const odometerReading: PrototypeOdometerReading = {
    episodeId,
    displayedValue: Number(draft.odometerKm),
    unit: draft.odometerUnit,
    sequenceAssessment: newEpisodeReason
      ? "new_episode"
      : assessPrototypeOdometer(previousReading, Number(draft.odometerKm), draft.odometerUnit),
  };

  const created = createRecordFromDraft(
    { ...draft, odometerEpisodeId: episodeId },
    vehicleId,
    existingId,
    existingRecord?.sourceLanguage ?? sourceLanguage,
  );
  const record: MaintenanceRecord = existingRecord
    ? { ...created, createdAt: existingRecord.createdAt, isDemo: existingRecord.isDemo, odometerReading }
    : { ...created, odometerReading };
  const records = existingRecord
    ? data.records.map((item) => (item.id === existingId ? record : item))
    : [record, ...data.records];
  const latestVehicleRecord = records
    .filter((item) => item.vehicleId === vehicleId)
    .sort((left, right) => right.serviceDate.localeCompare(left.serviceDate))[0];
  const nextVehicle: Vehicle = {
    ...vehicle,
    odometerEpisodes: nextEpisode
      ? [...vehicle.odometerEpisodes, nextEpisode]
      : vehicle.odometerEpisodes,
    currentOdometerReading:
      latestVehicleRecord?.odometerReading ?? vehicle.currentOdometerReading,
    odometerKm:
      latestVehicleRecord?.odometerReading.displayedValue ?? vehicle.odometerKm,
  };

  return {
    record,
    data: {
      ...data,
      schemaVersion: 5,
      vehicles: data.vehicles.map((item) => (item.id === vehicleId ? nextVehicle : item)),
      records,
    },
  };
}

export function migrateAppData(input: unknown): AppData | null {
  if (!input || typeof input !== "object") return null;
  const source = input as Partial<AppData> & {
    vehicles?: Array<Partial<Vehicle> & { odometerKm?: number }>;
    records?: Array<Partial<MaintenanceRecord> & { odometerKm?: number }>;
  };
  if (!Array.isArray(source.vehicles) || !Array.isArray(source.records)) return null;
  const demoMediaByJournalId = new Map(
    demoData.journals.map((journal) => [journal.id, journal.media]),
  );

  const vehicles = source.vehicles.filter(hasVehicleIdentity).map((vehicle) => {
    const legacyEpisodeId = `episode-${vehicle.id}-legacy`;
    return {
      ...vehicle,
      odometerKm: vehicle.odometerKm ?? 0,
      odometerEpisodes:
        vehicle.odometerEpisodes?.length
          ? vehicle.odometerEpisodes
          : [{ id: legacyEpisodeId, reason: "initial" as const }],
      currentOdometerReading:
        vehicle.currentOdometerReading ?? {
          episodeId: legacyEpisodeId,
          displayedValue: vehicle.odometerKm ?? 0,
          unit: "km" as const,
          sequenceAssessment: "consistent_increase" as const,
        },
    } as Vehicle;
  });
  const episodeByVehicle = new Map(
    vehicles.map((vehicle) => [vehicle.id, vehicle.odometerEpisodes[0]?.id ?? "episode-legacy"]),
  );
  const records = source.records.filter(hasRecordIdentity).map((record) => {
    const episodeId = episodeByVehicle.get(record.vehicleId) ?? "episode-legacy";
    const primaryAction: MaintenanceRecordAction = {
      id: `action-${record.id}-legacy`,
      summary: record.summary,
      causeCandidates: record.causeCandidates ?? "未確認",
      checksPerformed: record.checksPerformed ?? "未入力",
      workPerformed: record.workPerformed ?? "未入力",
      parts: record.parts ?? [],
      result: record.result ?? "未確認",
      resolutionStatus: record.resolutionStatus ?? "unresolved",
      hazardLevel: record.hazardLevel ?? "LOW",
    };
    return {
      ...record,
      odometerKm: record.odometerKm ?? 0,
      odometerReading:
        record.odometerReading ?? {
          episodeId,
          displayedValue: record.odometerKm ?? 0,
          unit: "km" as const,
          sequenceAssessment: "consistent_increase" as const,
        },
      actions: record.actions?.length ? record.actions : [primaryAction],
    } as MaintenanceRecord;
  });

  return {
    schemaVersion: 5,
    vehicles,
    records,
    profiles: Array.isArray(source.profiles)
      ? source.profiles
      : structuredClone(demoData.profiles),
    currentProfileId:
      typeof source.currentProfileId === "string"
        ? source.currentProfileId
        : demoData.currentProfileId,
    journals: Array.isArray(source.journals)
      ? source.journals.map((journal) => {
          const media =
            Array.isArray(journal.media) && journal.media.length > 0
              ? journal.media
              : journal.isDemo
                ? structuredClone(demoMediaByJournalId.get(journal.id) ?? [])
                : [];
          const contentBlocks = Array.isArray(journal.contentBlocks)
            ? journal.contentBlocks
            : [
                ...(journal.bodyOriginal
                  ? [{
                      id: `journal-block-${journal.id}-legacy-text`,
                      type: "text" as const,
                      style: "paragraph" as const,
                      text: journal.bodyOriginal,
                    }]
                  : []),
                ...media.map((attachment) => ({
                  id: `journal-block-${attachment.id}-legacy-media`,
                  type: "media" as const,
                  mediaId: attachment.id,
                })),
              ];
          return { ...journal, media, contentBlocks };
        })
      : structuredClone(demoData.journals),
    follows: Array.isArray(source.follows)
      ? source.follows
      : structuredClone(demoData.follows),
  };
}

function actionFromDraft(
  draft: RecordActionDraft,
  existingId?: string,
): MaintenanceRecordAction {
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
    id:
      existingId ??
      (draft.clientId !== "primary" ? draft.clientId : `action-${crypto.randomUUID()}`),
    summary: draft.summary.trim() || "作業記録",
    causeCandidates: draft.causeCandidates.trim() || "未確認",
    checksPerformed: draft.checksPerformed.trim() || "未入力",
    workPerformed: draft.workPerformed.trim() || "未入力",
    parts,
    result:
      draft.result.trim() ||
      (draft.resolutionStatus === "resolved" ? "ユーザーが解決済みとして記録" : "未解決"),
    resolutionStatus: draft.resolutionStatus,
    hazardLevel: draft.hazardLevel,
  };
}

function highestHazardLevel(actions: MaintenanceRecordAction[]) {
  if (actions.some((action) => action.hazardLevel === "CRITICAL")) return "CRITICAL" as const;
  if (actions.some((action) => action.hazardLevel === "CAUTION")) return "CAUTION" as const;
  return "LOW" as const;
}

function assessPrototypeOdometer(
  previous: PrototypeOdometerReading | undefined,
  displayedValue: number,
  unit: PrototypeOdometerReading["unit"],
): PrototypeOdometerReading["sequenceAssessment"] {
  if (!previous) return "consistent_increase";
  if (previous.unit !== unit) return "unit_changed";
  if (displayedValue < previous.displayedValue) return "needs_context";
  if (displayedValue === previous.displayedValue) return "same_reading";
  return "consistent_increase";
}

function hasVehicleIdentity(
  vehicle: Partial<Vehicle>,
): vehicle is Partial<Vehicle> & Pick<Vehicle, "id" | "make" | "model"> {
  return Boolean(vehicle.id && vehicle.make && vehicle.model);
}

function hasRecordIdentity(
  record: Partial<MaintenanceRecord>,
): record is Partial<MaintenanceRecord> &
  Pick<MaintenanceRecord, "id" | "vehicleId" | "summary" | "serviceDate" | "symptoms"> {
  return Boolean(
    record.id && record.vehicleId && record.summary && record.serviceDate && record.symptoms,
  );
}
