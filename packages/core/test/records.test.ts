import assert from "node:assert/strict";
import test from "node:test";
import {
  applyRecordDraftToData,
  cloneDemoData,
  filterRecords,
  migrateAppData,
  validateRecordDraft,
  type RecordDraft,
} from "../src/index.ts";

function validDraft(overrides: Partial<RecordDraft> = {}): RecordDraft {
  return {
    serviceDate: "2026-07-13",
    odometerKm: "1000",
    odometerUnit: "km",
    odometerEpisodeId: "episode-demo-4",
    odometerChangeReason: "same_episode",
    summary: "DEMO: 整備イベント",
    symptoms: "DEMO: 確認内容",
    causeCandidates: "",
    checksPerformed: "",
    workPerformed: "",
    partName: "",
    partManufacturer: "",
    partNumber: "",
    cost: "",
    resolutionStatus: "unresolved",
    hazardLevel: "LOW",
    evidenceBasis: "contemporaneous",
    additionalActions: [],
    requestSharing: false,
    ...overrides,
  };
}

test("filters demo records by hazard and keyword", () => {
  const { records } = cloneDemoData();
  const results = filterRecords(records, {
    keyword: "警告",
    hazardLevel: "CRITICAL",
  });
  assert.equal(results.length, 1);
  assert.equal(results[0]?.id, "record-demo-warning");
});

test("requires the core manual-entry fields", () => {
  const result = validateRecordDraft(validDraft({
    serviceDate: "",
    odometerKm: "-1",
    summary: "",
    symptoms: "",
  }));
  assert.equal(result.valid, false);
  assert.equal(result.errors.serviceDate, "required");
  assert.equal(result.errors.odometerKm, "invalid");
  assert.equal(result.errors.summary, "required");
});

test("allows a maintenance record when the historical odometer is unknown", () => {
  const original = cloneDemoData();
  const currentReading = structuredClone(original.vehicles[0]!.currentOdometerReading);
  const result = applyRecordDraftToData(original, validDraft({
    odometerKm: "",
    evidenceBasis: "recalled_later",
  }));

  assert.equal(result.record.odometerReading, undefined);
  assert.equal(result.record.odometerKm, undefined);
  assert.deepEqual(result.data.vehicles[0]?.currentOdometerReading, currentReading);
});

test("adds an older maintenance event to a currently owned vehicle", () => {
  const original = cloneDemoData();
  assert.equal(original.vehicles[0]?.ownershipType, "owned");
  const result = applyRecordDraftToData(original, validDraft({
    serviceDate: "2018-04-21",
    odometerKm: "",
    evidenceBasis: "invoice_or_receipt",
  }));

  assert.equal(result.record.vehicleId, original.vehicles[0]?.id);
  assert.equal(result.record.serviceDate, "2018-04-21");
  assert.equal(result.record.evidenceBasis, "invoice_or_receipt");
});

test("still requires a reading when recording a meter change", () => {
  const result = validateRecordDraft(validDraft({
    odometerKm: "",
    odometerChangeReason: "replacement",
  }));

  assert.equal(result.valid, false);
  assert.equal(result.errors.odometerKm, "invalid");
});

test("keeps multiple actions under one maintenance visit", () => {
  const result = applyRecordDraftToData(cloneDemoData(), validDraft({
    summary: "DEMO: 車検と複数作業",
    resolutionStatus: "resolved",
    additionalActions: [{
      clientId: "additional-1",
      summary: "DEMO: 追加作業",
      causeCandidates: "未確認",
      checksPerformed: "DEMO",
      workPerformed: "DEMO",
      partName: "",
      partManufacturer: "",
      partNumber: "",
      result: "未解決",
      resolutionStatus: "unresolved",
      hazardLevel: "CRITICAL",
    }],
  }));

  assert.equal(result.record.actions.length, 2);
  assert.equal(result.record.resolutionStatus, "unresolved");
  assert.equal(result.record.hazardLevel, "CRITICAL");
});

