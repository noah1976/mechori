import type {
  AppData,
  VehiclePassport,
  VehiclePassportDraft,
} from "./types.ts";

const MAX_PASSPORT_TEXT_LENGTH = 2000;

export function createVehiclePassportDraft(
  vehicleId: string,
  passport?: VehiclePassport,
): VehiclePassportDraft {
  return {
    vehicleId,
    odometerValue: passport?.odometerValue === undefined ? "" : String(passport.odometerValue),
    odometerUnit: passport?.odometerUnit ?? "km",
    modifications: passport?.modifications ?? "",
    recentMaintenance: passport?.recentMaintenance ?? "",
    workshopConcerns: passport?.workshopConcerns ?? "",
    otherNotes: passport?.otherNotes ?? "",
  };
}

export function upsertVehiclePassportInData(
  data: AppData,
  draft: VehiclePassportDraft,
  now = new Date().toISOString(),
): { data: AppData; passport: VehiclePassport } {
  if (!data.vehicles.some((vehicle) => vehicle.id === draft.vehicleId)) {
    throw new Error("passport_vehicle_not_found");
  }
  const passports = data.vehiclePassports ?? [];
  const existing = passports.find((item) => item.vehicleId === draft.vehicleId);
  const parsedOdometer = draft.odometerValue.trim() === ""
    ? undefined
    : Number(draft.odometerValue);
  if (parsedOdometer !== undefined && (!Number.isFinite(parsedOdometer) || parsedOdometer < 0)) {
    throw new Error("passport_odometer_invalid");
  }
  const passport: VehiclePassport = {
    vehicleId: draft.vehicleId,
    ...(parsedOdometer === undefined ? {} : { odometerValue: parsedOdometer }),
    odometerUnit: draft.odometerUnit,
    ...optionalText("modifications", draft.modifications),
    ...optionalText("recentMaintenance", draft.recentMaintenance),
    ...optionalText("workshopConcerns", draft.workshopConcerns),
    ...optionalText("otherNotes", draft.otherNotes),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    completedAt: existing?.completedAt ?? now,
    ...(existing?.shareToken ? { shareToken: existing.shareToken } : {}),
    ...(existing?.sharedAt ? { sharedAt: existing.sharedAt } : {}),
  };
  return {
    passport,
    data: {
      ...data,
      schemaVersion: 15,
      vehiclePassports: existing
        ? passports.map((item) => item.vehicleId === passport.vehicleId ? passport : item)
        : [...passports, passport],
    },
  };
}

export function setVehiclePassportShareInData(
  data: AppData,
  vehicleId: string,
  shareToken?: string,
  now = new Date().toISOString(),
): AppData {
  const passports = data.vehiclePassports ?? [];
  const passport = passports.find((item) => item.vehicleId === vehicleId);
  if (!passport) throw new Error("passport_not_found");
  const nextPassport: VehiclePassport = {
    ...passport,
    updatedAt: now,
    ...(shareToken ? { shareToken, sharedAt: now } : {}),
  };
  if (!shareToken) {
    delete nextPassport.shareToken;
    delete nextPassport.sharedAt;
  }
  return {
    ...data,
    schemaVersion: 15,
    vehiclePassports: passports.map((item) =>
      item.vehicleId === vehicleId ? nextPassport : item),
  };
}

function optionalText<K extends keyof VehiclePassport>(
  key: K,
  value: string,
): Partial<VehiclePassport> {
  const normalized = value.normalize("NFKC").trim();
  if (!normalized) return {};
  if (normalized.length > MAX_PASSPORT_TEXT_LENGTH) {
    throw new Error("passport_text_too_long");
  }
  return { [key]: normalized } as Partial<VehiclePassport>;
}
