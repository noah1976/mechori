import type {
  PassportServiceReportConfirmation,
  PrototypeOdometerUnit,
  ResolutionStatus,
} from "@mechori/core";

export const PASSPORT_REPORT_TEXT_LIMIT = 2000;
export const PASSPORT_SERVICE_ITEM_TEXT_LIMIT = 1000;
export const PASSPORT_SERVICE_ITEM_SUBJECT_LIMIT = 160;
export const PASSPORT_SERVICE_ITEM_LIMIT = 20;

export interface PassportServiceItemDraft {
  id: string;
  subject: string;
  observedCondition: string;
  workPerformed: string;
  partsUsed: string;
  result: string;
  followUpNote: string;
}

export interface LegacyPassportServiceReport {
  inspectionNotes: string;
  workPerformed: string;
  partsUsed: string;
  resultNotes: string;
  otherNotes: string;
}

export interface PassportServiceReportDraft {
  serviceDate: string;
  odometerValue: string;
  odometerUnit: PrototypeOdometerUnit;
  workshopName: string;
  visitNotes: string;
  serviceItems: PassportServiceItemDraft[];
}

export type PassportServiceReportStatus = "pending" | "accepted" | "dismissed";

export interface PassportServiceReport extends PassportServiceReportDraft {
  id: string;
  vehicleId: string;
  submittedAt: string;
  status: PassportServiceReportStatus;
  reviewedAt?: string;
  acceptedRecordId?: string;
  legacySubmission?: LegacyPassportServiceReport;
}

export function createEmptyPassportServiceItem(
  id = crypto.randomUUID(),
): PassportServiceItemDraft {
  return {
    id,
    subject: "",
    observedCondition: "",
    workPerformed: "",
    partsUsed: "",
    result: "",
    followUpNote: "",
  };
}

export function createEmptyPassportServiceReportDraft(): PassportServiceReportDraft {
  return {
    serviceDate: "",
    odometerValue: "",
    odometerUnit: "km",
    workshopName: "",
    visitNotes: "",
    serviceItems: [createEmptyPassportServiceItem()],
  };
}

export function validatePassportServiceReportDraft(
  draft: PassportServiceReportDraft,
): { valid: boolean; error?: "items" | "subject" | "empty" | "date" | "odometer" | "length"; itemIndex?: number } {
  if (draft.serviceDate && !isValidDateOnly(draft.serviceDate)) return { valid: false, error: "date" };
  if (draft.odometerValue.trim()) {
    const odometer = Number(draft.odometerValue);
    if (!Number.isFinite(odometer) || odometer < 0 || odometer > 1_000_000_000) {
      return { valid: false, error: "odometer" };
    }
  }
  if (draft.workshopName.trim().length > 120 || draft.visitNotes.trim().length > PASSPORT_REPORT_TEXT_LIMIT) {
    return { valid: false, error: "length" };
  }
  if (draft.serviceItems.length < 1 || draft.serviceItems.length > PASSPORT_SERVICE_ITEM_LIMIT) {
    return { valid: false, error: "items" };
  }
  for (const [itemIndex, item] of draft.serviceItems.entries()) {
    if (!item.subject.trim()) return { valid: false, error: "subject", itemIndex };
    if (item.subject.trim().length > PASSPORT_SERVICE_ITEM_SUBJECT_LIMIT) {
      return { valid: false, error: "length", itemIndex };
    }
    const details = [
      item.observedCondition,
      item.workPerformed,
      item.partsUsed,
      item.result,
      item.followUpNote,
    ];
    if (details.some((value) => value.trim().length > PASSPORT_SERVICE_ITEM_TEXT_LIMIT)) {
      return { valid: false, error: "length", itemIndex };
    }
    if (!details.some((value) => value.trim())) {
      return { valid: false, error: "empty", itemIndex };
    }
  }
  return { valid: true };
}

export function defaultPassportServiceReportSummary(report: PassportServiceReport): string {
  const first = report.serviceItems[0]?.subject.trim();
  if (!first) return "整備記録";
  const suffix = report.serviceItems.length > 1 ? ` ほか${report.serviceItems.length - 1}件` : "";
  return `${first}${suffix}`.slice(0, 120);
}

export function toPassportServiceReportConfirmation(
  report: PassportServiceReport,
  values: {
    summary: string;
    serviceDate: string;
    odometerValue: string;
    odometerUnit: PrototypeOdometerUnit;
    visitNotes: string;
    items: PassportServiceItemDraft[];
    resolutionStatus: ResolutionStatus;
  },
): PassportServiceReportConfirmation {
  return {
    reportId: report.id,
    submittedAt: report.submittedAt,
    ...values,
    items: values.items.map((item) => ({ ...item })),
  };
}

export function legacyReportToServiceItem(
  reportId: string,
  legacy: LegacyPassportServiceReport,
): PassportServiceItemDraft {
  return {
    id: reportId,
    subject: "整備記録",
    observedCondition: legacy.inspectionNotes,
    workPerformed: legacy.workPerformed,
    partsUsed: legacy.partsUsed,
    result: legacy.resultNotes,
    followUpNote: "",
  };
}

function isValidDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
