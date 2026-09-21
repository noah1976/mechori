import type {
  MaintenanceOccurrencePrecision,
  MaintenanceRecord,
  PrototypeOdometerUnit,
  ResolutionStatus,
  Vehicle,
  VehiclePassport,
} from "@mechori/core";

export const PASSPORT_HISTORY_RECORD_LIMIT = 500;
export const PASSPORT_HISTORY_ACTION_LIMIT = 50;

export interface PassportHistoryItemProjection {
  subject: string;
  observedCondition?: string;
  workPerformed?: string;
  parts: string[];
  result?: string;
  followUpNote?: string;
}

export interface PassportHistoryEntryProjection {
  serviceDate?: string;
  serviceDatePrecision: MaintenanceOccurrencePrecision;
  odometerValue?: number;
  odometerUnit?: PrototypeOdometerUnit;
  summary: string;
  resolutionStatus?: ResolutionStatus;
  items: PassportHistoryItemProjection[];
}

export interface PassportShareProjection {
  make: string;
  model: string;
  nickname?: string;
  modelYear?: number;
  grade?: string;
  modelCode?: string;
  specificationNote?: string;
  odometerValue?: number;
  odometerUnit: VehiclePassport["odometerUnit"];
  modifications?: string;
  recentMaintenance?: string;
  workshopConcerns?: string;
  otherNotes?: string;
  updatedAt: string;
  projectionVersion: 1 | 2;
  maintenanceHistory?: PassportHistoryEntryProjection[];
}

export function buildPassportShareProjection(
  vehicle: Vehicle,
  passport: VehiclePassport,
  records: readonly MaintenanceRecord[] = [],
  includeHistory = false,
): PassportShareProjection {
  if (passport.vehicleId !== vehicle.id) throw new Error("passport_vehicle_mismatch");
  const maintenanceHistory = includeHistory
    ? buildPassportMaintenanceHistoryProjection(records, vehicle.id)
    : undefined;
  return {
    make: vehicle.make,
    model: vehicle.model,
    ...(vehicle.nickname ? { nickname: vehicle.nickname } : {}),
    ...(vehicle.year ? { modelYear: vehicle.year } : {}),
    ...(vehicle.grade ? { grade: vehicle.grade } : {}),
    ...(vehicle.modelCode ? { modelCode: vehicle.modelCode } : {}),
    ...(vehicle.specificationNote ? { specificationNote: vehicle.specificationNote } : {}),
    ...(passport.odometerValue === undefined ? {} : { odometerValue: passport.odometerValue }),
    odometerUnit: passport.odometerUnit,
    ...(passport.modifications ? { modifications: passport.modifications } : {}),
    ...(passport.recentMaintenance ? { recentMaintenance: passport.recentMaintenance } : {}),
    ...(passport.workshopConcerns ? { workshopConcerns: passport.workshopConcerns } : {}),
    ...(passport.otherNotes ? { otherNotes: passport.otherNotes } : {}),
    updatedAt: passport.updatedAt,
    projectionVersion: includeHistory ? 2 : 1,
    ...(maintenanceHistory ? { maintenanceHistory } : {}),
  };
}

export function buildPassportMaintenanceHistoryProjection(
  records: readonly MaintenanceRecord[],
  vehicleId: string,
): PassportHistoryEntryProjection[] {
  const matching = records.filter((record) => record.vehicleId === vehicleId);
  if (matching.length > PASSPORT_HISTORY_RECORD_LIMIT) {
    throw new Error("passport_history_record_limit_exceeded");
  }

  return matching
    .map((record, index) => ({ projection: projectMaintenanceRecord(record), index }))
    .sort((left, right) => {
      const leftDate = left.projection.serviceDate ?? "";
      const rightDate = right.projection.serviceDate ?? "";
      if (leftDate && !rightDate) return -1;
      if (!leftDate && rightDate) return 1;
      return rightDate.localeCompare(leftDate) || left.index - right.index;
    })
    .map(({ projection }) => projection);
}

export function passportHistoryDateLabel(entry: PassportHistoryEntryProjection): string {
  const value = entry.serviceDate ?? "";
  if (entry.serviceDatePrecision === "day" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return `${year}年${month}月${day}日`;
  }
  if (entry.serviceDatePrecision === "month" && /^\d{4}-\d{2}$/.test(value)) {
    const [year, month] = value.split("-").map(Number);
    return `${year}年${month}月ごろ`;
  }
  if (entry.serviceDatePrecision === "year" && /^\d{4}$/.test(value)) {
    return `${value}年ごろ`;
  }
  return "時期不明";
}

function projectMaintenanceRecord(record: MaintenanceRecord): PassportHistoryEntryProjection {
  const sourceActions = record.actions.length > 0
    ? record.actions
    : [{
        summary: record.summary,
        checksPerformed: record.checksPerformed || record.symptoms,
        workPerformed: record.workPerformed,
        parts: record.parts,
        result: record.result,
        followUpNote: undefined,
      }];
  if (sourceActions.length > PASSPORT_HISTORY_ACTION_LIMIT) {
    throw new Error("passport_history_action_limit_exceeded");
  }

  const odometerValue = record.odometerReading?.displayedValue ?? record.odometerKm;
  const odometerUnit = record.odometerReading?.unit ?? (record.odometerKm === undefined ? undefined : "km");
  return {
    ...(record.serviceDate ? { serviceDate: record.serviceDate } : {}),
    serviceDatePrecision: record.serviceDate ? record.serviceDatePrecision : "unknown",
    ...(odometerValue === undefined ? {} : { odometerValue }),
    ...(odometerUnit ? { odometerUnit } : {}),
    summary: record.summary,
    resolutionStatus: record.resolutionStatus,
    items: sourceActions.map((action) => ({
      subject: action.summary || record.summary,
      ...(action.checksPerformed ? { observedCondition: action.checksPerformed } : {}),
      ...(action.workPerformed ? { workPerformed: action.workPerformed } : {}),
      parts: action.parts.map(formatPart).filter(Boolean),
      ...(action.result ? { result: action.result } : {}),
      ...(action.followUpNote ? { followUpNote: action.followUpNote } : {}),
    })),
  };
}

function formatPart(part: MaintenanceRecord["parts"][number]): string {
  return [part.manufacturer, part.name, part.partNumber].filter(Boolean).join(" · ");
}
