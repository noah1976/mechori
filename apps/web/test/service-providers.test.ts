import assert from "node:assert/strict";
import test from "node:test";
import { serviceAttributionFromProvider } from "../lib/service-provider-domain.ts";

test("provider selection creates a historical maintenance snapshot", () => {
  const attribution = serviceAttributionFromProvider({
    id: "provider-1",
    displayName: "北海モータース",
    locality: "札幌市",
    status: "unverified",
    source: "user_submitted",
  });

  assert.deepEqual(attribution, {
    version: 1,
    performedByType: "service_provider",
    serviceProviderId: "provider-1",
    providerDisplayNameSnapshot: "北海モータース",
    providerLocalitySnapshot: "札幌市",
  });
});

test("provider snapshot excludes trust labels and private user data", () => {
  const attribution = serviceAttributionFromProvider({
    id: "provider-2",
    displayName: "Example Shop",
    status: "unverified",
    source: "user_submitted",
  });

  assert.equal("email" in attribution, false);
  assert.equal("verified" in attribution, false);
  assert.equal(attribution.providerLocalitySnapshot, undefined);
});
