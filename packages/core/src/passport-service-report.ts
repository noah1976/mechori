import { applyRecordDraftToData } from "./records.ts";
import { unknownServiceAttribution } from "./service-attribution.ts";
import type { LanguageTag } from "./language.ts";
import type {
  AppData,
  MaintenanceRecord,
  PassportServiceReportConfirmation,
  RecordDraft,
} from "./types.ts";

const REPORT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function passportServiceReportRecordId(reportId: string): string {
  if (!REPORT_ID_PATTERN.test(reportId)) throw new Error("passport_service_report_id_invalid");
  return `record-passport-report-${reportId.toLowerCase()}`;
}

export function applyPassportServiceReportToData(
  data: AppData,
  vehicleId: string,
  confirmation: PassportServiceReportConfirmation,
  sourceLanguage: LanguageTag = "ja",
): { data: AppData; record: MaintenanceRecord } {
  const recordId = passportServiceReportRecordId(confirmation.reportId);
  const draft: RecordDraft = {
    serviceDate: confirmation.serviceDate.trim(),
    serviceDatePrecision: confirmation.serviceDate.trim() ? "day" : "unknown",
    servicePeriodNote: "",
    odometerKm: confirmation.odometerValue.trim(),
    odometerUnit: confirmation.odometerUnit,
    odometerEpisodeId: "",
    odometerChangeReason: "same_episode",
    summary: confirmation.summary,
    symptoms: confirmation.inspectionNotes,
    causeCandidates: "",
    checksPerformed: confirmation.inspectionNotes,
    workPerformed: confirmation.workPerformed,
    partName: confirmation.partsUsed,
    partManufacturer: "",
    partNumber: "",
    cost: "",
    resolutionStatus: confirmation.resolutionStatus,
    hazardLevel: "LOW",
    evidenceBasis: "unknown",
    additionalActions: [],
    serviceAttribution: unknownServiceAttribution(),
    requestSharing: false,
  };
  const applied = applyRecordDraftToData(data, draft, recordId, sourceLanguage, vehicleId);
  const result = confirmation.resultNotes.trim();
  const record: MaintenanceRecord = {
    ...applied.record,
    checksPerformed: confirmation.inspectionNotes.trim(),
    workPerformed: confirmation.workPerformed.trim(),
    result,
    notes: confirmation.otherNotes.trim() || undefined,
    actions: applied.record.actions.map((action, index) => index === 0
      ? {
          ...action,
          checksPerformed: confirmation.inspectionNotes.trim(),
          workPerformed: confirmation.workPerformed.trim(),
          result,
        }
      : action),
    sourceReference: {
      type: "passport_service_report",
      id: confirmation.reportId.toLowerCase(),
      receivedAt: confirmation.submittedAt,
    },
  };
  return {
    record,
    data: {
      ...applied.data,
      records: applied.data.records.map((item) => item.id === record.id ? record : item),
    },
  };
}
