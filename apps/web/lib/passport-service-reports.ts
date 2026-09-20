import {
  LOCAL_PASSPORT_SHARE_OWNER_PREFIX,
  LOCAL_PASSPORT_SHARE_PREFIX,
} from "@/lib/passport-share";
import { getMechoriRuntime } from "@/lib/runtime-config";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  validatePassportServiceReportDraft,
  type PassportServiceReport,
  type PassportServiceReportDraft,
} from "@/lib/passport-service-report-model";

export {
  createEmptyPassportServiceReportDraft,
  defaultPassportServiceReportSummary,
  PASSPORT_REPORT_TEXT_LIMIT,
  toPassportServiceReportConfirmation,
  validatePassportServiceReportDraft,
  type PassportServiceReport,
  type PassportServiceReportDraft,
  type PassportServiceReportStatus,
} from "@/lib/passport-service-report-model";

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const REPORT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LOCAL_REPORTS_KEY = "mechori.local.passport-service-reports";
export interface PassportServiceReportSubmission {
  reportId: string;
  submittedAt: string;
}

interface StoredLocalReport extends PassportServiceReport {
  submissionKey: string;
  shareToken: string;
}

export async function submitPassportServiceReport(
  token: string,
  submissionKey: string,
  draft: PassportServiceReportDraft,
): Promise<PassportServiceReportSubmission> {
  if (!TOKEN_PATTERN.test(token)) throw new Error("passport_share_token_invalid");
  if (!REPORT_ID_PATTERN.test(submissionKey)) throw new Error("passport_report_submission_key_invalid");
  const validation = validatePassportServiceReportDraft(draft);
  if (!validation.valid) throw new Error(`passport_report_${validation.error}`);
  if (getMechoriRuntime() !== "alpha") return submitLocalReport(token, submissionKey, draft);
  const { data, error } = await createSupabaseBrowserClient()
    .rpc("submit_passport_service_report", {
      p_token: token,
      p_submission_key: submissionKey,
      p_report: draftToDatabase(draft),
    })
    .single();
  if (error || !data) throw new Error("passport_report_submit_failed");
  const row = data as Record<string, unknown>;
  return { reportId: String(row.report_id), submittedAt: String(row.submitted_at) };
}

export async function loadMyPassportServiceReports(): Promise<PassportServiceReport[]> {
  if (getMechoriRuntime() !== "alpha") return loadLocalReports();
  const { data, error } = await createSupabaseBrowserClient().rpc("list_my_passport_service_reports");
  if (error) throw new Error("passport_reports_load_failed");
  return ((data ?? []) as Array<Record<string, unknown>>).map(mapReportRow);
}

export async function markPassportServiceReportAccepted(
  reportId: string,
  recordId: string,
): Promise<string> {
  if (!REPORT_ID_PATTERN.test(reportId)) throw new Error("passport_service_report_id_invalid");
  if (getMechoriRuntime() !== "alpha") {
    updateLocalReport(reportId, (report) => ({
      ...report,
      status: "accepted",
      reviewedAt: new Date().toISOString(),
      acceptedRecordId: recordId,
    }));
    return recordId;
  }
  const { data, error } = await createSupabaseBrowserClient().rpc("accept_passport_service_report", {
    p_report_id: reportId,
    p_record_id: recordId,
  });
  if (error || data !== recordId) throw new Error("passport_report_accept_failed");
  return recordId;
}

export async function dismissPassportServiceReport(reportId: string): Promise<void> {
  if (!REPORT_ID_PATTERN.test(reportId)) throw new Error("passport_service_report_id_invalid");
  if (getMechoriRuntime() !== "alpha") {
    updateLocalReport(reportId, (report) => ({
      ...report,
      status: "dismissed",
      reviewedAt: new Date().toISOString(),
    }));
    return;
  }
  const { data, error } = await createSupabaseBrowserClient().rpc("dismiss_passport_service_report", {
    p_report_id: reportId,
  });
  if (error || data !== true) throw new Error("passport_report_dismiss_failed");
}

