import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { handleQaFeedbackRequest } from "../lib/human-qa-handler.ts";
import { QA_TASK, qaAnalyticsContext, qaDeviceClass, safeQaBuild, sanitizeQaSource, validateQaFeedback } from "../lib/human-qa.ts";

const input = { submissionId: "a2b85b42-3b9e-46ed-8f84-0da61bd1bcb3", task: QA_TASK, step: 2, source: "x", device: "mobile", result: "confusing", note: "一覧の開き方で迷いました" };
const request = (body: unknown, headers: Record<string, string> = {}) => new Request("http://localhost:3000/api/qa-feedback", { method: "POST", headers: { origin: "http://localhost:3000", "content-type": "application/json", ...headers }, body: JSON.stringify(body) });

test("QA accepts blank prose and early exit without account identity", () => {
  assert.deepEqual(validateQaFeedback({ ...input, note: "", step: 0 }), { ...input, note: "", step: 0 });
  for (const field of ["userId", "email", "ip", "userAgent", "url", "passportToken"]) assert.equal(validateQaFeedback({ ...input, [field]: "private" }), null);
});
test("source/device/build context is coarse, bounded and sanitized", () => {
  assert.equal(sanitizeQaSource(null), "direct");
  assert.equal(sanitizeQaSource("facebook"), "facebook");
  for (const source of ["X", "https://x.com/private", "<script>", {}, "x&email=a@b.test"]) assert.equal(sanitizeQaSource(source), "unknown");
  assert.equal(qaDeviceClass(390), "mobile");
  assert.equal(qaDeviceClass(800), "tablet");
  assert.equal(qaDeviceClass(1280), "desktop");
  assert.equal(qaDeviceClass(NaN), "unknown");
  assert.equal(safeQaBuild("FFB713A"), "ffb713a");
  assert.equal(safeQaBuild("private@example.com"), "unknown");
});
test("malformed and identifying feedback cannot reach persistence", () => {
  for (const value of [null, [], {}, { ...input, task: "other" }, { ...input, step: 4 }, { ...input, step: 1.1 }, { ...input, result: "market_validated" }, { ...input, device: "Mozilla/5.0" }, { ...input, note: "a".repeat(301) }, { ...input, submissionId: "not-uuid" }]) assert.equal(validateQaFeedback(value), null);
  for (const note of ["test@example.com", "https://mechori.com/p/secret", "invite=secret", "Mozilla/5.0", "192.168.1.1", "ABCDEFGH123456789", "札幌500あ12-34", "ＡＢＣ＠ｅｘａｍｐｌｅ．ｃｏｍ", "a".repeat(43)]) assert.equal(validateQaFeedback({ ...input, note }), null, note);
});
test("handler persists only validated QA fields and server-controlled build", async () => {
  let calls = 0;
  const result = await handleQaFeedbackRequest(request(input), { enabled: true, build: "ffb713a", async submit(received, context) {
    calls++;
    assert.equal(received.note, input.note);
    assert.deepEqual(Object.keys(context).sort(), ["build", "device", "source", "step", "task", "version"]);
    assert.equal(context.build, "ffb713a");
    return "accepted";
  } });
  assert.equal(result.status, 200);
  assert.equal(calls, 1);
  assert.equal(result.headers.get("cache-control"), "no-store");
});
test("closed, cross-origin, oversized, malformed and unsupported requests never call DB", async () => {
  let calls = 0;
  const deps = { enabled: true, build: "", async submit() { calls++; return "accepted" as const; } };
  assert.equal((await handleQaFeedbackRequest(request(input), { ...deps, enabled: false })).status, 503);
  assert.equal((await handleQaFeedbackRequest(request(input, { origin: "https://other.test" }), deps)).status, 403);
  assert.equal((await handleQaFeedbackRequest(request(input, { "content-type": "text/plain" }), deps)).status, 415);
  assert.equal((await handleQaFeedbackRequest(request({ ...input, note: "あ".repeat(2000) }), deps)).status, 413);
  assert.equal((await handleQaFeedbackRequest(request({ ...input, userId: "owner" }), deps)).status, 400);
  assert.equal((await handleQaFeedbackRequest(new Request("http://localhost:3000/api/qa-feedback", { method: "POST", headers: { origin: "http://localhost:3000", "content-type": "application/json" }, body: "{" }), deps)).status, 400);
  assert.equal(calls, 0);
});
test("rate limit, closed DB, duplicate receipt and network failure have recoverable outcomes", async () => {
  for (const [outcome, status] of [["rate_limited", 429], ["closed", 503], ["duplicate", 200]] as const) {
    assert.equal((await handleQaFeedbackRequest(request(input), { enabled: true, build: "", async submit() { return outcome; } })).status, status);
  }
  const failed = await handleQaFeedbackRequest(request(input), { enabled: true, build: "", async submit() { throw new Error("private server detail"); } });
  assert.equal(failed.status, 503);
  assert.equal((await failed.text()).includes("private server detail"), false);
});
test("QA events contain no note, identity or raw location", () => {
  assert.deepEqual(qaAnalyticsContext("x", 2, "mobile"), { task: QA_TASK, version: "qa-v0.1", source: "x", step: 2, device_class: "mobile" });
});
test("fixture and QA route cannot hydrate signed-in private workspace", () => {
  const frame = readFileSync(new URL("../components/application-frame.tsx", import.meta.url), "utf8");
  assert.ok(frame.indexOf('if (pathname === "/qa")') < frame.indexOf("return <AppProvider>"));
  const qa = readFileSync(new URL("../components/human-qa-experience.tsx", import.meta.url), "utf8");
  const fixture = readFileSync(new URL("../lib/human-qa-fixture.ts", import.meta.url), "utf8");
  assert.doesNotMatch(qa, /useApp|loadPassportShare|createSupabaseBrowserClient|loadAlphaWorkspace/);
  assert.doesNotMatch(fixture, /from.*(?:app-context|demo\.ts|supabase)|fetch\(/);
  assert.match(fixture, /TEST DATA/);
  assert.match(qa, /submitting\.current/);
  assert.match(qa, /AbortSignal\.timeout/);
});
