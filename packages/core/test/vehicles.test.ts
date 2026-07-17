import assert from "node:assert/strict";
import test from "node:test";

import {
  addVehicleToData,
  cloneDemoData,
  createEmptyVehicleDraft,
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

  assert.equal(result.vehicle.make, "Bertone");
  assert.equal(result.vehicle.model, "X1/9");
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
