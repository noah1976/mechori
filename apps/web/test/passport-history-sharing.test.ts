import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { MaintenanceRecord, MaintenanceRecordAction, Vehicle, VehiclePassport } from "@mechori/core";
import {
  buildPassportMaintenanceHistoryProjection,
  buildPassportShareProjection,
  passportHistoryDateLabel,
} from "../lib/passport-share-projection.ts";

const vehicle = {
  id: "vehicle-1",
  ownerProfileId: "private-owner-id",
  vehicleCategory: "car",
  make: "FIAT",
  model: "Barchetta",
  identityMatchStatus: "unmatched",
  ownershipType: "owned",
  memberDiscoveryEnabled: false,
  odometerContext: "current",
  odometerKm: 0,
  odometerEpisodes: [],
  currentOdometerReading: {
    episodeId: "episode-1",
    displayedValue: 0,
    unit: "km",
    sequenceAssessment: "consistent_increase",
  },
  nickname: "バルケッタ",
  year: 1997,
  engine: "",
  steering: "unknown",
  transmission: "",
  isDemo: false,
} satisfies Vehicle;

const passport = {
  vehicleId: vehicle.id,
  odometerValue: 86420,
  odometerUnit: "km",
  workshopConcerns: "低速で少し異音",
  createdAt: "2026-09-17T00:00:00.000Z",
  updatedAt: "2026-09-21T01:00:00.000Z",
  completedAt: "2026-09-17T00:00:00.000Z",
} satisfies VehiclePassport;

function action(index: number, overrides: Partial<MaintenanceRecordAction> = {}): MaintenanceRecordAction {
  return {
    id: `private-action-${index}`,
    summary: `整備項目 ${index + 1}`,
    causeCandidates: "private cause",
    checksPerformed: "状態を確認",
    workPerformed: "交換",
    parts: [{ name: `部品 ${index + 1}`, manufacturer: "TRW", partNumber: `P-${index + 1}` }],
    result: "動作確認",
    followUpNote: "次回に再確認",
    resolutionStatus: "resolved",
    hazardLevel: "LOW",
    ...overrides,
  };
}

function record(index: number, overrides: Partial<MaintenanceRecord> = {}): MaintenanceRecord {
  return {
    id: `private-record-${index}`,
    vehicleId: vehicle.id,
    serviceDate: `2026-09-${String(20 - index).padStart(2, "0")}`,
    serviceDatePrecision: "day",
    summary: `整備 ${index + 1}`,
    sourceLanguage: "ja",
    symptoms: "private symptom",
    causeCandidates: "private cause",
    checksPerformed: "確認",
    workPerformed: "交換",
    parts: [{ name: "旧部品" }],
    cost: 999999,
    resolutionStatus: "resolved",
    hazardLevel: "LOW",
    visibility: "private",
    verificationStatus: "owner_confirmed",
    sourceType: "owner_record",
    evidenceBasis: "unknown",
    matchScope: "private scope",
    result: "完了",
    notes: "private notes",
    actions: [action(index)],
    serviceAttribution: { version: 1, performedByType: "unknown" },
    sourceReference: { type: "passport_service_report", id: "private-source-id", receivedAt: "2026-09-21T00:00:00.000Z" },
    createdAt: "2026-09-21T00:00:00.000Z",
    updatedAt: "2026-09-21T00:00:00.000Z",
    isDemo: false,
    ...overrides,
  };
}

test("history projection keeps all matching records and all Service Items newest first", () => {
  const records = Array.from({ length: 5 }, (_, index) => record(index));
  records[0] = record(0, { actions: Array.from({ length: 5 }, (_, index) => action(index)) });
  const projection = buildPassportMaintenanceHistoryProjection(records, vehicle.id);
  assert.equal(projection.length, 5);
  assert.equal(projection[0]?.items.length, 5);
  assert.equal(projection[0]?.items[0]?.parts[0], "TRW · 部品 1 · P-1");
  assert.equal(projection[0]?.items[0]?.followUpNote, "次回に再確認");
});

