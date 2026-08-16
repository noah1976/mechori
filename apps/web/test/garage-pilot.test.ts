import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { addVehicleToData, createEmptyAppData, createEmptyVehicleDraft } from "@mechori/core";
import { garageServiceAttributionLabel } from "../lib/garage-pilot.ts";
import { buildGarageVehicleIdentity } from "../lib/garage-vehicle-identity.ts";

test("Garage timeline makes DIY and provider work readable without treating unknown as empty history", () => {
  assert.equal(
    garageServiceAttributionLabel({ version: 1, performedByType: "self" }, "ja"),
    "自分で作業",
  );
  assert.equal(
    garageServiceAttributionLabel({
      version: 1,
      performedByType: "service_provider",
      serviceProviderId: "provider-1",
      providerDisplayNameSnapshot: "北海モータース",
      providerLocalitySnapshot: "札幌市",
    }, "ja"),
    "北海モータース · 札幌市",
  );
  assert.equal(
    garageServiceAttributionLabel({ version: 1, performedByType: "unknown" }, "ja"),
    null,
  );
});

test("Garage timeline keeps provider snapshots available after provider data changes", () => {
  assert.equal(
    garageServiceAttributionLabel({
      version: 1,
      performedByType: "service_provider",
      serviceProviderId: "provider-1",
      providerDisplayNameSnapshot: "当時の北海モータース",
    }, "en"),
    "当時の北海モータース",
  );
});

test("Garage identity keeps make, model, trim, specifications, and facts in a factual hierarchy", () => {
  const source = readFileSync(new URL("../app/garage/page.tsx", import.meta.url), "utf8");
  assert.match(source, /<GarageVehicleIdentity/);
  const vehicle = addVehicleToData(
    createEmptyAppData("owner-1"),
    {
      ...createEmptyVehicleDraft(),
      make: "NISSAN",
      model: "スカイライン",
      grade: "GT-R",
      modelCode: "BNR32",
      year: "1994",
      ownershipStartedYear: "2014",
      ownershipStartedMonth: "4",
      odometer: "68254",
    },
    "2026-08-16T00:00:00.000Z",
  ).vehicle;
  const identity = buildGarageVehicleIdentity(vehicle, "ja", new Date("2026-08-16T00:00:00.000Z"));

  assert.equal(identity.make, "NISSAN");
  assert.equal(identity.model, "スカイライン");
  assert.equal(identity.grade, "GT-R");
  assert.equal(identity.modelCode, "BNR32");
  assert.equal(identity.year, "1994年");
  assert.deepEqual(identity.facts, [
    { key: "vehicle-age", label: "車齢", value: "32年" },
    { key: "ownership", label: "所有", value: "12年4か月" },
    { key: "odometer", label: "走行距離", value: "68,254 km" },
  ]);
});

test("Garage identity omits unknown values and lets long model names wrap", () => {
  const vehicle = addVehicleToData(
    createEmptyAppData("owner-2"),
    {
      ...createEmptyVehicleDraft(),
      make: "FIAT",
      model: "A very long owner-entered model name without a catalog match",
      year: "1997",
    },
    "2026-08-16T00:00:00.000Z",
  ).vehicle;
  const identity = buildGarageVehicleIdentity(vehicle, "ja", new Date("2026-08-16T00:00:00.000Z"));
  const component = readFileSync(new URL("../components/garage-vehicle-identity.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.equal(identity.grade, undefined);
  assert.equal(identity.modelCode, undefined);
  assert.equal(identity.year, "1997年");
  assert.deepEqual(identity.facts, [{ key: "vehicle-age", label: "車齢", value: "29年" }]);
  assert.match(component, /identity\.grade && <span className="garage-v2-grade">/);
  assert.match(component, /identity\.modelCode \|\| identity\.year/);
  assert.match(css, /\.garage-v2-vehicle-name > span \{ display: block; overflow-wrap: anywhere; \}/);
  assert.match(css, /\.garage-v2-identity-sheet \.garage-v2-vehicle-name \{ max-width: 100%;/);
});
