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
  const hasOpenEndedOwnership = vehicle.ownershipType === "owned";
  const canCalculateOwnership = hasOpenEndedOwnership || vehicle.ownershipEndedYear !== undefined;
  const ownership = canCalculateOwnership
    ? calculateElapsedMonths(
        vehicle.ownershipStartedYear,
        vehicle.ownershipStartedMonth,
        vehicle.ownershipEndedYear ?? asOf.getUTCFullYear(),
        vehicle.ownershipEndedMonth ?? (hasOpenEndedOwnership ? asOf.getUTCMonth() + 1 : 1),
      )
    : undefined;

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

export function formatOwnershipPeriod(vehicle: Vehicle, locale: Locale): string {
  if (vehicle.ownershipPeriodNote?.trim()) return vehicle.ownershipPeriodNote.trim();
  const start = formatPartialDate(
    vehicle.ownershipStartedYear,
    vehicle.ownershipStartedMonth,
    locale,
  );
  const end = formatPartialDate(
    vehicle.ownershipEndedYear,
    vehicle.ownershipEndedMonth,
    locale,
  );
  if (vehicle.ownershipType === "owned") {
    if (!start) return locale === "ja" ? "所有開始時期は未登録" : "Ownership start not set";
    return locale === "ja" ? `${start}から所有中` : `Owned since ${start}`;
  }
  if (vehicle.ownershipType === "previously_owned") {
    if (start && end) return locale === "ja" ? `${start}〜${end}に所有` : `Owned ${start}–${end}`;
    if (start) return locale === "ja" ? `${start}ごろから所有` : `Owned from around ${start}`;
    if (end) return locale === "ja" ? `${end}ごろまで所有` : `Owned until around ${end}`;
    return locale === "ja" ? "所有時期不明" : "Ownership period unknown";
  }
  return locale === "ja" ? "所有状態未設定" : "Ownership status not set";
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

function formatPartialDate(
  year: number | undefined,
  month: number | undefined,
  locale: Locale,
): string | undefined {
  if (year === undefined) return undefined;
  if (locale === "ja") return month ? `${year}年${month}月` : `${year}年`;
  if (!month) return String(year);
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, 1)));
}
