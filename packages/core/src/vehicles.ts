import type {
  AppData,
  OccurrencePrecision,
  Vehicle,
  VehicleDraft,
  VehicleRelationshipType,
} from "./types.ts";
import {
  resolveVehicleIdentity,
  resolveVehicleSpecification,
  type VehicleIdentityCandidate,
  type VehicleSpecificationCandidate,
} from "./vehicle-catalog.ts";

export interface VehicleDraftValidationResult {
  valid: boolean;
  errors: Partial<Record<keyof VehicleDraft, "required" | "invalid">>;
}

export interface VehicleCatalogResolutionOverride {
  identity?: VehicleIdentityCandidate;
  specification?: VehicleSpecificationCandidate;
}

export function createEmptyVehicleDraft(): VehicleDraft {
  return {
    imagePath: "",
    vehicleCategory: "car",
    make: "",
    model: "",
    year: "",
    grade: "",
    modelCode: "",
    specificationNote: "",
    nickname: "",
    ownershipType: "owned",
    ownershipStartedYear: "",
    ownershipStartedMonth: "",
    ownershipStartedDay: "",
    ownershipStartedPrecision: "unknown",
    ownershipEndedYear: "",
    ownershipEndedMonth: "",
    ownershipPeriodNote: "",
    primaryUse: "",
    dispositionReason: "",
    engine: "",
    engineCode: "",
    displacementCc: "",
    aspiration: "unknown",
    drivetrain: "unknown",
    steering: "",
    transmission: "",
    transmissionCode: "",
    odometer: "",
    odometerUnit: "km",
    odometerContext: "current",
    ownerComment: "",
    memberDiscoveryEnabled: true,
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
  const ownershipStartedDay = draft.ownershipStartedDay
    ? Number(draft.ownershipStartedDay)
    : undefined;
  const ownershipEndedYear = draft.ownershipEndedYear
    ? Number(draft.ownershipEndedYear)
    : undefined;
  const ownershipEndedMonth = draft.ownershipEndedMonth
    ? Number(draft.ownershipEndedMonth)
    : undefined;
  const odometer = draft.odometer ? Number(draft.odometer) : undefined;
  const displacementCc = draft.displacementCc ? Number(draft.displacementCc) : undefined;

  if (!draft.make.trim()) errors.make = "required";
  if (!draft.model.trim()) errors.model = "required";
  if (!(["car", "motorcycle", "moped", "other"] as const).includes(draft.vehicleCategory)) {
    errors.vehicleCategory = "invalid";
  }
  if (!(["owned", "previously_owned", "unknown", "family", "shared"] as const).includes(draft.ownershipType)) {
    errors.ownershipType = "invalid";
  }
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
  if (
    ownershipStartedDay !== undefined &&
    (!Number.isInteger(ownershipStartedDay) || ownershipStartedDay < 1 || ownershipStartedDay > 31)
  ) {
    errors.ownershipStartedDay = "invalid";
  }
  if (ownershipStartedDay !== undefined && ownershipStartedMonth === undefined) {
    errors.ownershipStartedMonth = "required";
  }
  if (
    ownershipStartedYear !== undefined &&
    ownershipStartedMonth !== undefined &&
    ownershipStartedDay !== undefined &&
    !isValidCalendarDate(ownershipStartedYear, ownershipStartedMonth, ownershipStartedDay)
  ) {
    errors.ownershipStartedDay = "invalid";
  }
  if (
    draft.ownershipStartedPrecision === "day" &&
    (ownershipStartedYear === undefined || ownershipStartedMonth === undefined || ownershipStartedDay === undefined)
  ) {
    errors.ownershipStartedDay = "required";
  }
  if (draft.ownershipStartedPrecision === "month" && ownershipStartedMonth === undefined) {
    errors.ownershipStartedMonth = "required";
  }
  if (draft.ownershipStartedPrecision === "year" && ownershipStartedYear === undefined) {
    errors.ownershipStartedYear = "required";
  }
  if (
    ownershipEndedYear !== undefined &&
    (!Number.isInteger(ownershipEndedYear) ||
      ownershipEndedYear < 1886 ||
      ownershipEndedYear > currentYear)
  ) {
    errors.ownershipEndedYear = "invalid";
  }
  if (
    ownershipEndedMonth !== undefined &&
    (!Number.isInteger(ownershipEndedMonth) || ownershipEndedMonth < 1 || ownershipEndedMonth > 12)
  ) {
    errors.ownershipEndedMonth = "invalid";
  }
  if (ownershipEndedMonth !== undefined && ownershipEndedYear === undefined) {
    errors.ownershipEndedYear = "required";
  }
  if (
    ownershipStartedYear !== undefined &&
    ownershipEndedYear !== undefined &&
    (ownershipEndedYear < ownershipStartedYear ||
      (ownershipEndedYear === ownershipStartedYear &&
        ownershipStartedMonth !== undefined &&
        ownershipEndedMonth !== undefined &&
        ownershipEndedMonth < ownershipStartedMonth))
  ) {
    errors.ownershipEndedYear = "invalid";
  }
  if (odometer !== undefined && (!Number.isFinite(odometer) || odometer < 0)) {
    errors.odometer = "invalid";
  }
  if (
    displacementCc !== undefined &&
    (!Number.isInteger(displacementCc) || displacementCc < 1 || displacementCc > 30000)
  ) {
    errors.displacementCc = "invalid";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function addVehicleToData(
  data: AppData,
  draft: VehicleDraft,
  catalogResolutionOrNow: VehicleCatalogResolutionOverride | string = {},
  nowInput = new Date().toISOString(),
): { data: AppData; vehicle: Vehicle } {
  const catalogResolution = typeof catalogResolutionOrNow === "string"
    ? {}
    : catalogResolutionOrNow;
  const now = typeof catalogResolutionOrNow === "string"
    ? catalogResolutionOrNow
    : nowInput;
  const validation = validateVehicleDraft(draft, new Date(now).getUTCFullYear());
  if (!validation.valid) throw new Error("invalid_vehicle_draft");

  const odometer = draft.odometer ? Number(draft.odometer) : 0;
  const episodeId = `episode-${crypto.randomUUID()}`;
  const identity = catalogResolution.identity
    ?? resolveVehicleIdentity(draft.make, draft.model);
  const specification = catalogResolution.specification
    ?? resolveVehicleSpecification(identity.modelFamilyId, {
      ...draft,
      generationId: identity.generationId,
      modelName: draft.model,
    });
  const vehicle: Vehicle = {
    id: `vehicle-${crypto.randomUUID()}`,
    ownerProfileId: data.currentProfileId,
    vehicleCategory: draft.vehicleCategory,
    make: identity.canonicalMake,
    model: draft.model.trim(),
    makeInput: identity.makeInput,
    modelInput: identity.modelInput,
    brandId: identity.brandId,
    modelFamilyId: identity.modelFamilyId,
    generationId: specification.generationId ?? identity.generationId,
    variantId: specification.variantId,
    configurationId: specification.configurationId,
    marketNameId: identity.marketNameId,
    marketRegion: identity.marketRegion,
    identityMatchStatus: identity.matchStatus,
    specificationMatchStatus: specification.matchStatus,
    year: draft.year ? Number(draft.year) : undefined,
    grade: draft.grade.trim() || undefined,
    modelCode: draft.modelCode.trim() || undefined,
    specificationNote: draft.specificationNote.trim() || undefined,
    nickname: draft.nickname.trim() || undefined,
    ownershipType: draft.ownershipType,
    ownershipStartedYear: draft.ownershipStartedYear
      ? Number(draft.ownershipStartedYear)
      : undefined,
    ownershipStartedMonth: draft.ownershipStartedMonth
      ? Number(draft.ownershipStartedMonth)
      : undefined,
    ownershipStartedDay: draft.ownershipStartedDay
      ? Number(draft.ownershipStartedDay)
      : undefined,
    ownershipStartedPrecision: resolveOwnershipStartPrecision(draft),
    ownershipEndedYear: draft.ownershipEndedYear
      ? Number(draft.ownershipEndedYear)
      : undefined,
    ownershipEndedMonth: draft.ownershipEndedMonth
      ? Number(draft.ownershipEndedMonth)
      : undefined,
    ownershipPeriodNote: draft.ownershipPeriodNote.trim() || undefined,
    primaryUse: draft.primaryUse.trim() || undefined,
    dispositionReason: draft.dispositionReason.trim() || undefined,
    engine: draft.engine.trim(),
    engineCode: draft.engineCode.trim() || undefined,
    displacementCc: draft.displacementCc ? Number(draft.displacementCc) : undefined,
    aspiration: draft.aspiration,
    drivetrain: draft.drivetrain,
    steering: draft.steering.trim(),
    transmission: draft.transmission.trim(),
    transmissionCode: draft.transmissionCode.trim() || undefined,
    odometerKm: odometer,
    odometerEpisodes: [{ id: episodeId, reason: "initial", startedAt: now.slice(0, 10) }],
    currentOdometerReading: {
      episodeId,
      displayedValue: odometer,
      unit: draft.odometerUnit,
      sequenceAssessment: "consistent_increase",
    },
    odometerContext: draft.odometerContext,
    imagePath: draft.imagePath || undefined,
    ownerComment: draft.ownerComment.trim() || undefined,
    memberDiscoveryEnabled: draft.memberDiscoveryEnabled,
    isDemo: false,
  };

  return {
    vehicle,
    data: { ...data, vehicles: [vehicle, ...data.vehicles] },
  };
}

export interface VehicleSpecificationUpdate {
  vehicleCategory: Vehicle["vehicleCategory"];
  make: string;
  model: string;
  year?: number;
  grade?: string;
  modelCode?: string;
  specificationNote?: string;
  engine?: string;
  engineCode?: string;
  displacementCc?: number;
  aspiration?: Vehicle["aspiration"];
  drivetrain?: Vehicle["drivetrain"];
  steering?: string;
  transmission?: string;
  transmissionCode?: string;
  nickname?: string;
  imagePath?: string;
  ownerComment?: string;
  memberDiscoveryEnabled?: boolean;
  ownershipStartedYear?: number;
  ownershipStartedMonth?: number;
  ownershipStartedDay?: number;
  ownershipStartedPrecision?: OccurrencePrecision;
}

export function updateVehicleSpecificationInData(
  data: AppData,
  vehicleId: string,
  update: VehicleSpecificationUpdate,
): { data: AppData; vehicle: Vehicle } {
  const vehicle = data.vehicles.find((item) => item.id === vehicleId);
  if (!vehicle) throw new Error("vehicle_not_found");
  if (vehicle.ownerProfileId !== data.currentProfileId) {
    throw new Error("vehicle_not_owned_by_current_profile");
  }
  if (!update.make.trim() || !update.model.trim()) throw new Error("invalid_vehicle_specification");
  const currentYear = new Date().getUTCFullYear();
  if (
    update.year !== undefined &&
    (!Number.isInteger(update.year) || update.year < 1886 || update.year > currentYear + 2)
  ) {
    throw new Error("invalid_vehicle_specification");
  }
  validateOwnershipStart(update);
  if (
    update.displacementCc !== undefined &&
    (!Number.isInteger(update.displacementCc) || update.displacementCc < 1 || update.displacementCc > 30000)
  ) {
    throw new Error("invalid_vehicle_specification");
  }

  const identity = resolveVehicleIdentity(update.make, update.model);
  const specification = resolveVehicleSpecification(identity.modelFamilyId, {
    ...update,
    generationId: identity.generationId,
    modelName: update.model,
  });
  const nextVehicle: Vehicle = {
    ...vehicle,
    vehicleCategory: update.vehicleCategory,
    make: identity.canonicalMake,
    model: update.model.trim(),
    makeInput: identity.makeInput,
    modelInput: identity.modelInput,
    brandId: identity.brandId,
    modelFamilyId: identity.modelFamilyId,
    generationId: specification.generationId,
    variantId: specification.variantId,
    configurationId: specification.configurationId,
    marketNameId: identity.marketNameId,
    marketRegion: identity.marketRegion,
    identityMatchStatus: identity.matchStatus,
    specificationMatchStatus: specification.matchStatus,
    year: update.year,
    grade: update.grade?.trim() || undefined,
    modelCode: update.modelCode?.trim() || undefined,
    specificationNote: update.specificationNote?.trim() || undefined,
    engine: update.engine?.trim() ?? "",
    engineCode: update.engineCode?.trim() || undefined,
    displacementCc: update.displacementCc,
    aspiration: update.aspiration ?? "unknown",
    drivetrain: update.drivetrain ?? "unknown",
    steering: update.steering?.trim() ?? "",
    transmission: update.transmission?.trim() ?? "",
    transmissionCode: update.transmissionCode?.trim() || undefined,
    nickname: update.nickname === undefined ? vehicle.nickname : update.nickname.trim() || undefined,
    imagePath: update.imagePath === undefined ? vehicle.imagePath : update.imagePath || undefined,
    ownerComment: update.ownerComment === undefined ? vehicle.ownerComment : update.ownerComment.trim() || undefined,
    memberDiscoveryEnabled: update.memberDiscoveryEnabled ?? vehicle.memberDiscoveryEnabled,
    ownershipStartedYear: update.ownershipStartedPrecision === undefined ? vehicle.ownershipStartedYear : update.ownershipStartedYear,
    ownershipStartedMonth: update.ownershipStartedPrecision === undefined ? vehicle.ownershipStartedMonth : update.ownershipStartedMonth,
    ownershipStartedDay: update.ownershipStartedPrecision === undefined ? vehicle.ownershipStartedDay : update.ownershipStartedDay,
    ownershipStartedPrecision: update.ownershipStartedPrecision ?? vehicle.ownershipStartedPrecision,
  };

  return {
    vehicle: nextVehicle,
    data: {
      ...data,
      vehicles: data.vehicles.map((item) => item.id === vehicleId ? nextVehicle : item),
    },
  };
}

export interface VehicleOwnershipUpdate {
  ownershipType: Extract<VehicleRelationshipType, "owned" | "previously_owned" | "unknown">;
  ownershipEndedYear?: number;
  ownershipEndedMonth?: number;
  ownershipPeriodNote?: string;
  dispositionReason?: string;
}

export function updateVehicleOwnershipInData(
  data: AppData,
  vehicleId: string,
  update: VehicleOwnershipUpdate,
): { data: AppData; vehicle: Vehicle } {
  const vehicle = data.vehicles.find((item) => item.id === vehicleId);
  if (!vehicle) throw new Error("vehicle_not_found");
  if (vehicle.ownerProfileId !== data.currentProfileId) {
    throw new Error("vehicle_not_owned_by_current_profile");
  }
  validateOwnershipUpdate(vehicle, update);

  const vehicleUpdate = update.ownershipType === "owned"
    ? {
        ownershipType: "owned" as const,
        ownershipEndedYear: undefined,
        ownershipEndedMonth: undefined,
        dispositionReason: undefined,
        odometerContext: "current" as const,
      }
    : {
        ownershipType: update.ownershipType,
        ownershipEndedYear: update.ownershipEndedYear,
        ownershipEndedMonth: update.ownershipEndedMonth,
        dispositionReason: update.dispositionReason?.trim() || undefined,
        odometerContext:
          update.ownershipType === "previously_owned"
            ? "at_ownership_end" as const
            : "unknown" as const,
      };
  const nextVehicle: Vehicle = {
    ...vehicle,
    ...vehicleUpdate,
    ownershipPeriodNote:
      update.ownershipType === "owned"
        ? undefined
        : update.ownershipPeriodNote?.trim() || vehicle.ownershipPeriodNote,
  };

  return {
    vehicle: nextVehicle,
    data: {
      ...data,
      schemaVersion: 14,
      vehicles: data.vehicles.map((item) => item.id === vehicleId ? nextVehicle : item),
    },
  };
}

export function groupVehiclesByOwnership(vehicles: Vehicle[]): {
  current: Vehicle[];
  previous: Vehicle[];
  other: Vehicle[];
} {
  return {
    current: vehicles.filter((vehicle) => vehicle.ownershipType === "owned"),
    previous: vehicles.filter((vehicle) => vehicle.ownershipType === "previously_owned"),
    other: vehicles.filter(
      (vehicle) => vehicle.ownershipType !== "owned" && vehicle.ownershipType !== "previously_owned",
    ),
  };
}

export function getPreferredVehicle(vehicles: Vehicle[]): Vehicle | undefined {
  const grouped = groupVehiclesByOwnership(vehicles);
  return grouped.current[0] ?? grouped.previous[0] ?? grouped.other[0];
}

function validateOwnershipUpdate(vehicle: Vehicle, update: VehicleOwnershipUpdate): void {
  const nowYear = new Date().getUTCFullYear();
  const endYear = update.ownershipEndedYear;
  const endMonth = update.ownershipEndedMonth;
  if (endYear !== undefined && (!Number.isInteger(endYear) || endYear < 1886 || endYear > nowYear)) {
    throw new Error("invalid_ownership_end");
  }
  if (endMonth !== undefined && (!Number.isInteger(endMonth) || endMonth < 1 || endMonth > 12)) {
    throw new Error("invalid_ownership_end");
  }
  if (endMonth !== undefined && endYear === undefined) throw new Error("invalid_ownership_end");
  if (
    vehicle.ownershipStartedYear !== undefined &&
    endYear !== undefined &&
    (endYear < vehicle.ownershipStartedYear ||
      (endYear === vehicle.ownershipStartedYear &&
        vehicle.ownershipStartedMonth !== undefined &&
        endMonth !== undefined &&
        endMonth < vehicle.ownershipStartedMonth))
  ) {
    throw new Error("invalid_ownership_end");
  }
}

function resolveOwnershipStartPrecision(
  draft: Pick<VehicleDraft, "ownershipStartedYear" | "ownershipStartedMonth" | "ownershipStartedDay" | "ownershipStartedPrecision">,
): OccurrencePrecision {
  if (!draft.ownershipStartedYear) return "unknown";
  if (draft.ownershipStartedPrecision !== "unknown") return draft.ownershipStartedPrecision;
  if (draft.ownershipStartedDay) return "day";
  if (draft.ownershipStartedMonth) return "month";
  return "year";
}

function validateOwnershipStart(update: Pick<
  VehicleSpecificationUpdate,
  "ownershipStartedYear" | "ownershipStartedMonth" | "ownershipStartedDay" | "ownershipStartedPrecision"
>): void {
  const { ownershipStartedYear: year, ownershipStartedMonth: month, ownershipStartedDay: day, ownershipStartedPrecision: precision } = update;
  if (precision === undefined && year === undefined && month === undefined && day === undefined) return;
  const currentYear = new Date().getUTCFullYear();
  if (year !== undefined && (!Number.isInteger(year) || year < 1886 || year > currentYear)) {
    throw new Error("invalid_vehicle_specification");
  }
  if (month !== undefined && (!Number.isInteger(month) || month < 1 || month > 12)) {
    throw new Error("invalid_vehicle_specification");
  }
  if (day !== undefined && (!Number.isInteger(day) || day < 1 || day > 31)) {
    throw new Error("invalid_vehicle_specification");
  }
  if (month !== undefined && year === undefined) throw new Error("invalid_vehicle_specification");
  if (day !== undefined && month === undefined) throw new Error("invalid_vehicle_specification");
  if (year !== undefined && month !== undefined && day !== undefined && !isValidCalendarDate(year, month, day)) {
    throw new Error("invalid_vehicle_specification");
  }
  if (precision === "year" && year === undefined) throw new Error("invalid_vehicle_specification");
  if (precision === "month" && (year === undefined || month === undefined)) throw new Error("invalid_vehicle_specification");
  if (precision === "day" && (year === undefined || month === undefined || day === undefined)) {
    throw new Error("invalid_vehicle_specification");
  }
}

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
