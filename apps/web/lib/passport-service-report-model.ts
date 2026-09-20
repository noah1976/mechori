import type {
  PassportServiceReportConfirmation,
  PrototypeOdometerUnit,
  ResolutionStatus,
} from "@mechori/core";

export const PASSPORT_REPORT_TEXT_LIMIT = 2000;

export interface PassportServiceReportDraft {
  serviceDate: string;
  odometerValue: string;
  odometerUnit: PrototypeOdometerUnit;
  workshopName: string;
  inspectionNotes: string;
  workPerformed: string;
  partsUsed: string;
  resultNotes: string;
  otherNotes: string;
}

export type PassportServiceReportStatus = "pending" | "accepted" | "dismissed";

export interface PassportServiceReport extends PassportServiceReportDraft {
  id: string;
  vehicleId: string;
  submittedAt: string;
  status: PassportServiceReportStatus;
  reviewedAt?: string;
  acceptedRecordId?: string;
}

export function createEmptyPassportServiceReportDraft(): PassportServiceReportDraft {
  return {
    serviceDate: "",
    odometerValue: "",
    odometerUnit: "km",
    workshopName: "",
    inspectionNotes: "",
    workPerformed: "",
    partsUsed: "",
    resultNotes: "",
    otherNotes: "",
  };
}

export function validatePassportServiceReportDraft(
  draft: PassportServiceReportDraft,
): { valid: boolean; error?: "empty" | "date" | "odometer" | "length" } {
  if (draft.serviceDate && !isValidDateOnly(draft.serviceDate)) return { valid: false, error: "date" };
  if (draft.odometerValue.trim()) {
    const odometer = Number(draft.odometerValue);
    if (!Number.isFinite(odometer) || odometer < 0 || odometer > 1_000_000_000) {
      return { valid: false, error: "odometer" };
    }
  }
  const fields = [
    draft.workshopName,
    draft.inspectionNotes,
    draft.workPerformed,
    draft.partsUsed,
    draft.resultNotes,
    draft.otherNotes,
  ];
  if (draft.workshopName.trim().length > 120 || fields.slice(1).some((value) => value.trim().length > PASSPORT_REPORT_TEXT_LIMIT)) {
    return { valid: false, error: "length" };
  }
  if (!fields.slice(1).some((value) => value.trim())) return { valid: false, error: "empty" };
  return { valid: true };
}

export function defaultPassportServiceReportSummary(report: PassportServiceReport): string {
  const source = [
    report.workPerformed,
    report.inspectionNotes,
    report.resultNotes,
    report.partsUsed,
    report.otherNotes,
  ].find((value) => value.trim());
  return (source?.trim().split(/\r?\n/, 1)[0] ?? "整備記録").slice(0, 120);
}

export function toPassportServiceReportConfirmation(
  report: PassportServiceReport,
  values: {
    summary: string;
    serviceDate: string;
    odometerValue: string;
    odometerUnit: PrototypeOdometerUnit;
    inspectionNotes: string;
    workPerformed: string;
    partsUsed: string;
    resultNotes: string;
    otherNotes: string;
    resolutionStatus: ResolutionStatus;
  },
): PassportServiceReportConfirmation {
  return {
    reportId: report.id,
    submittedAt: report.submittedAt,
    ...values,
  };
}

function isValidDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
