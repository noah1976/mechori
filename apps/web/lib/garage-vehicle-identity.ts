import {
  displayVehicleModel,
  formatOwnershipDuration,
  summarizeVehicleRelationship,
  type Locale,
  type Vehicle,
} from "@mechori/core";

export type GarageVehicleIdentityFact = {
  key: "vehicle-age" | "ownership" | "odometer";
  label: string;
  value: string;
};

export type GarageVehicleIdentity = {
  make: string;
  model: string;
  grade?: string;
  modelCode?: string;
  year?: string;
  nickname?: string;
  facts: GarageVehicleIdentityFact[];
};

/**
 * Keeps the Garage's vehicle profile factual while preserving free entry for
 * vehicles that do not have a complete catalog specification.
 */
export function buildGarageVehicleIdentity(
  vehicle: Vehicle,
  locale: Locale,
  asOf?: Date,
): GarageVehicleIdentity {
  const ja = locale === "ja";
  const relationship = summarizeVehicleRelationship(vehicle, asOf);
  const ownershipDuration = formatOwnershipDuration(locale, relationship);
  const facts: GarageVehicleIdentityFact[] = [];

  if (relationship.vehicleAgeYears !== undefined) {
    facts.push({
      key: "vehicle-age",
      label: ja ? "車齢" : "Vehicle age",
      value: ja ? `${relationship.vehicleAgeYears}年` : `${relationship.vehicleAgeYears} years`,
    });
  }
  if (ownershipDuration) {
    facts.push({
      key: "ownership",
      label: ja ? "所有" : "Owned",
      value: ownershipDuration,
    });
  }
  if (vehicle.currentOdometerReading.displayedValue > 0) {
    facts.push({
      key: "odometer",
      label: ja ? "走行距離" : "Odometer",
      value: `${vehicle.currentOdometerReading.displayedValue.toLocaleString()} ${vehicle.currentOdometerReading.unit}`,
    });
  }

  return {
    make: vehicle.make,
    model: displayVehicleModel(vehicle, locale),
    grade: vehicle.grade?.trim() || undefined,
    modelCode: vehicle.modelCode?.trim() || undefined,
    year: vehicle.year === undefined ? undefined : (ja ? `${vehicle.year}年` : String(vehicle.year)),
    nickname: vehicle.nickname?.trim() || undefined,
    facts,
  };
}
