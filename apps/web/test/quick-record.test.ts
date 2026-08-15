import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { addJournalToData, cloneDemoData } from "@mechori/core";
import { quickRecordTitle } from "../lib/quick-record.ts";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("uses the first written line as a compact title without asking for one", () => {
  assert.equal(quickRecordTitle("オイルを交換した\n静かになった", "ja"), "オイルを交換した");
  assert.equal(quickRecordTitle("  A   short   note  ", "en"), "A short note");
  assert.equal(quickRecordTitle("x".repeat(84), "en"), "x".repeat(80));
});

test("a body-only quick record remains a vehicle journal entry for the existing timeline", () => {
  const data = cloneDemoData();
  const vehicle = data.vehicles[0]!;
  const body = "雨上がりに少し走った。\nエンジンの調子はいい。";
  const result = addJournalToData(data, {
    title: quickRecordTitle(body, "ja"),
    eventType: "other",
    occurredOn: "2026-08-15",
    occurredPrecision: "day",
    bodyOriginal: body,
    vehicleId: vehicle.id,
    linkedRecordId: "",
    displayFields: [],
    media: [],
    contentBlocks: [{ id: "quick-body", type: "text", style: "paragraph", text: body }],
    visibility: "private",
    knowledgeExtractionConsent: false,
  }, "ja", "2026-08-15T08:00:00.000Z");

  assert.equal(result.journal.vehicleId, vehicle.id);
  assert.equal(result.journal.eventType, "other");
  assert.equal(result.journal.title, "雨上がりに少し走った。");
  assert.equal(result.journal.bodyOriginal, body);
  assert.equal(result.data.journals[0]?.id, result.journal.id);
});

test("keeps the composer focused on vehicle, body, optional photo, and save", () => {
  const composer = read("../components/quick-event-form.tsx");
  const photoActions = read("../components/photo-source-actions.tsx");
  assert.match(composer, /eventType.*"other"/);
  assert.match(composer, /愛車で何をしましたか？/);
  assert.match(composer, /PhotoSourceActions/);
  assert.equal(composer.match(/<PhotoSourceActions/g)?.length, 1);
  assert.match(composer, /variant="single"/);
  assert.match(photoActions, /single \? \(/);
  assert.match(photoActions, /写真を追加/);
  assert.doesNotMatch(photoActions, /capture="environment"[\s\S]*写真を追加/);
  assert.match(composer, /記録する/);
  assert.match(composer, /<details className="quick-composer-details">/);
  assert.match(composer, /quick-composer-photo-row/);
});

test("composer styles keep the mobile writing surface and save action prominent", () => {
  const css = read("../app/globals.css");

  assert.match(css, /\.quick-note-field textarea \{ min-height: 208px;/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.quick-note-field textarea \{ min-height: 180px; font-size: 17px;/);
  assert.match(css, /\.quick-composer-submit \.primary-action \{ width: 100%; justify-content: center; \}/);
  assert.match(css, /\.quick-event-page \{ padding-bottom: calc\(34px \+ env\(safe-area-inset-bottom\)\); \}/);
  assert.match(css, /\.photo-source-actions\.is-single \{ grid-template-columns: minmax\(0, 1fr\); width: auto; \}/);
});

test("opens the universal composer by default and preserves an explicit detailed route", () => {
  const page = read("../app/journal/new/page.tsx");
  assert.match(page, /if \(!detailed\) return <QuickRecordEntry/);
  assert.match(page, /mode"\) === "detailed"/);
  assert.match(page, /Boolean\(promptId\)/);
});

test("the vehicle context route does not make users choose a prompt before writing", () => {
  const page = read("../app/garage/[vehicleId]/event/new/page.tsx");
  assert.match(page, /<QuickEventForm vehicle=\{vehicle\} \/>/);
  assert.doesNotMatch(page, /JournalPrompts/);
});
