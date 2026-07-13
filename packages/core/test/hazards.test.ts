import assert from "node:assert/strict";
import test from "node:test";

import { resolveHazardPolicy } from "../src/index.ts";

test("raises brake-related content to CRITICAL", () => {
  const policy = resolveHazardPolicy(["brakes"], "LOW");

  assert.equal(policy.effectiveLevel, "CRITICAL");
  assert.equal(policy.requiresExpertConfirmation, true);
  assert.equal(policy.requiresModeratorReview, true);
  assert.equal(policy.requiresPreDisplayWarning, true);
});

test("uses the strictest policy when multiple tags are present", () => {
  const policy = resolveHazardPolicy(["battery", "wheel_fastening"]);

  assert.equal(policy.effectiveLevel, "CRITICAL");
});

test("does not lower a manually escalated hazard level", () => {
  const policy = resolveHazardPolicy(["tires"], "CRITICAL");

  assert.equal(policy.effectiveLevel, "CRITICAL");
});

test("keeps legal review separate from physical hazard severity", () => {
  const policy = resolveHazardPolicy(["legal_modification"]);

  assert.equal(policy.effectiveLevel, "CAUTION");
  assert.equal(policy.requiresLegalNotice, true);
});
