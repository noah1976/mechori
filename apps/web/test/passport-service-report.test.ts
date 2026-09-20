import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  createEmptyPassportServiceReportDraft,
  defaultPassportServiceReportSummary,
  validatePassportServiceReportDraft,
  type PassportServiceReport,
} from "../lib/passport-service-report-model.ts";

const migration = readFileSync(
  new URL("../../../supabase/migrations/202609200001_alpha_passport_service_reports.sql", import.meta.url),
  "utf8",
);

function report(overrides: Partial<PassportServiceReport> = {}): PassportServiceReport {
  return {
    ...createEmptyPassportServiceReportDraft(),
    id: "53f42f4d-d470-4a41-8ee5-86545422da4f",
    vehicleId: "vehicle-1",
    submittedAt: "2026-09-20T10:00:00.000Z",
    status: "pending",
    workPerformed: "キャリパー交換\nエア抜き",
    ...overrides,
  };
}

test("Workshop report requires substantive content but keeps every field optional", () => {
  assert.deepEqual(validatePassportServiceReportDraft(createEmptyPassportServiceReportDraft()), {
    valid: false,
    error: "empty",
  });
  assert.equal(validatePassportServiceReportDraft({
    ...createEmptyPassportServiceReportDraft(),
    resultNotes: "漏れがないことを確認",
  }).valid, true);
  assert.equal(validatePassportServiceReportDraft({
    ...createEmptyPassportServiceReportDraft(),
    workshopName: "名前だけ",
  }).valid, false);
});

test("Workshop report validates dates, mileage, and field lengths", () => {
  assert.equal(validatePassportServiceReportDraft({
    ...createEmptyPassportServiceReportDraft(),
    serviceDate: "2026-02-30",
    workPerformed: "点検",
  }).error, "date");
  assert.equal(validatePassportServiceReportDraft({
    ...createEmptyPassportServiceReportDraft(),
    odometerValue: "-1",
    workPerformed: "点検",
  }).error, "odometer");
  assert.equal(validatePassportServiceReportDraft({
    ...createEmptyPassportServiceReportDraft(),
    workPerformed: "x".repeat(2001),
  }).error, "length");
});

test("Owner review heading comes from submitted facts without adding a diagnosis", () => {
  assert.equal(defaultPassportServiceReportSummary(report()), "キャリパー交換");
  assert.equal(defaultPassportServiceReportSummary(report({ workPerformed: "", inspectionNotes: "左リアを確認" })), "左リアを確認");
});

test("migration keeps anonymous submissions behind active token and a narrow RPC", () => {
  assert.match(migration, /create function public\.submit_passport_service_report/);
  assert.match(migration, /share\.is_active/);
  assert.match(migration, /report_content_required/);
  assert.match(migration, /report_field_too_long/);
  assert.match(migration, /report_rate_limited/);
  assert.match(migration, /returns table \(report_id uuid, submitted_at timestamptz\)/);
  assert.doesNotMatch(migration, /returns table \([^)]*owner_user_id/is);
  assert.match(migration, /revoke all on public\.alpha_passport_service_reports from public, anon, authenticated/);
  assert.doesNotMatch(migration, /grant (select|insert|update|delete).*alpha_passport_service_reports/i);
});

test("migration limits Owner access and preserves report acceptance idempotency", () => {
  assert.match(migration, /report\.owner_user_id = \(select auth\.uid\(\)\)/);
  assert.match(migration, /expected_record_id text := 'record-passport-report-'/);
  assert.match(migration, /if target_report\.status = 'accepted'/);
  assert.match(migration, /target_report\.accepted_record_id <> p_record_id/);
  assert.match(migration, /if target_status = 'dismissed' then return true/);
});

test("Passport UI exposes the complete roundtrip without Workshop login", () => {
  const publicPage = readFileSync(new URL("../app/p/[token]/page.tsx", import.meta.url), "utf8");
  const workshopForm = readFileSync(new URL("../components/passport-service-report-form.tsx", import.meta.url), "utf8");
  const ownerInbox = readFileSync(new URL("../components/passport-service-report-inbox.tsx", import.meta.url), "utf8");
  assert.match(publicPage, /PassportServiceReportForm/);
  assert.match(workshopForm, /今回の整備内容を返す/);
  assert.match(workshopForm, /オーナーへ送る/);
  assert.doesNotMatch(workshopForm, /ログイン|アカウント作成/);
  assert.match(ownerInbox, /整備記録が\{pending\.length\}件届いています/);
  assert.match(ownerInbox, /履歴に追加/);
  assert.match(ownerInbox, /今回は追加しない/);
  assert.match(ownerInbox, /届いた内容（原文）/);
});
