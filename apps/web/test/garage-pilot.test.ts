import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { garageServiceAttributionLabel } from "../lib/garage-pilot.ts";

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

test("Garage identity keeps make, model, and an optional grade as separate visual fields", () => {
  const source = readFileSync(new URL("../app/garage/page.tsx", import.meta.url), "utf8");
  assert.match(source, /garage-v2-make/);
  assert.match(source, /<h1>\{vehicleModel\}<\/h1>/);
  assert.match(source, /vehicle\.grade && <p className="garage-v2-grade">\{vehicle\.grade\}<\/p>/);
});
