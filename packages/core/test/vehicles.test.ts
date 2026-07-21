import assert from "node:assert/strict";
import test from "node:test";

import {
  addVehicleToData,
  cloneDemoData,
  createEmptyVehicleDraft,
  groupVehiclesByOwnership,
  getPreferredVehicle,
  migrateAppData,
  updateVehicleOwnershipInData,
  validateVehicleDraft,
} from "../src/index.ts";

test("accepts an owner-entered make and model without a vehicle master", () => {
  const draft = {
    ...createEmptyVehicleDraft(),
    make: "Bertone",
    model: "X1/9",
    year: "1985",
    ownershipStartedYear: "2024",
  };

  const result = addVehicleToData(
    cloneDemoData(),
    draft,
    "2026-07-17T00:00:00.000Z",
  );

  assert.equal(result.vehicle.make, "BERTONE");
  assert.equal(result.vehicle.makeInput, "Bertone");
  assert.equal(result.vehicle.model, "X1/9");
  assert.equal(result.vehicle.modelFamilyId, "fiat-x1-9");
  assert.equal(result.vehicle.year, 1985);
  assert.equal(result.data.vehicles[0]?.id, result.vehicle.id);
  assert.equal(result.vehicle.isDemo, false);
});

test("keeps the prepared main photo and optional owner note on the vehicle", () => {
  const draft = {
    ...createEmptyVehicleDraft(),
    imagePath: "data:image/webp;base64,alpha-photo",
    make: "FIAT",
    model: "Barchetta",
    ownerComment: "この先も長く走りたい。",
  };

  const vehicle = addVehicleToData(cloneDemoData(), draft).vehicle;
  assert.equal(vehicle.imagePath, draft.imagePath);
  assert.equal(vehicle.ownerComment, draft.ownerComment);
});

test("allows registration before the exact model year is known", () => {
  const draft = {
    ...createEmptyVehicleDraft(),
    make: "MG",
    model: "MGB Roadster",
  };

  assert.equal(validateVehicleDraft(draft).valid, true);
  assert.equal(addVehicleToData(cloneDemoData(), draft).vehicle.year, undefined);
});

test("requires make and model and rejects implausible years", () => {
  const draft = {
    ...createEmptyVehicleDraft(),
    year: "1800",
  };
  const validation = validateVehicleDraft(draft, 2026);

  assert.equal(validation.valid, false);
  assert.equal(validation.errors.make, "required");
  assert.equal(validation.errors.model, "required");
  assert.equal(validation.errors.year, "invalid");
});

test("registers a previous car without a photo, model year, or ownership dates", () => {
  const draft = {
    ...createEmptyVehicleDraft(),
    ownershipType: "previously_owned" as const,
    odometerContext: "at_ownership_end" as const,
    make: "Alfa Romeo",
    model: "145",
  };

  const vehicle = addVehicleToData(cloneDemoData(), draft).vehicle;
  assert.equal(vehicle.vehicleCategory, "car");
  assert.equal(vehicle.ownershipType, "previously_owned");
  assert.equal(vehicle.imagePath, undefined);
  assert.equal(vehicle.year, undefined);
  assert.equal(vehicle.ownershipStartedYear, undefined);
  assert.equal(vehicle.ownershipEndedYear, undefined);
});

test("registers an owner-entered motorcycle without a vehicle master", () => {
  const draft = {
    ...createEmptyVehicleDraft(),
    vehicleCategory: "motorcycle" as const,
    ownershipType: "previously_owned" as const,
    make: "Vespa",
    model: "150 Sprint",
  };

  const vehicle = addVehicleToData(cloneDemoData(), draft).vehicle;
  assert.equal(vehicle.vehicleCategory, "motorcycle");
  assert.equal(vehicle.make, "VESPA");
  assert.equal(vehicle.model, "150 Sprint");
});

test("keeps a current vehicle as the default after a previous vehicle is added", () => {
  const data = cloneDemoData();
  const previous = addVehicleToData(data, {
    ...createEmptyVehicleDraft(),
    ownershipType: "previously_owned",
    make: "MG",
    model: "MGB",
  }).data;

  assert.equal(getPreferredVehicle(previous.vehicles)?.id, "vehicle-demo-barchetta");
});

test("moves a vehicle between current and previous groups without losing records or media", () => {
  const original = cloneDemoData();
  const vehicleId = original.vehicles[0]!.id;
  const originalRecords = structuredClone(original.records);
  const originalImage = original.vehicles[0]!.imagePath;

  const ended = updateVehicleOwnershipInData(original, vehicleId, {
    ownershipType: "previously_owned",
    ownershipEndedYear: 2024,
    ownershipPeriodNote: "2001年ごろから2024年まで所有",
    dispositionReason: "Owner-entered note",
  });
  assert.equal(groupVehiclesByOwnership(ended.data.vehicles).previous[0]?.id, vehicleId);
  assert.equal(ended.vehicle.imagePath, originalImage);
  assert.deepEqual(ended.data.records, originalRecords);

  const restored = updateVehicleOwnershipInData(ended.data, vehicleId, {
    ownershipType: "owned",
  });
  assert.equal(groupVehiclesByOwnership(restored.data.vehicles).current[0]?.id, vehicleId);
  assert.equal(restored.vehicle.ownershipEndedYear, undefined);
  assert.equal(restored.vehicle.ownershipPeriodNote, undefined);
  assert.equal(restored.vehicle.dispositionReason, undefined);
  assert.deepEqual(restored.data.records, originalRecords);
});

test("does not allow the current profile to change another owner's vehicle", () => {
  const data = cloneDemoData();
  data.currentProfileId = "profile-someone-else";
  assert.throws(
    () => updateVehicleOwnershipInData(data, data.vehicles[0]!.id, {
      ownershipType: "previously_owned",
    }),
    /vehicle_not_owned_by_current_profile/,
  );
});

test("migrates an existing vehicle to a current car without hiding it", () => {
  const legacy = cloneDemoData() as unknown as Record<string, unknown>;
  legacy.schemaVersion = 8;
  const vehicles = legacy.vehicles as Array<Record<string, unknown>>;
  delete vehicles[0]?.vehicleCategory;
  delete vehicles[0]?.ownershipType;
  delete vehicles[0]?.odometerContext;

  const migrated = migrateAppData(legacy);
  assert.equal(migrated?.schemaVersion, 10);
  assert.equal(migrated?.vehicles[0]?.vehicleCategory, "car");
  assert.equal(migrated?.vehicles[0]?.ownershipType, "owned");
  assert.equal(groupVehiclesByOwnership(migrated?.vehicles ?? []).current.length, 1);
});
