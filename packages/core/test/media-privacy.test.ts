import assert from "node:assert/strict";
import test from "node:test";

import {
  assessMediaPublishability,
  type MediaPrivacyState,
} from "../src/index.ts";

const publishableState: MediaPrivacyState = {
  assetKind: "redacted_derivative",
  metadataState: "removed",
  detectionState: "completed",
  manualReviewState: "confirmed_redactions",
  sensitiveRegions: [
    {
      id: "plate-region",
      kind: "license_plate",
      status: "redacted",
      redactionMethod: "solid_fill",
    },
  ],
};

test("allows only a reviewed and redacted derivative to be published", () => {
  assert.deepEqual(assessMediaPublishability(publishableState), {
    publishable: true,
    reasons: [],
  });
});

test("does not treat no detector result as proof that an image is safe", () => {
  const result = assessMediaPublishability({
    ...publishableState,
    detectionState: "not_run",
    manualReviewState: "pending",
    sensitiveRegions: [],
  });

  assert.equal(result.publishable, false);
  assert.deepEqual(result.reasons, ["detection_incomplete", "manual_review_incomplete"]);
});

test("blocks an original even when all detected regions are redacted", () => {
  const result = assessMediaPublishability({
    ...publishableState,
    assetKind: "original",
  });

  assert.equal(result.publishable, false);
  assert.deepEqual(result.reasons, ["original_asset"]);
});

test("blocks unresolved license plate candidates", () => {
  const result = assessMediaPublishability({
    ...publishableState,
    sensitiveRegions: [
      {
        id: "plate-region",
        kind: "license_plate",
        status: "detected",
      },
    ],
  });

  assert.equal(result.publishable, false);
  assert.deepEqual(result.reasons, ["unresolved_sensitive_region"]);
});

test("requires a destructive redaction method to be recorded", () => {
  const result = assessMediaPublishability({
    ...publishableState,
    sensitiveRegions: [
      {
        id: "plate-region",
        kind: "license_plate",
        status: "redacted",
      },
    ],
  });

  assert.equal(result.publishable, false);
  assert.deepEqual(result.reasons, ["missing_redaction_method"]);
});
