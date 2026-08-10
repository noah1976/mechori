import assert from "node:assert/strict";
import test from "node:test";
import {
  applyConnectionFollowResult,
  canLoadAlphaConnections,
  connectionCollectionState,
  connectionProfileHref,
  deriveConnectionRelationship,
  removeVehicleAfterUnfollow,
} from "../lib/connections-state.ts";

test("derives relationship state from both follow directions", () => {
  assert.equal(deriveConnectionRelationship(true, true), "mutual");
  assert.equal(deriveConnectionRelationship(true, false), "following");
  assert.equal(deriveConnectionRelationship(false, true), "followed_by");
});

test("connection routes keep public profile identifiers encoded", () => {
  assert.equal(connectionProfileHref("profile id"), "/profile/profile%20id");
});

test("connection collection keeps loading, error, and confirmed empty separate", () => {
  assert.equal(connectionCollectionState(true, false, []), "loading");
  assert.equal(connectionCollectionState(false, true, []), "error");
  assert.equal(connectionCollectionState(false, false, []), "empty");
  assert.equal(connectionCollectionState(false, false, ["owner"]), "ready");
});

test("connections only load for an authenticated Alpha participant", () => {
  assert.equal(canLoadAlphaConnections(true, true), true);
  assert.equal(canLoadAlphaConnections(false, true), false);
  assert.equal(canLoadAlphaConnections(true, false), false);
});

test("person follow results update only successful actions and rederive mutual state", () => {
  const people = [{ id: "owner-a", viewerFollowsTarget: false, targetFollowsViewer: true, relationship: "followed_by" as const }];
  const failed = applyConnectionFollowResult(people, "owner-a", { ok: false });
  assert.strictEqual(failed, people);

  const followed = applyConnectionFollowResult(people, "owner-a", { ok: true, isFollowing: true });
  const updated = followed[0];
  assert.ok(updated);
  assert.equal(updated.viewerFollowsTarget, true);
  assert.equal(updated.relationship, "mutual");
});

test("vehicle rows leave failed actions intact and remove only confirmed unfollows", () => {
  const vehicles = [{ targetId: "vehicle-a" }, { targetId: "vehicle-b" }];
  assert.strictEqual(removeVehicleAfterUnfollow(vehicles, "vehicle-a", { ok: false }), vehicles);
  assert.strictEqual(removeVehicleAfterUnfollow(vehicles, "vehicle-a", { ok: true, isFollowing: true }), vehicles);
  assert.deepEqual(removeVehicleAfterUnfollow(vehicles, "vehicle-a", { ok: true, isFollowing: false }), [{ targetId: "vehicle-b" }]);
});
