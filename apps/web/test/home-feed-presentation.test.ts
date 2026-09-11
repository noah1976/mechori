import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { hasDistinctJournalTitle } from "../lib/journal-feed-presentation.ts";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const home = read("../app/page.tsx");
const card = read("../components/journal-card.tsx");
const media = read("../components/journal-media.tsx");
const css = read("../app/globals.css");

test("feed presentation suppresses only title and body duplicates", () => {
  assert.equal(hasDistinctJournalTitle("テスト", "テスト"), false);
  assert.equal(hasDistinctJournalTitle(" テスト\n", "テスト"), false);
  assert.equal(hasDistinctJournalTitle("オイル交換", "交換後は静かになった"), true);
});

test("authenticated home renders a compact self context above a finite vehicle feed", () => {
  assert.match(home, /className="home-self-context"/);
  assert.match(home, /className="home-self-vehicle"/);
  assert.match(home, /className="home-journal-feed"/);
  assert.match(home, /variant="home"/);
  assert.match(home, /home-following-section/);
  assert.match(home, /<h2 id="following-feed-heading">/);
  assert.match(home, /みんなのクルマに起きたこと/);
  assert.match(home, /journal\.authorProfileId !== data\.currentProfileId/);
  assert.match(home, /signedInFeed\.slice\(0, 8\)/);
  assert.match(home, /最近の記録はここまでです/);
  assert.doesNotMatch(home, /AlphaHistorySignature/);
  assert.doesNotMatch(home, /ActivationOnboarding/);
  assert.doesNotMatch(home, /ActivationChecklist/);
  assert.doesNotMatch(home, /className="home-monthly-summary"/);
  assert.doesNotMatch(home, /className="home-knowledge-section"/);
  assert.doesNotMatch(home, /className="home-record-grid"/);
  assert.doesNotMatch(home, /className="monthly-owner-band"/);
  assert.doesNotMatch(home, /YOUR VEHICLE HISTORY/);
  assert.doesNotMatch(home, /home-featured-journal/);
  assert.doesNotMatch(home, /FROM ALPHA GARAGES/);
  assert.match(home, /home-record-link-desktop/);
  assert.match(home, /`\/garage\?vehicle=\$\{encodeURIComponent\(vehicle\.id\)\}`/);
  assert.match(home, /href="\/search"/);
  assert.match(css, /\.home-record-link-desktop \{ display: none; \}/);
  assert.doesNotMatch(home, /href="\/feed"/);
});

test("journal cards lead with vehicle while retaining owner, date, likes, and detail navigation", () => {
  assert.match(card, /author\?\.displayName/);
  assert.match(card, /journal\.vehicleLabel/);
  assert.match(card, /journalOccurrenceLabel\(journal, locale\)/);
  assert.match(card, /className="journal-card-vehicle-meta"/);
  assert.match(card, /<time dateTime=\{recordedAt\}>/);
  assert.match(card, /className="journal-occurrence-context"/);
  assert.match(card, /className="journal-owner-context"/);
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
  assert.ok(card.indexOf("<p>{display.body}</p>") < card.indexOf("<JournalMedia"));
});

test("feed photos use the same canonical detail route as the card hit area", () => {
  assert.match(card, /const detailHref = journalDetailHref\([\s\S]*displayJournal\.id,[\s\S]*variant === "home" \? "\/" : undefined/);
  assert.match(card, /className="journal-card-hit-area"/);
  assert.match(card, /href=\{detailHref\}/);
  assert.match(card, /linkHref=\{detailHref\}/);
  assert.doesNotMatch(card, /<JournalMedia[\s\S]*vehicleHref=\{vehicleHref\}/);
  assert.match(media, /linkHref \? <Link href=\{linkHref\} aria-label=\{linkAriaLabel\}>\{image\}<\/Link> : image/);
  assert.doesNotMatch(media, /vehicleHref/);
});
