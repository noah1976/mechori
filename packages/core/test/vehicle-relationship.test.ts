import assert from "node:assert/strict";
import test from "node:test";

import {
  cloneDemoData,
  formatOwnershipDuration,
  summarizeVehicleRelationship,
} from "../src/index.ts";

test("summarizes vehicle age and owner relationship without using odometer data", () => {
  const vehicle = cloneDemoData().vehicles[0]!;
  const snapshot = summarizeVehicleRelationship(
    vehicle,
    new Date("2026-07-16T00:00:00.000Z"),
  );

  assert.equal(snapshot.vehicleAgeYears, 29);
  assert.equal(snapshot.ownershipYears, 12);
  assert.equal(snapshot.ownershipMonths, 3);
  assert.equal(snapshot.ownershipMilestoneYears, 10);
  assert.equal(formatOwnershipDuration("ja", snapshot), "12年3か月");
});

test("treats a year-only ownership start as approximate", () => {
  const vehicle = {
    ...cloneDemoData().vehicles[0]!,
    ownershipStartedYear: 2020,
    ownershipStartedMonth: undefined,
  };
  const snapshot = summarizeVehicleRelationship(
    vehicle,
    new Date("2026-07-16T00:00:00.000Z"),
  );

  assert.equal(snapshot.ownershipIsApproximate, true);
  assert.match(formatOwnershipDuration("en", snapshot) ?? "", /^About /);
});