test("accepts repeated meter replacements without a count limit", () => {
  let data = cloneDemoData();
  for (const [index, displayedValue] of [5000, 1200, 300].entries()) {
    const applied = applyRecordDraftToData(data, validDraft({
      serviceDate: `2026-0${index + 7}-14`,
      odometerKm: String(displayedValue),
      summary: `DEMO: メーター交換 ${index + 1}`,
      odometerEpisodeId: data.vehicles[0]!.currentOdometerReading.episodeId,
      odometerChangeReason: "replacement",
    }));
    data = applied.data;
  }

  assert.equal(data.vehicles[0]?.odometerEpisodes.length, 7);
  assert.equal(data.vehicles[0]?.currentOdometerReading.displayedValue, 300);
});

test("editing a saved meter-change record does not create another episode", () => {
  const created = applyRecordDraftToData(cloneDemoData(), validDraft({
    odometerKm: "250",
    odometerChangeReason: "replacement",
  }));
  const episodeCount = created.data.vehicles[0]?.odometerEpisodes.length;
  const edited = applyRecordDraftToData(
    created.data,
    validDraft({
      summary: "DEMO: 編集済みのメーター交換記録",
      odometerKm: "260",
      odometerEpisodeId: created.record.odometerReading!.episodeId,
      odometerChangeReason: "replacement",
    }),
    created.record.id,
  );

  assert.equal(edited.data.vehicles[0]?.odometerEpisodes.length, episodeCount);
  assert.equal(edited.record.odometerReading!.episodeId, created.record.odometerReading!.episodeId);
});

test("flags a lower reading in the same meter episode for context, not rejection", () => {
  const data = cloneDemoData();
  const result = applyRecordDraftToData(data, validDraft({
    odometerKm: "100",
    odometerEpisodeId: "episode-demo-4",
    odometerChangeReason: "same_episode",
  }));

  assert.equal(result.record.odometerReading!.sequenceAssessment, "needs_context");
});

test("migrates legacy local data into actions and an odometer episode", () => {
  const legacy = cloneDemoData() as unknown as Record<string, unknown>;
  delete legacy.schemaVersion;
  const vehicles = legacy.vehicles as Array<Record<string, unknown>>;
  const records = legacy.records as Array<Record<string, unknown>>;
  const journals = legacy.journals as Array<Record<string, unknown>>;
  delete vehicles[0]?.odometerEpisodes;
  delete vehicles[0]?.currentOdometerReading;
  delete vehicles[0]?.ownerProfileId;
  delete vehicles[0]?.ownershipType;
  delete vehicles[0]?.ownershipStartedYear;
  delete vehicles[0]?.ownershipStartedMonth;
  delete records[0]?.actions;
  delete records[0]?.odometerReading;
  delete journals[0]?.media;
  delete journals[0]?.contentBlocks;

  const migrated = migrateAppData(legacy);
  assert.equal(migrated?.schemaVersion, 10);
  assert.deepEqual(migrated?.contentReports, []);
  assert.equal(
    migrated?.profiles.find((profile) => profile.id === "profile-demo-luca")?.visibility,
    "public",
  );
  assert.equal(migrated?.vehicles[0]?.ownerProfileId, "profile-demo-current");
  assert.equal(migrated?.vehicles[0]?.ownershipType, "owned");
  assert.equal(migrated?.vehicles[0]?.vehicleCategory, "car");
  assert.equal(migrated?.records[0]?.evidenceBasis, "unknown");
  assert.equal(migrated?.vehicles[0]?.ownershipStartedYear, 2014);
  assert.equal(migrated?.vehicles[0]?.ownershipStartedMonth, 4);
  assert.equal(migrated?.vehicles[0]?.odometerEpisodes.length, 1);
  assert.equal(migrated?.records[0]?.actions.length, 1);
  assert.ok(migrated?.profiles.length);
  assert.ok(migrated?.journals.length);
  assert.deepEqual(migrated?.journals[0]?.media, []);
  assert.equal(migrated?.journals[0]?.contentBlocks[0]?.type, "text");
  assert.equal(migrated?.journals[1]?.media[0]?.source, "demo_asset");
  assert.deepEqual(migrated?.profileSafetyRelations, []);
});
