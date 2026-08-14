import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const journalFormSource = readFileSync(
  new URL("../components/journal-form.tsx", import.meta.url),
  "utf8",
);
const quickEventFormSource = readFileSync(
  new URL("../components/quick-event-form.tsx", import.meta.url),
  "utf8",
);

test("journal forms do not expose a separate photo audience control", () => {
  for (const source of [journalFormSource, quickEventFormSource]) {
    assert.doesNotMatch(source, /写真も公開|写真は自分だけ/);
    assert.doesNotMatch(source, /Share photos?|Keep photos? private/);
    assert.doesNotMatch(source, /SharingDecision|alpha-media-sharing-choice/);
  }
});

test("journal forms explain that photos follow the record audience", () => {
  assert.match(journalFormSource, /写真は記録本文と同じ範囲で公開します/);
  assert.match(quickEventFormSource, /写真は記録本文と同じ公開範囲で保存します/);
});
