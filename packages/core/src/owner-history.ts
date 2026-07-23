import type { AppData, Locale, MaintenanceRecord, Vehicle } from "./types.ts";
import { maintenanceRecordDateKey } from "./records.ts";

export type HistoryLevelCode = "not_started" | "started" | "organized" | "ongoing";
export type HistoryMilestoneCode =
  | "first_record"
  | "multi_action_visit"
  | "result_recorded"
  | "knowledge_candidate"
  | "knowledge_shared";

export interface HistoryMilestone {
  code: HistoryMilestoneCode;
  achieved: boolean;
  evidenceCount: number;
}

export interface VehicleHistorySnapshot {
  level: HistoryLevelCode;
  levelNumber: number;
  maximumLevelNumber: number;
  recordCount: number;
  actionCount: number;
  partReferenceCount: number;
  unresolvedCount: number;
  pendingReviewCount: number;
  publicKnowledgeCount: number;
  firstServiceDate?: string;
  lastServiceDate?: string;
  coveredDays: number;
  milestones: HistoryMilestone[];
}

export interface AppDataExport {
  exportFormat: "mechori-owner-data";
  exportVersion: 1;
  exportedAt: string;
  notice: string;
  data: AppData;
}

function getServiceDates(records: MaintenanceRecord[]): string[] {
  return records
    .filter((record) => record.serviceDatePrecision === "day")
    .map(maintenanceRecordDateKey)
    .filter((date) => date !== "0000")
    .sort((a, b) => a.localeCompare(b));
}

function differenceInDays(first?: string, last?: string): number {
  if (!first || !last) return 0;
  return Math.max(0, Math.round((Date.parse(last) - Date.parse(first)) / 86_400_000));
}

export function summarizeVehicleHistory(
  vehicle: Vehicle,
  allRecords: MaintenanceRecord[],
): VehicleHistorySnapshot {
  const records = allRecords.filter((record) => record.vehicleId === vehicle.id);
  const dates = getServiceDates(records);
  const firstServiceDate = dates[0];
  const lastServiceDate = dates.at(-1);
  const coveredDays = differenceInDays(firstServiceDate, lastServiceDate);
  const actionCount = records.reduce((total, record) => total + record.actions.length, 0);
  const partReferenceCount = records.reduce(
    (total, record) => total + record.actions.reduce((count, action) => count + action.parts.length, 0),
    0,
  );
  const resolvedWithResult = records.filter((record) =>
    record.actions.some(
      (action) => action.resolutionStatus === "resolved" && action.result.trim().length > 0,
    ),
  ).length;
  const multiActionVisits = records.filter((record) => record.actions.length > 1).length;
  const pendingReviewCount = records.filter((record) => record.visibility === "pending_review").length;
  const publicKnowledgeCount = records.filter((record) => record.visibility === "public").length;

  let level: HistoryLevelCode = "not_started";
  let levelNumber = 0;
  if (records.length >= 1) {
    level = "started";
    levelNumber = 1;
  }
  if (records.length >= 3 && actionCount >= 3) {
    level = "organized";
    levelNumber = 2;
  }
  if (records.length >= 6 && coveredDays >= 180) {
    level = "ongoing";
    levelNumber = 3;
  }

  return {
    level,
    levelNumber,
    maximumLevelNumber: 3,
    recordCount: records.length,
    actionCount,
    partReferenceCount,
    unresolvedCount: records.filter((record) => record.resolutionStatus === "unresolved").length,
    pendingReviewCount,
    publicKnowledgeCount,
    firstServiceDate,
    lastServiceDate,
    coveredDays,
    milestones: [
      { code: "first_record", achieved: records.length >= 1, evidenceCount: records.length },
      {
        code: "multi_action_visit",
        achieved: multiActionVisits >= 1,
        evidenceCount: multiActionVisits,
      },
      {
        code: "result_recorded",
        achieved: resolvedWithResult >= 1,
        evidenceCount: resolvedWithResult,
      },
      {
        code: "knowledge_candidate",
        achieved: pendingReviewCount + publicKnowledgeCount >= 1,
        evidenceCount: pendingReviewCount + publicKnowledgeCount,
      },
      {
        code: "knowledge_shared",
        achieved: publicKnowledgeCount >= 1,
        evidenceCount: publicKnowledgeCount,
      },
    ],
  };
}

export function buildHistoryShareText(
  locale: Locale,
  vehicle: Vehicle,
  snapshot: VehicleHistorySnapshot,
): string {
  if (locale === "en") {
    return `I organized ${snapshot.recordCount} maintenance records for my ${vehicle.make} ${vehicle.model} with MECHORI. Fix. Share. Drive on. #MECHORI`;
  }
  return `MECHORIで${vehicle.make} ${vehicle.model}の整備履歴を${snapshot.recordCount}件整理しました。直して、シェアして、また走ろう。 #MECHORI`;
}

export function createAppDataExport(data: AppData, exportedAt: string): AppDataExport {
  return {
    exportFormat: "mechori-owner-data",
    exportVersion: 1,
    exportedAt,
    notice: "This export contains owner-controlled prototype data. Review it before sharing.",
    data: structuredClone(data),
  };
}
