import assert from "node:assert/strict";
import test from "node:test";

import {
  applyModerationAction,
  cloneDemoData,
  submitContentReport,
  validateContentReport,
} from "../src/index.ts";

const draft = {
  targetType: "journal" as const,
  targetId: "journal-demo-luca-drive",
  reason: "personal_information" as const,
  details: "DEMO: 背景に個人情報が含まれる可能性があります。",
};

test("submits a minimal report without changing publication state", () => {
  const result = submitContentReport(
    cloneDemoData(),
    draft,
    "2026-07-16T12:00:00.000Z",
  );

  assert.equal(result.report.status, "submitted");
  assert.equal(result.report.events[0]?.action, "submitted");
  assert.equal(
    result.data.journals.find((journal) => journal.id === draft.targetId)?.moderationState,
    "visible",
  );
});

test("rejects a second open report from the same profile", () => {
  const first = submitContentReport(cloneDemoData(), draft).data;
  const validation = validateContentReport(first, draft);

  assert.equal(validation.valid, false);
  assert.equal(validation.errors.duplicate, "duplicate");
});

test("moves a report through review, temporary hiding, and restoration", () => {
  const submitted = submitContentReport(cloneDemoData(), draft).data;
  const reportId = submitted.contentReports[0]?.id;
  assert.ok(reportId);

  const reviewing = applyModerationAction(
    submitted,
    reportId,
    "start_review",
    "2026-07-16T12:05:00.000Z",
  );
  assert.equal(reviewing.contentReports[0]?.status, "under_review");
  assert.equal(
    reviewing.journals.find((journal) => journal.id === draft.targetId)?.moderationState,
    "under_review",
  );

  const hidden = applyModerationAction(
    reviewing,
    reportId,
    "hide_temporarily",
    "2026-07-16T12:10:00.000Z",
  );
  assert.equal(hidden.contentReports[0]?.status, "temporarily_hidden");
  assert.equal(
    hidden.journals.find((journal) => journal.id === draft.targetId)?.moderationState,
    "temporarily_hidden",
  );

  const restored = applyModerationAction(
    hidden,
    reportId,
    "restore_content",
    "2026-07-16T12:15:00.000Z",
  );
  assert.equal(restored.contentReports[0]?.status, "closed_no_action");
  assert.equal(
    restored.journals.find((journal) => journal.id === draft.targetId)?.moderationState,
    "visible",
  );
  assert.deepEqual(
    restored.contentReports[0]?.events.map((event) => event.action),
    ["submitted", "start_review", "hide_temporarily", "restore_content"],
  );
});

test("rejects moderation actions that skip required review", () => {
  const submitted = submitContentReport(cloneDemoData(), draft).data;
  const reportId = submitted.contentReports[0]?.id;
  assert.ok(reportId);

  assert.throws(
    () => applyModerationAction(submitted, reportId, "hide_temporarily"),
    /invalid_moderation_transition/,
  );
});
