import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const card = read("../components/journal-card.tsx");
const detail = read("../app/journal/[id]/page.tsx");
const media = read("../components/journal-media.tsx");
const profile = read("../app/profile/[id]/page.tsx");
const prompts = read("../components/journal-prompts.tsx");
const promptData = read("../lib/journal-prompts.ts");
const newJournal = read("../app/journal/new/page.tsx");
const form = read("../components/journal-form.tsx");
const detailRoute = read("../lib/journal-detail-route.ts");
const home = read("../app/page.tsx");

test("post authors and vehicles have separate public destinations", () => {
  assert.match(card, /publicProfileHref/);
  assert.match(card, /className="journal-author-link"/);
  assert.match(card, /journal-vehicle-link/);
  assert.match(card, /vehicleHref/);
  assert.match(detail, /publicProfileHref/);
  assert.match(detail, /vehicleHref/);
  assert.match(media, /Open vehicle profile/);
  assert.doesNotMatch(card, /href=\{`\/profile\/\$\{author\.id\}`\}/);
  assert.doesNotMatch(detail, /href=\{`\/profile\/\$\{author\.id\}`\}/);
});

test("fixed prompts remain optional and route into the existing journal form", () => {
  assert.match(prompts, /今日は、愛車のどんな記録を残しますか？/);
  for (const id of ["why-this-car", "memorable-event", "breakdown-or-repair", "recent-part", "today-drive"]) {
    assert.match(promptData, new RegExp(`id: "${id}"`));
  }
  assert.match(prompts, /\/journal\/new\?prompt=/);
  assert.match(newJournal, /<JournalPrompts/);
  assert.match(newJournal, /promptId/);
  assert.match(form, /findJournalPrompt/);
  assert.match(form, /journal-prompt-hint/);
});

test("legacy profile IDs remain compatible while public usernames resolve", () => {
  assert.match(profile, /item\.id === id \|\| item\.publicUsername\?\.toLowerCase\(\) === id\.toLowerCase\(\)/);
  assert.match(profile, /publicProfileKey=\{id\}/);
});

test("journal detail links use one encoded path and skip speculative prefetch", () => {
  assert.match(card, /journalDetailHref/);
  assert.match(card, /prefetch=\{false\}/);
  assert.match(home, /journalDetailHref\(featuredJournal\.id\).*prefetch=\{false\}/);
  assert.match(detailRoute, /encodeURIComponent\(journalId\)/);
});
