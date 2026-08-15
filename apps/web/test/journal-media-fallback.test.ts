import assert from "node:assert/strict";
import test from "node:test";
import { journalMediaFallback } from "../lib/journal-media-fallback.ts";

test("local-only legacy media degrades without hiding the record text", () => {
  const fallback = journalMediaFallback({ source: "local_blob" }, "ja");

  assert.equal(fallback.kind, "local");
  assert.equal(fallback.message, "この写真はこの端末で確認できません");
  assert.equal(fallback.detail, "記録本文はそのまま残っています");
});

test("shared media retains its distinct retryable failure state", () => {
  const fallback = journalMediaFallback({ source: "alpha_shared" }, "en");

  assert.equal(fallback.kind, "shared");
  assert.equal(fallback.message, "Shared photo is unavailable");
  assert.equal(fallback.detail, undefined);
});

test("inline media is not classified as a legacy local-media failure", () => {
  const fallback = journalMediaFallback({ source: "alpha_inline" }, "en");

  assert.equal(fallback.kind, "other");
  assert.equal(fallback.message, "Photo is unavailable");
});
