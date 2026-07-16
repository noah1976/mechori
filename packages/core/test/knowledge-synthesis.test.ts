import assert from "node:assert/strict";
import test from "node:test";

import {
  buildKnowledgeSynthesis,
  filterKnowledgeCasesByText,
  isSynthesisGrounded,
  type KnowledgeCaseEvidence,
} from "../src/index.ts";

function knowledgeCase(
  id: string,
  overrides: Partial<KnowledgeCaseEvidence> = {},
): KnowledgeCaseEvidence {
  return {
    id,
    publicationStatus: "public",
    independentSourceKey: id,
    matchLevel: "exact_specification",
    observations: ["DEMO symptom"],
    causeCandidates: ["報告された原因候補A"],
    reportedChecks: ["報告された確認箇所A"],
    reportedActions: ["報告された対応A"],
    reportedParts: ["報告された交換部品A"],
    outcome: "improved",
    verificationStatus: "owner_confirmed",
    hazardTags: [],
    hazardLevel: "LOW",
    sourceTitle: `${id}の投稿`,
    sourceHref: `/journal/${id}`,
    sourceKind: "journal",
    ...overrides,
  };
}

test("uses only public cases and preserves evidence text", () => {
  const cases = [
    knowledgeCase("public-case"),
    knowledgeCase("hidden-case", {
      publicationStatus: "hidden",
      causeCandidates: ["公開してはいけない候補"],
    }),
  ];
  const synthesis = buildKnowledgeSynthesis(cases);

  assert.deepEqual(synthesis.includedCaseIds, ["public-case"]);
  assert.deepEqual(
    synthesis.reportedCauseCandidates.map((item) => item.text),
    ["報告された原因候補A"],
  );
  assert.equal(isSynthesisGrounded(synthesis, cases), true);
  assert.equal(synthesis.sources[0]?.href, "/journal/public-case");
  assert.deepEqual(
    synthesis.reportedParts.map((item) => item.text),
    ["報告された交換部品A"],
  );
});

test("filters evidence before synthesis without inventing fallback cases", () => {
  const cases = [
    knowledgeCase("warning", { observations: ["warning light"] }),
    knowledgeCase("noise", { observations: ["front noise"] }),
  ];

  assert.deepEqual(
    filterKnowledgeCasesByText(cases, "warning").map((item) => item.id),
    ["warning"],
  );
  assert.deepEqual(filterKnowledgeCasesByText(cases, "not-found"), []);
});

test("does not count duplicated material as independent reports", () => {
  const synthesis = buildKnowledgeSynthesis([
    knowledgeCase("case-1", { independentSourceKey: "same-document" }),
    knowledgeCase("case-2", { independentSourceKey: "same-document" }),
  ]);
  const causeCandidate = synthesis.reportedCauseCandidates[0];

  assert.ok(causeCandidate);
  assert.equal(causeCandidate.independentReportCount, 1);
  assert.deepEqual(causeCandidate.supportingCaseIds, [
    "case-1",
    "case-2",
  ]);
});

test("keeps unresolved and adverse outcomes visible", () => {
  const synthesis = buildKnowledgeSynthesis([
    knowledgeCase("improved"),
    knowledgeCase("unresolved", { outcome: "unresolved" }),
    knowledgeCase("worsened", { outcome: "worsened" }),
  ]);

  assert.deepEqual(synthesis.unresolvedOrAdverseCaseIds, ["unresolved", "worsened"]);
  assert.equal(synthesis.outcomes.improved, 1);
  assert.equal(synthesis.outcomes.unresolved, 1);
  assert.equal(synthesis.outcomes.worsened, 1);
});

test("inherits the strictest safety policy from included evidence", () => {
  const synthesis = buildKnowledgeSynthesis([
    knowledgeCase("brake-case", {
      hazardTags: ["brakes"],
      hazardLevel: "CRITICAL",
    }),
  ]);

  assert.equal(synthesis.hazardPolicy.effectiveLevel, "CRITICAL");
  assert.equal(synthesis.hazardPolicy.requiresExpertConfirmation, true);
});

test("returns an explicit insufficient-evidence result", () => {
  const synthesis = buildKnowledgeSynthesis([]);

  assert.equal(synthesis.insufficientEvidence, true);
  assert.deepEqual(synthesis.reportedCauseCandidates, []);
});
