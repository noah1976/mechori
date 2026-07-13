import assert from "node:assert/strict";
import test from "node:test";

import {
  canConfirmCandidate,
  canTransitionImportSession,
  getImportReviewProgress,
  requiresFieldReview,
  reviewFieldAssertion,
  transitionImportSession,
  type FieldAssertion,
} from "../src/index.ts";

const confirmedAssertion: FieldAssertion = {
  id: "field-1",
  extractedCandidateId: "candidate-1",
  fieldCode: "service_date",
  suggestedValue: "2026-07-13",
  confidenceBand: "high",
  inferenceState: "read",
  verificationState: "user_confirmed",
};

test("allows the normal import path and rejects skipping user review", () => {
  assert.equal(canTransitionImportSession("created", "extracting"), true);
  assert.equal(canTransitionImportSession("extracted", "structuring"), true);
  assert.equal(canTransitionImportSession("awaiting_review", "confirmed"), true);
  assert.equal(canTransitionImportSession("created", "persisted"), false);
  assert.throws(
    () => transitionImportSession("structuring", "persisted"),
    /invalid_import_transition/,
  );
});

test("does not confirm a candidate while any field still needs review", () => {
  const inferredAssertion: FieldAssertion = {
    ...confirmedAssertion,
    id: "field-2",
    fieldCode: "part_number",
    confidenceBand: "low",
    inferenceState: "inferred",
    verificationState: "needs_review",
  };

  assert.equal(requiresFieldReview(confirmedAssertion), false);
  assert.equal(requiresFieldReview(inferredAssertion), true);
  assert.equal(canConfirmCandidate("in_review", [confirmedAssertion]), true);
  assert.equal(
    canConfirmCandidate("in_review", [confirmedAssertion, inferredAssertion]),
    false,
  );
});

test("tracks manual review progress and keeps corrections explicit", () => {
  const pendingAssertion: FieldAssertion = {
    ...confirmedAssertion,
    id: "field-2",
    fieldCode: "odometer",
    suggestedValue: "B6420",
    confidenceBand: "low",
    inferenceState: "read",
    verificationState: "needs_review",
  };
  const initial = [confirmedAssertion, pendingAssertion];

  assert.deepEqual(getImportReviewProgress(initial), {
    total: 2,
    confirmed: 1,
    rejected: 0,
    remaining: 1,
  });

  const reviewed = reviewFieldAssertion(initial, "field-2", "user_confirmed", "86420");
  assert.equal(reviewed[1]?.correctedValue, "86420");
  assert.equal(reviewed[1]?.verificationState, "user_confirmed");
  assert.equal(getImportReviewProgress(reviewed).remaining, 0);
});
