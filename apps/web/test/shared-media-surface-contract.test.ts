import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("Feed, Garage, and Detail route shared photos through the canonical media loader", () => {
  const card = read("../components/journal-card.tsx");
  const garage = read("../app/garage/page.tsx");
  const detail = read("../app/journal/[id]/page.tsx");
  const content = read("../components/journal-content.tsx");
  const media = read("../components/journal-media.tsx");

  assert.match(card, /<JournalMedia[\s\S]*attachments=\{visibleMedia\}/);
  assert.match(garage, /<JournalMedia attachments=\{item\.media\} locale=\{locale\} compact/);
  assert.match(detail, /<JournalContent journal=\{visibleJournal\}/);
  assert.match(content, /<JournalMedia[\s\S]*attachments=\{\[attachment\]\}[\s\S]*body/);
  assert.match(media, /downloadSharedMediaWithRetry/);
  assert.match(media, /stage: "image_decode"/);
  assert.match(media, /URL\.revokeObjectURL/);
});