function draftToDatabase(draft: PassportServiceReportDraft): Record<string, unknown> {
  return {
    service_date: draft.serviceDate || null,
    odometer_value: draft.odometerValue.trim() || null,
    odometer_unit: draft.odometerUnit,
    workshop_name: draft.workshopName.trim() || null,
    inspection_notes: draft.inspectionNotes.trim() || null,
    work_performed: draft.workPerformed.trim() || null,
    parts_used: draft.partsUsed.trim() || null,
    result_notes: draft.resultNotes.trim() || null,
    other_notes: draft.otherNotes.trim() || null,
  };
}

function mapReportRow(row: Record<string, unknown>): PassportServiceReport {
  return {
    id: String(row.id),
    vehicleId: String(row.vehicle_id),
    submittedAt: String(row.submitted_at),
    status: row.status === "accepted" || row.status === "dismissed" ? row.status : "pending",
    reviewedAt: optionalString(row.reviewed_at),
    acceptedRecordId: optionalString(row.accepted_record_id),
    serviceDate: optionalString(row.service_date) ?? "",
    odometerValue: optionalString(row.odometer_value) ?? "",
    odometerUnit: row.odometer_unit === "mi" || row.odometer_unit === "unknown" ? row.odometer_unit : "km",
    workshopName: optionalString(row.workshop_name) ?? "",
    inspectionNotes: optionalString(row.inspection_notes) ?? "",
    workPerformed: optionalString(row.work_performed) ?? "",
    partsUsed: optionalString(row.parts_used) ?? "",
    resultNotes: optionalString(row.result_notes) ?? "",
    otherNotes: optionalString(row.other_notes) ?? "",
  };
}

function submitLocalReport(
  token: string,
  submissionKey: string,
  draft: PassportServiceReportDraft,
): PassportServiceReportSubmission {
  if (!window.localStorage.getItem(`${LOCAL_PASSPORT_SHARE_PREFIX}${token}`)) {
    throw new Error("passport_share_inactive");
  }
  const vehicleId = window.localStorage.getItem(`${LOCAL_PASSPORT_SHARE_OWNER_PREFIX}${token}`);
  if (!vehicleId) throw new Error("passport_share_owner_missing");
  const reports = loadLocalReportsWithMetadata();
  const existing = reports.find((item) => item.shareToken === token && item.submissionKey === submissionKey);
  if (existing) return { reportId: existing.id, submittedAt: existing.submittedAt };
  const report: StoredLocalReport = {
    ...draft,
    id: crypto.randomUUID(),
    vehicleId,
    shareToken: token,
    submissionKey,
    submittedAt: new Date().toISOString(),
    status: "pending",
  };
  window.localStorage.setItem(LOCAL_REPORTS_KEY, JSON.stringify([...reports, report]));
  return { reportId: report.id, submittedAt: report.submittedAt };
}

function loadLocalReports(): PassportServiceReport[] {
  return loadLocalReportsWithMetadata().map((report) => ({
    id: report.id,
    vehicleId: report.vehicleId,
    submittedAt: report.submittedAt,
    status: report.status,
    reviewedAt: report.reviewedAt,
    acceptedRecordId: report.acceptedRecordId,
    serviceDate: report.serviceDate,
    odometerValue: report.odometerValue,
    odometerUnit: report.odometerUnit,
    workshopName: report.workshopName,
    inspectionNotes: report.inspectionNotes,
    workPerformed: report.workPerformed,
    partsUsed: report.partsUsed,
    resultNotes: report.resultNotes,
    otherNotes: report.otherNotes,
  }));
}

function loadLocalReportsWithMetadata(): StoredLocalReport[] {
  const value = window.localStorage.getItem(LOCAL_REPORTS_KEY);
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as StoredLocalReport[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function updateLocalReport(
  reportId: string,
  update: (report: StoredLocalReport) => StoredLocalReport,
): void {
  const reports = loadLocalReportsWithMetadata();
  let found = false;
  const next = reports.map((report) => {
    if (report.id !== reportId) return report;
    found = true;
    return update(report);
  });
  if (!found) throw new Error("passport_report_not_found");
  window.localStorage.setItem(LOCAL_REPORTS_KEY, JSON.stringify(next));
}

function optionalString(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return typeof value === "string" && value ? value : undefined;
}
