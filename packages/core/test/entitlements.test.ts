import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveEntitlements,
  type EntitlementConfig,
} from "../src/index.ts";

const config: EntitlementConfig = {
  freeMaxOwnedVehicles: 2,
  ocrMonthlyAllowance: { free: 1, owner_plus: 10, professional: 50 },
  aiStructuringMonthlyAllowance: { free: 2, owner_plus: 20, professional: 100 },
};

test("limits Free search to two registered vehicles", () => {
  const entitlements = resolveEntitlements("free", config);

  assert.equal(entitlements.maxOwnedVehicles, 2);
  assert.equal(entitlements.knowledgeScope, "registered_vehicles");
  assert.equal(entitlements.adsEligible, true);
});

test("allows Owner Plus to search unregistered vehicles", () => {
  const entitlements = resolveEntitlements("owner_plus", config);

  assert.equal(entitlements.maxOwnedVehicles, undefined);
  assert.equal(entitlements.knowledgeScope, "all_public_standard");
  assert.equal(entitlements.clientAccess, "web_and_mobile");
});

test("keeps the Professional workspace web-only and separate from verification", () => {
  const entitlements = resolveEntitlements("professional", config);

  assert.equal(entitlements.knowledgeScope, "all_public_professional");
  assert.equal(entitlements.clientAccess, "web_only");
  assert.equal(entitlements.professionalWorkspaceEnabled, true);
});