test("history projection keeps legacy flat records and unknown dates without fabrication", () => {
  const projection = buildPassportMaintenanceHistoryProjection([
    record(0, {
      serviceDate: "",
      serviceDatePrecision: "unknown",
      odometerKm: undefined,
      odometerReading: undefined,
      summary: "古い整備記録",
      checksPerformed: "点検結果",
      workPerformed: "調整",
      parts: [{ name: "ガスケット" }, { name: "ボルト" }],
      result: "経過確認",
      actions: [],
    }),
    record(1),
  ], vehicle.id);
  assert.equal(projection[1]?.summary, "古い整備記録");
  assert.equal(projection[1]?.odometerValue, undefined);
  assert.deepEqual(projection[1]?.items[0]?.parts, ["ガスケット", "ボルト"]);
  assert.equal(passportHistoryDateLabel(projection[1]!), "時期不明");
});

test("history projection excludes other vehicles and all private/internal fields", () => {
  const projection = buildPassportShareProjection(vehicle, passport, [
    record(0),
    record(1, { vehicleId: "other-vehicle" }),
  ], true);
  assert.equal(projection.projectionVersion, 2);
  assert.equal(projection.maintenanceHistory?.length, 1);
  const serialized = JSON.stringify(projection);
  for (const secret of [
    "private-record", "private-action", "private notes", "private-source-id",
    "private scope", "private symptom", "private-owner-id", "999999",
  ]) assert.equal(serialized.includes(secret), false, secret);
});

test("legacy shares remain Passport-only until the owner explicitly enables history", () => {
  const legacy = buildPassportShareProjection(vehicle, passport, [record(0)]);
  const enabled = buildPassportShareProjection(vehicle, passport, [record(0)], true);
  assert.equal(legacy.projectionVersion, 1);
  assert.equal(legacy.maintenanceHistory, undefined);
  assert.equal(enabled.projectionVersion, 2);
  assert.equal(enabled.maintenanceHistory?.length, 1);
});

test("Workshop UI includes the explicit empty state, ledger, consent, and refresh recovery", () => {
  const publicPage = readFileSync(new URL("../app/p/[token]/page.tsx", import.meta.url), "utf8");
  const history = readFileSync(new URL("../components/passport-maintenance-history.tsx", import.meta.url), "utf8");
  const owner = readFileSync(new URL("../components/passport-experience.tsx", import.meta.url), "utf8");
  const inbox = readFileSync(new URL("../components/passport-service-report-inbox.tsx", import.meta.url), "utf8");
  const context = readFileSync(new URL("../lib/app-context.tsx", import.meta.url), "utf8");
  assert.match(publicPage, /これまでの整備履歴|PassportMaintenanceHistory/);
  assert.match(history, /整備履歴はまだ登録されていません/);
  assert.match(history, /すべて見る/);
  assert.match(owner, /車両情報と整備履歴が、このリンクを知っている人に表示されます/);
  assert.match(owner, /整備履歴を含めて共有内容を更新/);
  assert.match(owner, /共有内容を更新/);
  assert.match(owner, /変更は保存しましたが、共有ページの更新に失敗しました/);
  assert.match(inbox, /履歴には保存しましたが、共有ページの更新に失敗しました/);
  assert.match(context, /syncHistoryEnabledPassportShare\(result\.data, vehicle\.id\)/);
  assert.match(context, /syncHistoryEnabledPassportShare\(result\.data, previous\.vehicleId\)/);
});

test("additive migration keeps v1 consent and exposes only a validated v2 snapshot", () => {
  const migration = readFileSync(
    new URL("../../../supabase/migrations/202609210002_passport_history_projection.sql", import.meta.url),
    "utf8",
  );
  assert.match(migration, /add column maintenance_history jsonb/);
  assert.match(migration, /add column projection_version integer not null default 1/);
  assert.match(migration, /projection_version = 1 and maintenance_history is null/);
  assert.match(migration, /create function public\.create_passport_share_v2/);
  assert.match(migration, /create function public\.get_public_passport_share_v2/);
  assert.match(migration, /share\.projection_version = 2 then share\.maintenance_history else null/);
  assert.match(migration, /share\.is_active/);
  assert.match(migration, /jsonb_array_length\(p_history\) > 500/);
  assert.doesNotMatch(migration, /grant (select|insert|update|delete).*alpha_passport_shares/i);
  assert.doesNotMatch(migration, /alpha_private_workspaces/);
  assert.doesNotMatch(migration, /drop |truncate /i);
});
