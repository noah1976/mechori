import type { AppData, Vehicle, VehicleDraft } from "./types.ts";

export interface VehicleDraftValidationResult {
  valid: boolean;
  errors: Partial<Record<keyof VehicleDraft, "required" | "invalid">>;
}

export function createEmptyVehicleDraft(): VehicleDraft {
  return {
    make: "",
    model: "",
    year: "",
    ownershipType: "owned",
    ownershipStartedYear: "",
    ownershipStartedMonth: "",
    engine: "",
    steering: "",
    transmission: "",
    odometer: "",
    odometerUnit: "km",
  };
}

export function validateVehicleDraft(
  draft: VehicleDraft,
  currentYear = new Date().getUTCFullYear(),
): VehicleDraftValidationResult {
  const errors: VehicleDraftValidationResult["errors"] = {};
  const year = draft.year ? Number(draft.year) : undefined;
  const ownershipStartedYear = draft.ownershipStartedYear
    ? Number(draft.ownershipStartedYear)
    : undefined;
  const ownershipStartedMonth = draft.ownershipStartedMonth
    ? Number(draft.ownershipStartedMonth)
    : undefined;
  const odometer = draft.odometer ? Number(draft.odometer) : undefined;

  if (!draft.make.trim()) errors.make = "required";
  if (!draft.model.trim()) errors.model = "required";
  if (year !== undefined && (!Number.isInteger(year) || year < 1886 || year > currentYear + 2)) {
    errors.year = "invalid";
  }
  if (
    ownershipStartedYear !== undefined &&
    (!Number.isInteger(ownershipStartedYear) ||
      ownershipStartedYear < 1886 ||
      ownershipStartedYear > currentYear)
  ) {
    errors.ownershipStartedYear = "invalid";
  }
  if (
    ownershipStartedMonth !== undefined &&
    (!Number.isInteger(ownershipStartedMonth) || ownershipStartedMonth < 1 || ownershipStartedMonth > 12)
  ) {
    errors.ownershipStartedMonth = "invalid";
  }
  if (ownershipStartedMonth !== undefined && ownershipStartedYear === undefined) {
    errors.ownershipStartedYear = "required";
  }
  if (odometer !== undefined && (!Number.isFinite(odometer) || odometer < 0)) {
    errors.odometer = "invalid";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function addVehicleToData(
  data: AppData,
  draft: VehicleDraft,
  now = new Date().toISOString(),
): { data: AppData; vehicle: Vehicle } {
  const validation = validateVehicleDraft(draft, new Date(now).getUTCFullYear());
  if (!validation.valid) throw new Error("invalid_vehicle_draft");

  const odometer = draft.odometer ? Number(draft.odometer) : 0;
  const episodeId = `episode-${crypto.randomUUID()}`;
  const vehicle: Vehicle = {
    id: `vehicle-${crypto.randomUUID()}`,
    ownerProfileId: data.currentProfileId,
    make: draft.make.trim(),
    model: draft.model.trim(),
    year: draft.year ? Number(draft.year) : undefined,
    ownershipType: draft.ownershipType,
    ownershipStartedYear: draft.ownershipStartedYear
      ? Number(draft.ownershipStartedYear)
      : undefined,
    ownershipStartedMonth: draft.ownershipStartedMonth
      ? Number(draft.ownershipStartedMonth)
      : undefined,
    engine: draft.engine.trim(),
    steering: draft.steering.trim(),
    transmission: draft.transmission.trim(),
    odometerKm: odometer,
    odometerEpisodes: [{ id: episodeId, reason: "initial", startedAt: now.slice(0, 10) }],
    currentOdometerReading: {
      episodeId,
      displayedValue: odometer,
      unit: draft.odometerUnit,
      sequenceAssessment: "consistent_increase",
    },
    isDemo: false,
  };

  return {
    vehicle,
    data: { ...data, vehicles: [vehicle, ...data.vehicles] },
  };
}
