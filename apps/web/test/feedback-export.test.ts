import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFeedbackReviewMarkdown,
  createFeedbackExportFilename,
  filterAdminFeedback,
  type FeedbackExportFilter,
  type FeedbackExportItem,
} from "../lib/feedback-export.ts";

const all: FeedbackExportFilter = { query: "", kind: "all", status: "all", from: "", to: "" };

const feedback: FeedbackExportItem[] = [
  {
    id: "FB-002",
    displayName: "Bさん",
    kind: "broken",
    content: "検索結果を開けませんでした",
    pagePath: "/search",
    appBuild: "alpha-2",
    status: "reviewing",
    adminNote: "再現を確認する",
    createdAt: "2026-08-11T20:00:00.000Z",
  },
  {
    id: "FB-001",
    displayName: "Aさん",
    kind: "confusing",
    content: "何を押せばよいか分かりません",
    pagePath: "/",
    appBuild: "alpha-1",
    status: "new",
    adminNote: "",
    createdAt: "2026-08-10T20:00:00.000Z",
  },
];

test("filters by status, kind, dates, and search while keeping stable chronological order", () => {
  const first = feedback[0]!;
  assert.deepEqual(filterAdminFeedback(feedback, all).map((item) => item.id), ["FB-001", "FB-002"]);
  assert.deepEqual(filterAdminFeedback([
    { ...first, id: "FB-010", createdAt: "2026-08-10T20:00:00.000Z" },
    { ...first, id: "FB-009", createdAt: "2026-08-10T20:00:00.000Z" },
  ], all).map((item) => item.id), ["FB-009", "FB-010"]);
  assert.deepEqual(filterAdminFeedback(feedback, { ...all, status: "new" }).map((item) => item.id), ["FB-001"]);
  assert.deepEqual(filterAdminFeedback(feedback, { ...all, kind: "broken" }).map((item) => item.id), ["FB-002"]);
  assert.deepEqual(filterAdminFeedback(feedback, { ...all, from: "2026-08-11", to: "2026-08-11" }).map((item) => item.id), ["FB-002"]);
  assert.deepEqual(filterAdminFeedback(feedback, { ...all, query: "検索" }).map((item) => item.id), ["FB-002"]);
  assert.deepEqual(filterAdminFeedback(feedback, { ...all, query: "再現" }).map((item) => item.id), ["FB-002"]);
});

test("generates complete GPT review Markdown without leaking fields or mutating status", () => {
  const before = structuredClone(feedback);
  const markdown = buildFeedbackReviewMarkdown(feedback, all);
  assert.match(markdown, /^# MECHORI User Feedback Review/);
  assert.match(markdown, /Feedbackは実装要求ではなく/);
  assert.match(markdown, /Product Owner/);
  assert.match(markdown, /## FB-001[\s\S]*何を押せばよいか分かりません/);
  assert.match(markdown, /## FB-002[\s\S]*再現を確認する/);
  assert.ok(markdown.indexOf("## FB-001") < markdown.indexOf("## FB-002"));
  assert.doesNotMatch(markdown, /email@example\.com|access_token|user_id/);
  assert.deepEqual(feedback, before);
});

test("empty filters return no export targets and filenames are deterministic by date", () => {
  assert.deepEqual(filterAdminFeedback(feedback, { ...all, from: "2027-01-01" }), []);
  assert.equal(createFeedbackExportFilename(new Date("2026-08-11T00:00:00.000Z")), "mechori-feedback-2026-08-11.md");
});
