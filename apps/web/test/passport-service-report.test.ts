import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  createEmptyPassportServiceReportDraft,
  createEmptyPassportServiceItem,
  defaultPassportServiceReportSummary,
  legacyReportToServiceItem,
  PASSPORT_SERVICE_ITEM_LIMIT,
  validatePassportServiceReportDraft,
  type PassportServiceReport,
} from "../lib/passport-service-report-model.ts";

const migration = readFileSync(
  new URL("../../../supabase/migrations/202609200001_alpha_passport_service_reports.sql", import.meta.url),
  "utf8",
);
const serviceItemsMigration = readFileSync(
  new URL("../../../supabase/migrations/202609210001_passport_service_items.sql", import.meta.url),
  "utf8",
);

function report(overrides: Partial<PassportServiceReport> = {}): PassportServiceReport {
  return {
    ...createEmptyPassportServiceReportDraft(),
    id: "53f42f4d-d470-4a41-8ee5-86545422da4f",
    vehicleId: "vehicle-1",
    submittedAt: "2026-09-20T10:00:00.000Z",
    status: "pending",
    serviceItems: [{
      ...createEmptyPassportServiceItem("4336a3e1-17dd-4ee5-a6b8-10de3d33010d"),
      subject: "左リアブレーキ",
      workPerformed: "キャリパー交換\nエア抜き",
    }],
    ...overrides,
  };
}

test("Workshop report requires at least one valid Service Item", () => {
  assert.deepEqual(validatePassportServiceReportDraft(createEmptyPassportServiceReportDraft()), {
    valid: false,
    error: "subject",
    itemIndex: 0,
  });
  assert.equal(validatePassportServiceReportDraft({
    ...createEmptyPassportServiceReportDraft(),
    serviceItems: [{
      ...createEmptyPassportServiceItem("4336a3e1-17dd-4ee5-a6b8-10de3d33010d"),
      subject: "左リアブレーキ",
      result: "漏れがないことを確認",
    }],
  }).valid, true);
  assert.equal(validatePassportServiceReportDraft({
    ...createEmptyPassportServiceReportDraft(),
    serviceItems: [],
  }).valid, false);
});

test("Workshop report validates dates, mileage, and field lengths", () => {
  assert.equal(validatePassportServiceReportDraft({
    ...createEmptyPassportServiceReportDraft(),
    serviceDate: "2026-02-30",
    serviceItems: [{ ...createEmptyPassportServiceItem(), subject: "ブレーキ", workPerformed: "点検" }],
  }).error, "date");
  assert.equal(validatePassportServiceReportDraft({
    ...createEmptyPassportServiceReportDraft(),
    odometerValue: "-1",
    serviceItems: [{ ...createEmptyPassportServiceItem(), subject: "ブレーキ", workPerformed: "点検" }],
  }).error, "odometer");
  assert.equal(validatePassportServiceReportDraft({
    ...createEmptyPassportServiceReportDraft(),
    serviceItems: [{ ...createEmptyPassportServiceItem(), subject: "ブレーキ", workPerformed: "x".repeat(1001) }],
  }).error, "length");
});

test("Workshop report accepts one or twenty items and rejects over-limit or empty items", () => {
  const item = (index: number) => ({
    ...createEmptyPassportServiceItem(`4336a3e1-17dd-4ee5-a6b8-10de3d3301${String(index).padStart(1, "0")}`),
    subject: `項目 ${index + 1}`,
    workPerformed: "点検のみ",
  });
  assert.equal(validatePassportServiceReportDraft({ ...createEmptyPassportServiceReportDraft(), serviceItems: [item(0)] }).valid, true);
  assert.equal(validatePassportServiceReportDraft({ ...createEmptyPassportServiceReportDraft(), serviceItems: Array.from({ length: PASSPORT_SERVICE_ITEM_LIMIT }, (_, index) => item(index)) }).valid, true);
  assert.equal(validatePassportServiceReportDraft({ ...createEmptyPassportServiceReportDraft(), serviceItems: Array.from({ length: PASSPORT_SERVICE_ITEM_LIMIT + 1 }, (_, index) => item(index)) }).error, "items");
  assert.equal(validatePassportServiceReportDraft({ ...createEmptyPassportServiceReportDraft(), serviceItems: [{ ...item(0), workPerformed: "" }] }).error, "empty");
});

test("Owner review heading comes from submitted facts without adding a diagnosis", () => {
  assert.equal(defaultPassportServiceReportSummary(report()), "左リアブレーキ");
  assert.equal(defaultPassportServiceReportSummary(report({ serviceItems: [
    { ...createEmptyPassportServiceItem(), subject: "ブレーキ", workPerformed: "点検" },
    { ...createEmptyPassportServiceItem(), subject: "オイル", workPerformed: "交換" },
  ] })), "ブレーキ ほか1件");
});

test("legacy flat reports project to one Service Item without rewriting the source", () => {
  const legacy = {
    inspectionNotes: "フルード漏れ",
    workPerformed: "キャリパー交換",
    partsUsed: "TRW",
    resultNotes: "漏れなし",
    otherNotes: "原文補足",
  };
  assert.deepEqual(legacyReportToServiceItem("53f42f4d-d470-4a41-8ee5-86545422da4f", legacy), {
    id: "53f42f4d-d470-4a41-8ee5-86545422da4f",
    subject: "整備記録",
    observedCondition: "フルード漏れ",
    workPerformed: "キャリパー交換",
    partsUsed: "TRW",
    result: "漏れなし",
    followUpNote: "",
  });
  assert.equal(legacy.otherNotes, "原文補足");
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

test("additive migration validates Service Items server-side without widening table access", () => {
  assert.match(serviceItemsMigration, /add column service_items jsonb/);
  assert.match(serviceItemsMigration, /jsonb_array_length\(service_items_input\) > 20/);
  assert.match(serviceItemsMigration, /service_item_subject_required/);
  assert.match(serviceItemsMigration, /service_item_content_required/);
  assert.match(serviceItemsMigration, /duplicate_service_item_id/);
  assert.match(serviceItemsMigration, /create function public\.list_my_passport_service_visits/);
  assert.match(serviceItemsMigration, /report\.owner_user_id = \(select auth\.uid\(\)\)/);
  assert.doesNotMatch(serviceItemsMigration, /grant (select|insert|update|delete).*alpha_passport_service_reports/i);
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
  assert.match(workshopForm, /整備項目を追加/);
  assert.match(workshopForm, /オーナーへ送る/);
  assert.doesNotMatch(workshopForm, /ログイン|アカウント作成/);
  assert.match(ownerInbox, /整備記録が\{pending\.length\}件届いています/);
  assert.match(ownerInbox, /履歴に追加/);
  assert.match(ownerInbox, /今回は追加しない/);
  assert.match(ownerInbox, /届いた内容（原文）/);
});
