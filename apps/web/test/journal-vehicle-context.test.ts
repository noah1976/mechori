import assert from "node:assert/strict";
import test from "node:test";
import type { GarageJournalPost } from "@mechori/core";
import { journalVehicleDestination } from "../lib/journal-vehicle-context.ts";

function journal(
  patch: Partial<GarageJournalPost>,
): GarageJournalPost {
  return patch as GarageJournalPost;
}

test("an owned vehicle opens the selected Garage without using the removed path route", () => {
  assert.deepEqual(
    journalVehicleDestination({
      journal: journal({ vehicleId: "vehicle / one", vehicleTargetId: "raw-private-id" }),
      ownedVehicleIds: new Set(["vehicle / one"]),
      ownerGarageHref: "/profile/owner",
    }),
    { href: "/garage?vehicle=vehicle%20%2F%20one", kind: "garage" },
  );
});

test("another vehicle uses only a valid published share slug", () => {
  assert.deepEqual(
    journalVehicleDestination({
      journal: journal({ vehicleTargetId: "0123456789abcdef01234567" }),
      ownedVehicleIds: new Set(),
      ownerGarageHref: "/profile/owner",
    }),
    { href: "/v/0123456789abcdef01234567", kind: "public_vehicle" },
  );
});

test("an unpublished or opaque vehicle target falls back to the visible owner Garage", () => {
  assert.deepEqual(
    journalVehicleDestination({
      journal: journal({ vehicleId: "another-users-private-id", vehicleTargetId: "not-a-share" }),
      ownedVehicleIds: new Set(),
      ownerGarageHref: "/profile/visible-owner",
    }),
    { href: "/profile/visible-owner", kind: "owner_garage" },
  );
  assert.equal(
    journalVehicleDestination({
      journal: journal({ vehicleTargetId: "not-a-share" }),
      ownedVehicleIds: new Set(),
    }),
    undefined,
  );
});
