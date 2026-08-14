import assert from "node:assert/strict";
import test from "node:test";
import {
  applyDiscoveryOwnerFollowResult,
  applyDiscoveryVehicleFollowResult,
  matchesPublicVehicleDiscovery,
  normalizeDiscoveryQuery,
} from "../lib/discovery-search-state.ts";

test("normalizes a bounded public discovery query", () => {
  assert.equal(normalizeDiscoveryQuery("  FIAT  "), "fiat");
  assert.equal(normalizeDiscoveryQuery("バルケッタ"), "バルケッタ");
  assert.equal(normalizeDiscoveryQuery(" "), "");
});

test("matches active alpha discovery vehicles by stored make, model, nickname, year, or owner", () => {
  const barchetta = {
    make: "FIAT",
    model: "Barchetta",
    nickname: undefined,
    modelYear: 1997,
    ownerDisplayName: "Noah",
    ownerPublicUsername: "noah-garage",
    isPublic: true,
  };
  const cub = {
    make: "Honda",
    model: "スーパーカブ110/JA59",
    nickname: undefined,
    modelYear: 2024,
    ownerDisplayName: "Mika",
    ownerPublicUsername: "mika",
    isPublic: true,
  };

  assert.equal(matchesPublicVehicleDiscovery(barchetta, "fiat"), true);
  assert.equal(matchesPublicVehicleDiscovery(barchetta, "barchetta"), true);
  assert.equal(matchesPublicVehicleDiscovery(barchetta, "バルケッタ"), false);
  assert.equal(matchesPublicVehicleDiscovery(barchetta, "1997"), true);
  assert.equal(matchesPublicVehicleDiscovery(barchetta, "noah"), true);
  assert.equal(matchesPublicVehicleDiscovery(cub, "カブ"), true);
  assert.equal(matchesPublicVehicleDiscovery({ ...barchetta, isPublic: false }, "fiat"), false);
});

test("person follow result rederives mutual state without changing other people", () => {
  const owners = [
    { id: "owner-a", viewerFollowsTarget: true, targetFollowsViewer: true, relationship: "mutual" as const },
    { id: "owner-b", viewerFollowsTarget: false, targetFollowsViewer: false, relationship: "followed_by" as const },
  ];

  const unfollowed = applyDiscoveryOwnerFollowResult(owners, "owner-a", {
    ok: true,
    isFollowing: false,
  });

  assert.equal(unfollowed[0]?.relationship, "followed_by");
  assert.equal(unfollowed[0]?.viewerFollowsTarget, false);
  assert.deepEqual(unfollowed[1], owners[1]);
  assert.strictEqual(
    applyDiscoveryOwnerFollowResult(owners, "owner-a", { ok: false }),
    owners,
  );
});

test("vehicle follow result changes only the targeted vehicle and remains independent from owner state", () => {
  const vehicles = [
    { targetId: "vehicle-a", viewerFollowsVehicle: false, ownerFollows: false },
    { targetId: "vehicle-b", viewerFollowsVehicle: true, ownerFollows: true },
  ];

  const followed = applyDiscoveryVehicleFollowResult(vehicles, "vehicle-a", {
    ok: true,
    isFollowing: true,
  });

  assert.equal(followed[0]?.viewerFollowsVehicle, true);
  assert.equal(followed[0]?.ownerFollows, false);
  assert.deepEqual(followed[1], vehicles[1]);
  assert.strictEqual(
    applyDiscoveryVehicleFollowResult(vehicles, "vehicle-a", { ok: false }),
    vehicles,
  );
});
