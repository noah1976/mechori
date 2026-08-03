import assert from "node:assert/strict";
import test from "node:test";

import {
  cloneDemoData,
  formatOwnershipDuration,
  formatOwnershipPeriod,
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

test("formats exact ownership start dates without dropping the day", () => {
  const vehicle = {
    ...cloneDemoData().vehicles[0]!,
    ownershipStartedYear: 2014,
    ownershipStartedMonth: 4,
    ownershipStartedDay: 12,
    ownershipStartedPrecision: "day" as const,
  };

  assert.equal(formatOwnershipPeriod(vehicle, "ja"), "2014年4月12日から所有中");
  assert.equal(formatOwnershipPeriod(vehicle, "en"), "Owned since Apr 12, 2014");
});

test("formats partial previous ownership dates without inventing exact dates", () => {
  const vehicle = {
    ...cloneDemoData().vehicles[0]!,
    ownershipType: "previously_owned" as const,
    ownershipStartedYear: 2003,
    ownershipStartedMonth: undefined,
    ownershipEndedYear: 2007,
    ownershipEndedMonth: undefined,
  };

  assert.equal(formatOwnershipPeriod(vehicle, "ja"), "2003年〜2007年に所有");
  assert.equal(formatOwnershipPeriod({
    ...vehicle,
    ownershipStartedYear: undefined,
    ownershipEndedYear: undefined,
  }, "ja"), "所有時期不明");
});

test("does not calculate previous ownership through today when the end is unknown", () => {
  const vehicle = {
    ...cloneDemoData().vehicles[0]!,
    ownershipType: "previously_owned" as const,
    ownershipStartedYear: 1998,
    ownershipEndedYear: undefined,
    ownershipEndedMonth: undefined,
  };

  const snapshot = summarizeVehicleRelationship(vehicle, new Date("2026-07-18T00:00:00.000Z"));
  assert.equal(snapshot.ownershipYears, undefined);
});

test("uses an owner-entered approximate period note verbatim", () => {
  const vehicle = {
    ...cloneDemoData().vehicles[0]!,
    ownershipType: "previously_owned" as const,
    ownershipPeriodNote: "1990年代後半に所有",
  };
  assert.equal(formatOwnershipPeriod(vehicle, "ja"), "1990年代後半に所有");
});
