import type {
  AppData,
  ContentReport,
  ContentReportReason,
  ContentReportStatus,
  ModerationAction,
} from "./types.ts";

export interface ContentReportDraft {
  targetType: "journal";
  targetId: string;
  reason: ContentReportReason;
  details: string;
}

export interface ContentReportValidation {
  valid: boolean;
  errors: Partial<Record<"target" | "reason" | "details" | "duplicate", "invalid" | "too_long" | "duplicate">>;
}

const openStatuses = new Set<ContentReportStatus>([
  "submitted",
  "under_review",
  "action_requested",
  "temporarily_hidden",
]);

export function validateContentReport(
  data: AppData,
  draft: ContentReportDraft,
): ContentReportValidation {
  const errors: ContentReportValidation["errors"] = {};
  const journal = data.journals.find((item) => item.id === draft.targetId);
  if (
    draft.targetType !== "journal" ||
    !journal ||
    journal.authorProfileId === data.currentProfileId
  ) {
    errors.target = "invalid";
  }
  if (!isContentReportReason(draft.reason)) errors.reason = "invalid";
  if (draft.details.trim().length > 500) errors.details = "too_long";
  if (
    data.contentReports.some(
      (report) =>
        report.reporterProfileId === data.currentProfileId &&
        report.targetType === draft.targetType &&
        report.targetId === draft.targetId &&
        openStatuses.has(report.status),
    )
  ) {
    errors.duplicate = "duplicate";
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function submitContentReport(
  data: AppData,
  draft: ContentReportDraft,
  now = new Date().toISOString(),
): { data: AppData; report: ContentReport } {
  const validation = validateContentReport(data, draft);
  if (!validation.valid) throw new Error("invalid_content_report");
  const id = `report-${crypto.randomUUID()}`;
  const report: ContentReport = {
    id,
    reporterProfileId: data.currentProfileId,
    targetType: draft.targetType,
    targetId: draft.targetId,
    reason: draft.reason,
    details: draft.details.trim() || undefined,
    status: "submitted",
    events: [
      {
        id: `moderation-event-${crypto.randomUUID()}`,
        actorProfileId: data.currentProfileId,
        action: "submitted",
        createdAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
  return {
    report,
    data: { ...data, contentReports: [report, ...data.contentReports] },
  };
}

export function applyModerationAction(
  data: AppData,
  reportId: string,
  action: Exclude<ModerationAction, "submitted">,
  now = new Date().toISOString(),
): AppData {
  const report = data.contentReports.find((item) => item.id === reportId);
  if (!report) throw new Error("report_not_found");
  const nextStatus = transitionReportStatus(report.status, action);
  const hide = action === "hide_temporarily";
  const restore = action === "restore_content";

  return {
    ...data,
    contentReports: data.contentReports.map((item) =>
      item.id === reportId
        ? {
            ...item,
            status: nextStatus,
            updatedAt: now,
            events: [
              ...item.events,
              {
                id: `moderation-event-${crypto.randomUUID()}`,
                actorProfileId: data.currentProfileId,
                action,
                createdAt: now,
              },
            ],
          }
        : item,
    ),
    journals: data.journals.map((journal) =>
      journal.id === report.targetId
        ? {
            ...journal,
            moderationState: hide
              ? "temporarily_hidden"
              : restore || action === "close_no_action"
                ? "visible"
                : action === "start_review"
                  ? "under_review"
                  : journal.moderationState,
          }
        : journal,
    ),
  };
}

function transitionReportStatus(
  current: ContentReportStatus,
  action: Exclude<ModerationAction, "submitted">,
): ContentReportStatus {
  if (action === "start_review" && (current === "submitted" || current === "action_requested")) {
    return "under_review";
  }
  if (action === "request_correction" && current === "under_review") {
    return "action_requested";
  }
  if (action === "hide_temporarily" && current === "under_review") {
    return "temporarily_hidden";
  }
  if (action === "close_no_action" && current !== "temporarily_hidden") {
    return "closed_no_action";
  }
  if (action === "restore_content" && current === "temporarily_hidden") {
    return "closed_no_action";
  }
  throw new Error("invalid_moderation_transition");
}

function isContentReportReason(value: string): value is ContentReportReason {
  return [
    "personal_information",
    "dangerous_claim",
    "harassment",
    "copyright",
    "spam",
    "other",
  ].includes(value);
}
