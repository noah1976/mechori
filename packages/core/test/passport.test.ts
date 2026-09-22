import assert from "node:assert/strict";
import test from "node:test";
import {
  addVehicleToData,
  createEmptyAppData,
  createEmptyVehicleDraft,
  createVehiclePassportDraft,
  migrateAppData,
  setVehiclePassportShareInData,
  upsertVehiclePassportInData,
} from "../src/index.ts";

function workspaceWithVehicle() {
  return addVehicleToData(createEmptyAppData("owner-1"), {
    ...createEmptyVehicleDraft(),
    make: "FIAT",
    model: "Barchetta",
  }, "2026-09-17T00:00:00.000Z");
}

test("passport accepts empty optional fields and survives workspace migration", () => {
  const vehicleResult = workspaceWithVehicle();
  const draft = createVehiclePassportDraft(vehicleResult.vehicle.id);
  const result = upsertVehiclePassportInData(
    vehicleResult.data,
    draft,
    "2026-09-17T01:00:00.000Z",
  );
  const restored = migrateAppData(JSON.parse(JSON.stringify(result.data)));

  assert.equal(result.passport.vehicleId, vehicleResult.vehicle.id);
  assert.equal(result.passport.modifications, undefined);
  assert.equal(restored?.vehiclePassports?.[0]?.vehicleId, vehicleResult.vehicle.id);
});

test("passport updates retain creation time and normalize optional text", () => {
  const vehicleResult = workspaceWithVehicle();
  const first = upsertVehiclePassportInData(vehicleResult.data, {
    ...createVehiclePassportDraft(vehicleResult.vehicle.id),
    workshopConcerns: "  低速で少し異音  ",
  }, "2026-09-17T01:00:00.000Z");
  const second = upsertVehiclePassportInData(first.data, {
    ...createVehiclePassportDraft(vehicleResult.vehicle.id, first.passport),
    odometerValue: "86420",
  }, "2026-09-17T02:00:00.000Z");

  assert.equal(first.passport.workshopConcerns, "低速で少し異音");
  assert.equal(second.passport.odometerValue, 86420);
  assert.equal(second.passport.createdAt, "2026-09-17T01:00:00.000Z");
  assert.equal(second.passport.updatedAt, "2026-09-17T02:00:00.000Z");
});

test("passport sharing metadata is revocable without removing private content", () => {
  const vehicleResult = workspaceWithVehicle();
  const saved = upsertVehiclePassportInData(vehicleResult.data, {
    ...createVehiclePassportDraft(vehicleResult.vehicle.id),
    recentMaintenance: "バッテリー交換済み",
  });
  const shared = setVehiclePassportShareInData(saved.data, vehicleResult.vehicle.id, "token", true);
  const updated = upsertVehiclePassportInData(shared, {
    ...createVehiclePassportDraft(vehicleResult.vehicle.id, shared.vehiclePassports?.[0]),
    recentMaintenance: "バッテリー交換済み",
  });
  const revoked = setVehiclePassportShareInData(updated.data, vehicleResult.vehicle.id);

  assert.equal(shared.vehiclePassports?.[0]?.shareToken, "token");
  assert.equal(shared.vehiclePassports?.[0]?.historyShareEnabled, true);
  assert.equal(updated.passport.historyShareEnabled, true);
  assert.equal(revoked.vehiclePassports?.[0]?.shareToken, undefined);
  assert.equal(revoked.vehiclePassports?.[0]?.historyShareEnabled, undefined);
  assert.equal(revoked.vehiclePassports?.[0]?.recentMaintenance, "バッテリー交換済み");
});

test("passport rejects invalid mileage and unknown vehicles", () => {
  const data = createEmptyAppData("owner-1");
  assert.throws(() => upsertVehiclePassportInData(data, {
    ...createVehiclePassportDraft("missing"),
    odometerValue: "-1",
  }), /passport_vehicle_not_found/);

  const vehicleResult = workspaceWithVehicle();
  assert.throws(() => upsertVehiclePassportInData(vehicleResult.data, {
    ...createVehiclePassportDraft(vehicleResult.vehicle.id),
    odometerValue: "-1",
  }), /passport_odometer_invalid/);
});
