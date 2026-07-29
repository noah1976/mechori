import assert from "node:assert/strict";
import test from "node:test";

import {
  collaborativeMatchIdentityOverride,
  resolveCollaborativeCatalog,
  validateVehicleCatalogSuggestion,
  vehicleCatalogLookupKey,
  type CollaborativeCatalogSnapshot,
} from "../src/index.ts";

const snapshot: CollaborativeCatalogSnapshot = {
  entities: [
    {
      id: "citroen",
      entityType: "marque",
      canonicalName: "CITROËN",
      status: "published",
    },
    {
      id: "subaru",
      entityType: "marque",
      canonicalName: "SUBARU",
      status: "published",
    },
    {
      id: "citroen-c5",
      entityType: "model_family",
      canonicalName: "C5",
      vehicleCategory: "car",
      status: "published",
    },
    {
      id: "citroen-c5-global",
      entityType: "market_name",
      canonicalName: "C5",
      parentEntityId: "citroen-c5",
      marqueEntityId: "citroen",
      vehicleCategory: "car",
      status: "published",
    },
    {
      id: "peugeot",
      entityType: "marque",
      canonicalName: "PEUGEOT",
      status: "published",
    },
    {
      id: "peugeot-205",
      entityType: "model_family",
      canonicalName: "205",
      vehicleCategory: "car",
      status: "published",
    },
    {
      id: "peugeot-205-global",
      entityType: "market_name",
      canonicalName: "205",
      parentEntityId: "peugeot-205",
      marqueEntityId: "peugeot",
      vehicleCategory: "car",
      status: "published",
    },
    {
      id: "peugeot-205-gen1",
      entityType: "generation",
      canonicalName: "205 Generation 1",
      parentEntityId: "peugeot-205",
      vehicleCategory: "car",
      status: "published",
    },
    {
      id: "peugeot-205-gti",
      entityType: "variant",
      canonicalName: "205 GTI",
      parentEntityId: "peugeot-205-gen1",
      vehicleCategory: "car",
      status: "published",
    },
    {
      id: "peugeot-205-gti-1-9",
      entityType: "configuration",
      canonicalName: "205 GTI 1.9",
      parentEntityId: "peugeot-205-gti",
      vehicleCategory: "car",
      status: "published",
    },
  ],
  names: [
    {
      id: "citroen-en",
      entityId: "citroen",
      nameText: "CITROËN",
      nameKind: "canonical",
      matchingMode: "exact",
      status: "published",
    },
    {
      id: "citroen-ja",
      entityId: "citroen",
      nameText: "シトロエン",
      nameKind: "localized_name",
      matchingMode: "exact",
      status: "published",
    },
    {
      id: "subaru-en",
      entityId: "subaru",
      nameText: "SUBARU",
      nameKind: "canonical",
      matchingMode: "exact",
      status: "published",
    },
    {
      id: "citroen-c5-name",
      entityId: "citroen-c5-global",
      nameText: "C5",
      nameKind: "market_name",
      matchingMode: "exact",
      status: "published",
    },
    {
      id: "subaru-company-ja",
      entityId: "subaru",
      nameText: "富士重工",
      nameKind: "historical_corporate_name",
      matchingMode: "candidate_only",
      status: "published",
    },
    {
      id: "peugeot-ja",
      entityId: "peugeot",
      nameText: "プジョー",
      nameKind: "localized_name",
      matchingMode: "exact",
      status: "published",
    },
    {
      id: "205-name",
      entityId: "peugeot-205-global",
      nameText: "205",
      nameKind: "market_name",
      matchingMode: "exact",
      status: "published",
    },
    {
      id: "205-generation",
      entityId: "peugeot-205-gen1",
      nameText: "205",
      nameKind: "generation_name",
      matchingMode: "candidate_only",
      status: "published",
    },
    {
      id: "205-gti",
      entityId: "peugeot-205-gti",
      nameText: "GTI",
      nameKind: "grade_name",
      matchingMode: "exact",
      status: "published",
    },
    {
      id: "205-gti-19",
      entityId: "peugeot-205-gti-1-9",
      nameText: "GTI 1.9",
      nameKind: "grade_name",
      matchingMode: "exact",
      status: "published",
    },
  ],
};

test("normalizes catalog lookup text without replacing the original input", () => {
  assert.equal(vehicleCatalogLookupKey("ＣＩＴＲＯËＮ  C-5"), "citroënc5");
});

test("returns an exact published alias as an identity override", () => {
  const match = resolveCollaborativeCatalog(snapshot, "シトロエン", "C5");
  assert.equal(match.canonicalMake, "CITROËN");
  assert.equal(match.brandId, "citroen");
  assert.equal(match.status, "exact");
  const override = collaborativeMatchIdentityOverride(match, "シトロエン", "C5");
  assert.equal(override?.canonicalMake, "CITROËN");
  assert.equal(override?.modelFamilyId, "citroen-c5");
});

test("keeps historical company names as candidates instead of silently changing the marque", () => {
  const match = resolveCollaborativeCatalog(snapshot, "富士重工", "レオーネ");
  assert.equal(match.canonicalMake, "SUBARU");
  assert.equal(match.status, "candidate");
  assert.equal(
    collaborativeMatchIdentityOverride(match, "富士重工", "レオーネ"),
    undefined,
  );
});

test("separates a base model from a materially different configuration", () => {
  const match = resolveCollaborativeCatalog(snapshot, "プジョー", "205 GTI 1.9");
  assert.equal(match.canonicalMake, "PEUGEOT");
  assert.equal(match.canonicalModel, "205");
  assert.equal(match.modelFamilyId, "peugeot-205");
  assert.equal(match.marketNameId, "peugeot-205-global");
  assert.equal(match.variantId, "peugeot-205-gti");
  assert.equal(match.configurationId, "peugeot-205-gti-1-9");
  assert.equal(match.status, "candidate");
});

test("validates suggestions without requiring expert-only fields", () => {
  const result = validateVehicleCatalogSuggestion({
    sourceVehicleId: "vehicle-1",
    suggestionKind: "vehicle_identity",
    vehicleCategory: "motorcycle",
    makeInput: "ホンダ",
    modelInput: "CB",
    evidenceBasis: "vehicle_itself",
  });
  assert.equal(result.valid, true);
});

test("rejects an empty vehicle identity suggestion", () => {
  const result = validateVehicleCatalogSuggestion({
    suggestionKind: "vehicle_identity",
    vehicleCategory: "car",
    makeInput: " ",
    modelInput: "",
    evidenceBasis: "unknown",
  });
  assert.equal(result.valid, false);
  assert.equal(result.errors.makeInput, "invalid_make");
  assert.equal(result.errors.modelInput, "invalid_model");
});
