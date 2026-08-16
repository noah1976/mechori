import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { hasDistinctJournalTitle } from "../lib/journal-feed-presentation.ts";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const home = read("../app/page.tsx");
const card = read("../components/journal-card.tsx");
const css = read("../app/globals.css");

test("feed presentation suppresses only title and body duplicates", () => {
  assert.equal(hasDistinctJournalTitle("テスト", "テスト"), false);
  assert.equal(hasDistinctJournalTitle(" テスト\n", "テスト"), false);
  assert.equal(hasDistinctJournalTitle("オイル交換", "交換後は静かになった"), true);
});

test("authenticated home renders a content-first journal stream", () => {
  assert.match(home, /className="home-journal-feed"/);
  assert.match(home, /variant="home"/);
  assert.match(home, /home-following-section/);
  assert.match(home, /新しい愛車の記録/);
  assert.match(home, /className="home-monthly-summary"/);
  assert.match(home, /className="home-knowledge-section"/);
  assert.doesNotMatch(home, /className="monthly-owner-band"/);
  assert.doesNotMatch(home, /YOUR VEHICLE HISTORY/);
  assert.doesNotMatch(home, /home-featured-journal/);
  assert.doesNotMatch(home, /FROM ALPHA GARAGES/);
});

test("journal cards retain owner, vehicle, date, likes, and detail navigation", () => {
  assert.match(card, /author\?\.displayName/);
  assert.match(card, /journal\.vehicleLabel/);
  assert.match(card, /journalOccurrenceLabel\(journal, locale\)/);
  assert.match(card, /toggleJournalLike\(displayJournal\.id\)/);
  assert.match(card, /className="journal-card-hit-area"/);
  assert.match(card, /const showVisibility = variant !== "home" \|\| displayJournal\.visibility !== "public"/);
});

test("journal cards use a shared content-first presentation and the home FAB is restrained", () => {
  assert.match(css, /\.journal-card \{ position: relative; min-width: 0; padding: 22px 0 26px; background: transparent; border: 0; border-radius: 0;/);
  assert.match(css, /\.journal-card > \.journal-media \{ inline-size: 100%; min-width: 0; max-width: 100%; margin: 15px 0 0;/);
  assert.match(css, /\.home-journal-feed \.journal-card \+ \.journal-card \{ border-top: 1px solid var\(--line\); \}/);
  assert.match(css, /\.home-journal-feed \.journal-media, \.home-journal-feed \.journal-media-item \{ min-width: 0; max-width: 100%; \}/);
  assert.match(css, /\.record-fab-home \{ min-height: 44px; padding-inline: 14px; border-radius: 6px;/);
});

test("journal card keeps the record text before its optional feed photo", () => {
  assert.ok(card.indexOf("<p>{display.body}</p>") < card.indexOf("<JournalMedia attachments={visibleMedia}"));
});
