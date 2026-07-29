import assert from "node:assert/strict";
import test from "node:test";

import {
  addVehicleToData,
  canonicalizeLegacyModelTargetId,
  canonicalModelTargetId,
  cloneDemoData,
  compareVehicleApplicability,
  createEmptyVehicleDraft,
  displayVehicleModel,
  displayVehicleSpecification,
  migrateAppData,
  normalizeVehicle,
  relatedVehicleIdentities,
  resolveVehicleIdentity,
  resolveVehicleSpecification,
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

test("preserves PRINCE while linking Skyline and Gloria lineages to their NISSAN successors", () => {
  const princeSkyline = resolveVehicleIdentity("プリンス自動車", "スカイライン");
  const nissanSkyline = resolveVehicleIdentity("日産", "SKYLINE");
  const princeGloria = resolveVehicleIdentity("PRINCE", "Gloria");
  const nissanGloria = resolveVehicleIdentity("NISSAN", "グロリア");

  assert.equal(princeSkyline.canonicalMake, "PRINCE");
  assert.equal(princeSkyline.modelFamilyId, nissanSkyline.modelFamilyId);
  assert.notEqual(princeSkyline.marketNameId, nissanSkyline.marketNameId);
  assert.equal(princeGloria.canonicalMake, "PRINCE");
  assert.equal(princeGloria.modelFamilyId, nissanGloria.modelFamilyId);
  assert.notEqual(princeGloria.marketNameId, nissanGloria.marketNameId);
  assert.deepEqual(relatedVehicleIdentities(princeSkyline.marketNameId, "ja"), [{
    marketNameId: "nissan-skyline-global",
    modelFamilyId: "nissan-skyline",
    canonicalMake: "NISSAN",
    model: "スカイライン",
    relationType: "brand_transition",
  }]);
  assert.equal(
    relatedVehicleIdentities(princeGloria.marketNameId, "ja")[0]?.relationType,
    "brand_transition",
  );
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

test("standardizes Citroen aliases with the official Latin spelling", () => {
  const identity = resolveVehicleIdentity("Citroën", "Saxo");
  const japaneseIdentity = resolveVehicleIdentity("シトロエン", "サクソ");

  assert.equal(identity.canonicalMake, "CITROËN");
  assert.equal(identity.brandId, "citroen");
  assert.equal(identity.matchStatus, "brand_only");
  assert.equal(japaneseIdentity.canonicalMake, "CITROËN");
  assert.equal(japaneseIdentity.brandId, "citroen");
  assert.equal(japaneseIdentity.makeInput, "シトロエン");
});

test("separates R33 GT-S25t and GT-R as variants within one generation", () => {
  const identity = resolveVehicleIdentity("NISSAN", "スカイライン");
  const gts25t = resolveVehicleSpecification(identity.modelFamilyId, {
    grade: "GTS25t Type M",
    modelCode: "E-ECR33",
  });
  const gtr = resolveVehicleSpecification(identity.modelFamilyId, {
    grade: "GT-R V-spec",
    modelCode: "BCNR33",
  });

  assert.equal(gts25t.generationId, "nissan-skyline-r33");
  assert.equal(gtr.generationId, gts25t.generationId);
  assert.equal(gts25t.variantId, "nissan-skyline-r33-gts25t");
  assert.equal(gtr.variantId, "nissan-skyline-r33-gtr");
  assert.equal(gtr.matchStatus, "confirmed_model_code");
  assert.equal(compareVehicleApplicability(
    {
      modelFamilyId: identity.modelFamilyId,
      generationId: gts25t.generationId,
      variantId: gts25t.variantId,
      specificationMatchStatus: gts25t.matchStatus,
    },
    {
      modelFamilyId: identity.modelFamilyId,
      generationId: gtr.generationId,
      variantId: gtr.variantId,
      specificationMatchStatus: gtr.matchStatus,
    },
  ), "same_generation_other_variant");
});

test("keeps an uncertain variant match below exact configuration confidence", () => {
  assert.equal(compareVehicleApplicability(
    {
      modelFamilyId: "nissan-skyline",
      generationId: "nissan-skyline-r33",
      variantId: "nissan-skyline-r33-gtr",
      specificationMatchStatus: "conflicting_inputs",
    },
    {
      modelFamilyId: "nissan-skyline",
      generationId: "nissan-skyline-r33",
      variantId: "nissan-skyline-r33-gtr",
      specificationMatchStatus: "confirmed_model_code",
    },
  ), "same_variant_unspecified_configuration");
});

test("requires a generation clue before treating a grade-only variant as a candidate", () => {
  const familyId = resolveVehicleIdentity("NISSAN", "SKYLINE").modelFamilyId;
  const gradeOnly = resolveVehicleSpecification(familyId, { grade: "R33 GT-R" });
  const ambiguousGrade = resolveVehicleSpecification(familyId, { grade: "GT-R" });
  const unspecified = resolveVehicleSpecification(familyId, {});

  assert.equal(gradeOnly.variantId, "nissan-skyline-r33-gtr");
  assert.equal(gradeOnly.matchStatus, "grade_candidate");
  assert.equal(ambiguousGrade.variantId, undefined);
  assert.equal(unspecified.generationId, undefined);
  assert.equal(unspecified.variantId, undefined);
  assert.equal(unspecified.matchStatus, "unmatched");
});

test("flags a conflicting R33 grade and model code instead of calling it exact", () => {
  const familyId = resolveVehicleIdentity("NISSAN", "SKYLINE").modelFamilyId;
  const conflict = resolveVehicleSpecification(familyId, {
    grade: "R33 GTS25t Type M",
    modelCode: "BCNR33",
  });

  assert.equal(conflict.variantId, "nissan-skyline-r33-gtr");
  assert.equal(conflict.matchStatus, "conflicting_inputs");
  assert.equal(conflict.conflict, "grade_model_code_mismatch");
});

test("keeps Peugeot 205 GTI 1.6, GTI 1.9, and Turbo 16 mechanically distinct", () => {
  const identity = resolveVehicleIdentity("プジョー", "205");
  const gti16 = resolveVehicleSpecification(identity.modelFamilyId, {
    generationId: identity.generationId,
    grade: "GTI 1.6",
  });
  const gti19 = resolveVehicleSpecification(identity.modelFamilyId, {
    generationId: identity.generationId,
    grade: "GTI 1.9",
  });
  const turbo16 = resolveVehicleSpecification(identity.modelFamilyId, {
    generationId: identity.generationId,
    grade: "Turbo 16",
  });

  assert.equal(identity.canonicalMake, "PEUGEOT");
  assert.equal(gti16.variantId, "peugeot-205-gti");
  assert.equal(gti19.variantId, gti16.variantId);
  assert.equal(gti16.configurationId, "peugeot-205-gti-1-6");
  assert.equal(gti19.configurationId, "peugeot-205-gti-1-9");
  assert.equal(turbo16.variantId, "peugeot-205-turbo-16");
  assert.equal(compareVehicleApplicability(
    {
      modelFamilyId: identity.modelFamilyId,
      generationId: gti16.generationId,
      variantId: gti16.variantId,
      configurationId: gti16.configurationId,
      specificationMatchStatus: gti16.matchStatus,
    },
    {
      modelFamilyId: identity.modelFamilyId,
      generationId: gti19.generationId,
      variantId: gti19.variantId,
      configurationId: gti19.configurationId,
      specificationMatchStatus: gti19.matchStatus,
    },
  ), "same_variant_other_configuration");
  assert.equal(compareVehicleApplicability(
    {
      modelFamilyId: identity.modelFamilyId,
      generationId: gti19.generationId,
      variantId: gti19.variantId,
      configurationId: gti19.configurationId,
      specificationMatchStatus: gti19.matchStatus,
    },
    {
      modelFamilyId: identity.modelFamilyId,
      generationId: turbo16.generationId,
      variantId: turbo16.variantId,
      configurationId: turbo16.configurationId,
      specificationMatchStatus: turbo16.matchStatus,
    },
  ), "same_generation_other_variant");
});

test("recognizes a complete Peugeot specification entered in the model-name field", () => {
  const identity = resolveVehicleIdentity("プジョー", "205 GTI 1.9");
  const specification = resolveVehicleSpecification(identity.modelFamilyId, {
    generationId: identity.generationId,
    modelName: "205 GTI 1.9",
  });

  assert.equal(identity.modelFamilyId, "peugeot-205");
  assert.equal(specification.configurationId, "peugeot-205-gti-1-9");
});

test("separates Lancia Delta HF evolutions without flattening them into one grade", () => {
  const identity = resolveVehicleIdentity("LANCIA", "Delta");
  const integrale16v = resolveVehicleSpecification(identity.modelFamilyId, {
    grade: "HF Integrale 16V",
  });
  const evoluzione = resolveVehicleSpecification(identity.modelFamilyId, {
    grade: "HF Integrale Evoluzione",
  });

  assert.equal(integrale16v.variantId, "lancia-delta-hf-awd");
  assert.equal(integrale16v.configurationId, "lancia-delta-hf-integrale-16v");
  assert.equal(evoluzione.configurationId, "lancia-delta-hf-integrale-evoluzione");
  assert.notEqual(integrale16v.configurationId, evoluzione.configurationId);
});

test("keeps Delta Evoluzione I and II as separate configurations", () => {
  const firstIdentity = resolveVehicleIdentity("LANCIA", "Delta HF Integrale Evoluzione I");
  const secondIdentity = resolveVehicleIdentity("ランチア", "デルタ エヴォリツォーネ II");
  const first = resolveVehicleSpecification(firstIdentity.modelFamilyId, {
    generationId: firstIdentity.generationId,
    modelName: firstIdentity.modelInput,
  });
  const second = resolveVehicleSpecification(secondIdentity.modelFamilyId, {
    generationId: secondIdentity.generationId,
    modelName: secondIdentity.modelInput,
  });

  assert.equal(first.configurationId, "lancia-delta-hf-integrale-evoluzione-1");
  assert.equal(second.configurationId, "lancia-delta-hf-integrale-evoluzione-2");
  assert.equal(compareVehicleApplicability({
    modelFamilyId: firstIdentity.modelFamilyId,
    generationId: first.generationId,
    variantId: first.variantId,
    configurationId: first.configurationId,
    specificationMatchStatus: first.matchStatus,
  }, {
    modelFamilyId: secondIdentity.modelFamilyId,
    generationId: second.generationId,
    variantId: second.variantId,
    configurationId: second.configurationId,
    specificationMatchStatus: second.matchStatus,
  }), "same_variant_other_configuration");
});

test("uses reported mechanical fields to detect an unlisted configuration conflict", () => {
  assert.equal(compareVehicleApplicability(
    {
      modelFamilyId: "example-family",
      generationId: "example-generation",
      specificationMatchStatus: "unmatched",
      engineCode: "ENGINE-A",
      displacementCc: 1600,
    },
    {
      modelFamilyId: "example-family",
      generationId: "example-generation",
      specificationMatchStatus: "unmatched",
      engineCode: "ENGINE-B",
      displacementCc: 1900,
    },
  ), "reported_configuration_conflict");
});

test("shows a concrete configuration separately from its derivative family", () => {
  assert.deepEqual(displayVehicleSpecification({
    generationId: "peugeot-205-first",
    variantId: "peugeot-205-gti",
    configurationId: "peugeot-205-gti-1-9",
  }, "ja"), {
    generation: "205（初代）",
    variant: "GTI系",
    configuration: "GTI 1.9",
  });
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
  assert.equal(migrated.schemaVersion, 12);
  assert.equal(migrated.vehicles[0]?.make, "FIAT");
  assert.equal(migrated.vehicles[0]?.makeInput, "フィアット");
  assert.equal(migrated.vehicles[0]?.modelFamilyId, "fiat-barchetta");
  assert.equal(migrated.journals[0]?.modelTargetId, "model-family:fiat-barchetta");
  assert.equal(
    migrated.follows.find((follow) => follow.targetType === "model")?.targetId,
    "model-family:fiat-barchetta",
  );
});

test("normalizes an existing Japanese Citroen make without replacing the vehicle", () => {
  const legacy = structuredClone(cloneDemoData());
  const originalVehicleId = legacy.vehicles[0]!.id;
  legacy.vehicles[0]!.make = "シトロエン";
  legacy.vehicles[0]!.model = "サクソ";
  legacy.vehicles[0]!.makeInput = "シトロエン";
  legacy.vehicles[0]!.modelInput = "サクソ";
  legacy.vehicles[0]!.brandId = undefined;
  legacy.vehicles[0]!.modelFamilyId = undefined;

  const migrated = migrateAppData(legacy);

  assert.ok(migrated);
  assert.equal(migrated.vehicles[0]?.id, originalVehicleId);
  assert.equal(migrated.vehicles[0]?.make, "CITROËN");
  assert.equal(migrated.vehicles[0]?.makeInput, "シトロエン");
  assert.equal(migrated.vehicles[0]?.brandId, "citroen");
});
