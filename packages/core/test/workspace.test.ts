import assert from "node:assert/strict";
import test from "node:test";
import {
  addJournalToData,
  addVehicleToData,
  applyRecordDraftToData,
  createEmptyAppData,
  createEmptyVehicleDraft,
  migrateAppData,
} from "../src/index.ts";

test("creates a private empty workspace for a newly invited tester", () => {
  const data = createEmptyAppData("tester-001");

  assert.equal(data.currentProfileId, "tester-001");
  assert.deepEqual(data.vehicles, []);
  assert.deepEqual(data.records, []);
  assert.deepEqual(data.contentTranslations, []);
  assert.deepEqual(data.profiles, [
    {
      id: "tester-001",
      displayName: "MECHORI User",
      role: "owner",
      bio: "",
      visibility: "private",
      displayFields: [],
      isProfessional: false,
      isDemo: false,
    },
  ]);
});

test("requires a profile id and does not retain blank display names", () => {
  assert.throws(() => createEmptyAppData(" "), /profile_id_required/);
  assert.equal(createEmptyAppData("tester-001", " ").profiles[0]?.displayName, "MECHORI User");
});

test("round-trips a tester vehicle and maintenance record through workspace JSON", () => {
  const empty = createEmptyAppData("tester-001");
  const vehicleResult = addVehicleToData(
    empty,
    {
      ...createEmptyVehicleDraft(),
      make: "MG",
      model: "MGB",
      year: "1972",
      odometer: "54000",
    },
    "2026-07-17T12:00:00.000Z",
  );
  const recordResult = applyRecordDraftToData(
    vehicleResult.data,
    {
      serviceDate: "2026-07-17",
      serviceDatePrecision: "day",
      servicePeriodNote: "",
      odometerKm: "54000",
      odometerUnit: "km",
      odometerEpisodeId: vehicleResult.vehicle.currentOdometerReading.episodeId,
      odometerChangeReason: "same_episode",
      summary: "Owner-entered service note",
      symptoms: "No symptom; scheduled service",
      causeCandidates: "",
      checksPerformed: "Invoice reviewed",
      workPerformed: "Recorded from the invoice",
      partName: "",
      partManufacturer: "",
      partNumber: "",
      cost: "12000",
      resolutionStatus: "resolved",
      hazardLevel: "LOW",
      evidenceBasis: "invoice_or_receipt",
      additionalActions: [],
      serviceAttribution: { version: 1, performedByType: "unknown" },
      requestSharing: false,
    },
    undefined,
    "en",
    vehicleResult.vehicle.id,
  );

  const journalResult = addJournalToData(recordResult.data, {
    title: "An older drive",
    eventType: "drive",
    occurredOn: "2008-09-14",
    bodyOriginal: "Remembered and added later",
    vehicleId: vehicleResult.vehicle.id,
    linkedRecordId: "",
    displayFields: [],
    media: [],
    contentBlocks: [{ id: "older-drive-text", type: "text", style: "paragraph", text: "Remembered and added later" }],
    visibility: "private",
    knowledgeExtractionConsent: false,
  }, "en", "2026-07-18T12:00:00.000Z");

  const restored = migrateAppData(JSON.parse(JSON.stringify(journalResult.data)));
  assert.equal(restored?.currentProfileId, "tester-001");
  assert.equal(restored?.vehicles[0]?.model, "MGB");
  assert.equal(restored?.records[0]?.summary, "Owner-entered service note");
  assert.equal(restored?.records[0]?.visibility, "private");
  assert.equal(restored?.journals[0]?.occurredOn, "2008-09-14");
  assert.equal(restored?.journals[0]?.createdAt, "2026-07-18T12:00:00.000Z");
});
