import type { Locale, Vehicle } from "./types.ts";

export interface VehicleRelationshipSnapshot {
  vehicleAgeYears?: number;
  vehicleAgeIsApproximate: true;
  ownershipYears?: number;
  ownershipMonths?: number;
  ownershipIsApproximate: boolean;
  ownershipMilestoneYears?: number;
}

export function summarizeVehicleRelationship(
  vehicle: Vehicle,
  asOf = new Date(),
): VehicleRelationshipSnapshot {
  const vehicleAgeYears = vehicle.year === undefined
    ? undefined
    : Math.max(0, asOf.getUTCFullYear() - vehicle.year);
  const ownership = calculateElapsedMonths(
    vehicle.ownershipStartedYear,
    vehicle.ownershipStartedMonth,
    vehicle.ownershipEndedYear ?? asOf.getUTCFullYear(),
    vehicle.ownershipEndedMonth ?? asOf.getUTCMonth() + 1,
  );

  const ownershipYears = ownership === undefined ? undefined : Math.floor(ownership / 12);
  return {
    vehicleAgeYears,
    vehicleAgeIsApproximate: true,
    ownershipYears,
    ownershipMonths: ownership === undefined ? undefined : ownership % 12,
    ownershipIsApproximate:
      vehicle.ownershipStartedYear !== undefined &&
      vehicle.ownershipStartedMonth === undefined,
    ownershipMilestoneYears: ownershipYears === undefined
      ? undefined
      : [30, 25, 20, 15, 10, 5, 1].find((years) => ownershipYears >= years),
  };
}

export function formatOwnershipDuration(
  locale: Locale,
  snapshot: VehicleRelationshipSnapshot,
): string | undefined {
  if (snapshot.ownershipYears === undefined) return undefined;
  const approximate = snapshot.ownershipIsApproximate
    ? locale === "ja" ? "約" : "About "
    : "";
  if (locale === "ja") {
    return `${approximate}${snapshot.ownershipYears}年${snapshot.ownershipMonths ? `${snapshot.ownershipMonths}か月` : ""}`;
  }
  const years = `${snapshot.ownershipYears} ${snapshot.ownershipYears === 1 ? "year" : "years"}`;
  const months = snapshot.ownershipMonths
    ? ` ${snapshot.ownershipMonths} ${snapshot.ownershipMonths === 1 ? "month" : "months"}`
    : "";
  return `${approximate}${years}${months}`;
}

function calculateElapsedMonths(
  startYear: number | undefined,
  startMonth: number | undefined,
  endYear: number,
  endMonth: number,
): number | undefined {
  if (startYear === undefined) return undefined;
  const normalizedStartMonth = startMonth && startMonth >= 1 && startMonth <= 12
    ? startMonth
    : 1;
  const normalizedEndMonth = endMonth >= 1 && endMonth <= 12 ? endMonth : 1;
  return Math.max(
    0,
    (endYear - startYear) * 12 + normalizedEndMonth - normalizedStartMonth,
  );
}
