import assert from "node:assert/strict";
import test from "node:test";

import {
  addVehicleToData,
  canonicalizeLegacyModelTargetId,
  canonicalModelTargetId,
  cloneDemoData,
  createEmptyVehicleDraft,
  displayVehicleModel,
  migrateAppData,
  normalizeVehicle,
  relatedVehicleIdentities,
  resolveVehicleIdentity,
} from "../src/index.ts";

test("standardizes a Japanese make alias while preserving the owner input", () => {
  const vehicle = addVehicleToData(cloneDemoData(), {
    ...createEmptyVehicleDraft(),
    make: "フィアット",
    model: "バルケッタ",
  }).vehicle;

  assert.equal(vehicle.make, "FIAT");
  assert.equal(vehicle.makeInput, "フィアット");
  assert.equal(vehicle.modelInput, "バルケッタ");
  assert.equal(vehicle.brandId, "fiat");
  assert.equal(vehicle.modelFamilyId, "fiat-barchetta");
  assert.equal(vehicle.identityMatchStatus, "matched_alias");
  assert.equal(displayVehicleModel(vehicle, "ja"), "バルケッタ");
  assert.equal(displayVehicleModel(vehicle, "en"), "Barchetta");
});

test("links Vitz and Yaris to one family without erasing their market names", () => {
  const vitz = resolveVehicleIdentity("トヨタ", "ヴィッツ");
  const yaris = resolveVehicleIdentity("TOYOTA", "YARIS");

  assert.equal(vitz.canonicalMake, "TOYOTA");
  assert.equal(vitz.modelFamilyId, "toyota-yaris-vitz");
  assert.equal(yaris.modelFamilyId, vitz.modelFamilyId);
  assert.notEqual(vitz.marketNameId, yaris.marketNameId);
  assert.equal(vitz.marketRegion, "JP");
  assert.equal(canonicalModelTargetId({
    make: vitz.canonicalMake,
    model: vitz.modelInput,
    modelFamilyId: vitz.modelFamilyId,
  }), "model-family:toyota-yaris-vitz");
});

test("keeps cross-brand X1/9 names distinct while linking their family", () => {
  const fiat = resolveVehicleIdentity("FIAT", "X1/9");
  const bertone = resolveVehicleIdentity("ベルトーネ", "X1/9");

  assert.equal(fiat.modelFamilyId, "fiat-x1-9");
  assert.equal(bertone.modelFamilyId, fiat.modelFamilyId);
  assert.notEqual(bertone.marketNameId, fiat.marketNameId);
  assert.deepEqual(relatedVehicleIdentities(fiat.marketNameId, "ja"), [{
    marketNameId: "bertone-x1-9-global",
    modelFamilyId: "fiat-x1-9",
    canonicalMake: "BERTONE",
    model: "X1/9",
    relationType: "brand_transition",
  }]);
});

test("repairs an earlier cross-brand market id without replacing the vehicle", () => {
  const vehicle = addVehicleToData(cloneDemoData(), {
    ...createEmptyVehicleDraft(),
    make: "BERTONE",
    model: "X1/9",
  }).vehicle;
  const normalized = normalizeVehicle({
    ...vehicle,
    marketNameId: "fiat-x1-9-global",
  });

  assert.equal(normalized.id, vehicle.id);
  assert.equal(normalized.marketNameId, "bertone-x1-9-global");
  assert.equal(normalized.modelFamilyId, "fiat-x1-9");
});

test("links market badges and OEM sister cars without erasing their brands", () => {
  const speedster = resolveVehicleIdentity("OPEL", "Speedster");
  const vx220 = resolveVehicleIdentity("VAUXHALL", "VX220");
  const az1 = resolveVehicleIdentity("MAZDA", "AZ-1");
  const cara = resolveVehicleIdentity("SUZUKI", "キャラ");

  assert.equal(speedster.modelFamilyId, vx220.modelFamilyId);
  assert.equal(az1.modelFamilyId, cara.modelFamilyId);
  assert.equal(
    relatedVehicleIdentities(az1.marketNameId, "en")[0]?.relationType,
    "oem_rebadge",
  );
});

test("keeps Seven continuations and derivatives in separate model families", () => {
  const lotus = resolveVehicleIdentity("LOTUS", "Seven");
  const caterham = resolveVehicleIdentity("CATERHAM", "7");
  const birkin = resolveVehicleIdentity("BIRKIN", "S3");
  const related = relatedVehicleIdentities(lotus.marketNameId, "en");

  assert.notEqual(lotus.modelFamilyId, caterham.modelFamilyId);
  assert.notEqual(lotus.modelFamilyId, birkin.modelFamilyId);
  assert.deepEqual(
    related.map((item) => item.relationType),
    ["licensed_continuation", "inspired_derivative"],
  );
});

test("keeps an unknown non-Latin make registerable and marks it unmatched", () => {
  const identity = resolveVehicleIdentity("未登録メーカー", "試作車");
  assert.equal(identity.canonicalMake, "未登録メーカー");
  assert.equal(identity.matchStatus, "unmatched");
  assert.equal(identity.modelFamilyId, undefined);
});

test("uppercases an unknown Latin make without pretending it has a catalog match", () => {
  const identity = resolveVehicleIdentity("Example Motors", "Roadster");
  assert.equal(identity.canonicalMake, "EXAMPLE MOTORS");
  assert.equal(identity.matchStatus, "unmatched");
});

test("keeps official Latin diacritics while uppercasing an unknown make", () => {
  const identity = resolveVehicleIdentity("Citroën", "Saxo");

  assert.equal(identity.canonicalMake, "CITROËN");
  assert.equal(identity.matchStatus, "unmatched");
});

test("migrates a known legacy model follow target to its family id", () => {
  assert.equal(
    canonicalizeLegacyModelTargetId("model:fiat:barchetta"),
    "model-family:fiat-barchetta",
  );
  assert.equal(
    canonicalizeLegacyModelTargetId("model:unknown:prototype"),
    "model:unknown:prototype",
  );
});

test("enriches a legacy Japanese vehicle and keeps journals and follows connected", () => {
  const legacy = structuredClone(cloneDemoData()) as unknown as {
    schemaVersion: number;
    vehicles: Array<Record<string, unknown>>;
    journals: Array<Record<string, unknown>>;
    follows: Array<Record<string, unknown>>;
    records: unknown[];
  };
  legacy.schemaVersion = 9;
  legacy.vehicles[0]!.make = "フィアット";
  legacy.vehicles[0]!.model = "バルケッタ";
  for (const key of [
    "makeInput",
    "modelInput",
    "brandId",
    "modelFamilyId",
    "marketNameId",
    "marketRegion",
    "identityMatchStatus",
  ]) delete legacy.vehicles[0]![key];
  legacy.journals[0]!.modelTargetId = "model:fiat:barchetta";
  const modelFollow = legacy.follows.find((follow) => follow.targetType === "model");
  assert.ok(modelFollow);
  modelFollow.targetId = "model:fiat:barchetta";

  const migrated = migrateAppData(legacy);
  assert.ok(migrated);
  assert.equal(migrated.schemaVersion, 10);
  assert.equal(migrated.vehicles[0]?.make, "FIAT");
  assert.equal(migrated.vehicles[0]?.makeInput, "フィアット");
  assert.equal(migrated.vehicles[0]?.modelFamilyId, "fiat-barchetta");
  assert.equal(migrated.journals[0]?.modelTargetId, "model-family:fiat-barchetta");
  assert.equal(
    migrated.follows.find((follow) => follow.targetType === "model")?.targetId,
    "model-family:fiat-barchetta",
  );
});
