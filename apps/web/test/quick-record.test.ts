import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { addJournalToData, cloneDemoData } from "@mechori/core";
import {
  captureIntentForJournal,
  captureIntentLabel,
  captureIntentPlaceholder,
  defaultEventTypeForCaptureIntent,
  quickRecordTitle,
} from "../lib/quick-record.ts";

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
    captureIntent: "other",
    eventType: "other",
    occurredOn: "2026-08-15",
    occurredPrecision: "day",
    bodyOriginal: body,
    vehicleId: vehicle.id,
    linkedRecordId: "",
    displayFields: [],
    media: [],
    contentBlocks: [{ id: "quick-body", type: "text", style: "paragraph", text: body }],
    visibility: "public",
    knowledgeExtractionConsent: false,
  }, "ja", "2026-08-15T08:00:00.000Z");

  assert.equal(result.journal.vehicleId, vehicle.id);
  assert.equal(result.journal.captureIntent, "other");
  assert.equal(result.journal.eventType, "other");
  assert.equal(result.journal.title, "雨上がりに少し走った。");
  assert.equal(result.journal.bodyOriginal, body);
  assert.equal(result.data.journals[0]?.id, result.journal.id);
});

test("uses one broad capture intent before the focused composer", () => {
  const composer = read("../components/quick-event-form.tsx");
  const photoActions = read("../components/photo-source-actions.tsx");
  assert.match(composer, /このクルマに、何を残す？/);
  assert.match(composer, /value: "issue" as const/);
  assert.match(composer, /value: "service" as const/);
  assert.match(composer, /value: "drive" as const/);
  assert.match(composer, /value: "other" as const/);
  assert.match(composer, /chooseCaptureIntent\(value\)/);
  assert.match(composer, /captureIntentPlaceholder\(intentForDisplay, locale\)/);
  assert.match(composer, /autoFocus=\{!editing\}/);
  assert.match(composer, /setCaptureIntent\(null\)/);
  assert.match(composer, /PhotoSourceActions/);
  assert.equal(composer.match(/<PhotoSourceActions/g)?.length, 1);
  assert.match(composer, /variant="single"/);
  assert.match(photoActions, /single \? \(/);
  assert.match(photoActions, /写真を追加/);
  assert.doesNotMatch(photoActions, /capture="environment"[\s\S]*写真を追加/);
  assert.match(composer, /記録する/);
  assert.match(composer, /quick-composer-photo-row/);
  assert.match(composer, /const visibility: JournalVisibility = journal\?\.visibility \?\? "public"/);
  assert.match(composer, /QuickRecordCompletionSheet/);
  assert.match(composer, /\{editing && <details className="quick-composer-details">/);
  assert.doesNotMatch(composer, /quick-event-audience/);
  assert.doesNotMatch(composer, /詳しく記録する/);
});

test("capture intent remains broader than detailed event type", () => {
  assert.equal(defaultEventTypeForCaptureIntent("issue"), "issue");
  assert.equal(defaultEventTypeForCaptureIntent("drive"), "drive");
  assert.equal(defaultEventTypeForCaptureIntent("service"), undefined);
  assert.equal(captureIntentForJournal(undefined, "repair"), "service");
  assert.equal(captureIntentLabel("service", "ja"), "整備・修理");
  assert.equal(captureIntentPlaceholder("issue", "ja"), "何が気になりますか？");
});

test("explicit issue intent saves open while service intent stays unclassified", () => {
  const data = cloneDemoData();
  const vehicle = data.vehicles[0]!;
  const base = {
    title: "記録",
    sourceLanguage: "ja" as const,
    occurredOn: "2026-08-20",
    occurredPrecision: "day" as const,
    bodyOriginal: "本文",
    vehicleId: vehicle.id,
    linkedRecordId: "",
    displayFields: [],
    media: [],
    contentBlocks: [{ id: "body", type: "text" as const, style: "paragraph" as const, text: "本文" }],
    visibility: "public" as const,
    knowledgeExtractionConsent: false,
  };
  const issue = addJournalToData(data, {
    ...base,
    captureIntent: "issue",
    eventType: "issue",
  }, "ja");
  const service = addJournalToData(data, {
    ...base,
    captureIntent: "service",
  }, "ja");

  assert.equal(issue.journal.issueStatus, "open");
  assert.equal(service.journal.captureIntent, "service");
  assert.equal(service.journal.eventType, undefined);
});

test("composer styles keep the mobile writing surface and save action prominent", () => {
  const css = read("../app/globals.css");

  assert.match(css, /\.quick-note-field textarea \{ min-height: 208px;/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.quick-note-field textarea \{ min-height: 180px; font-size: 17px;/);
  assert.match(css, /\.quick-composer-submit \.primary-action \{ width: 100%; justify-content: center; \}/);
  assert.match(css, /\.quick-event-page \{ padding-bottom: calc\(34px \+ env\(safe-area-inset-bottom\)\); \}/);
  assert.match(css, /\.photo-source-actions\.is-single \{ grid-template-columns: minmax\(0, 1fr\); width: auto; \}/);
});

test("always opens the universal composer instead of a pre-save detailed route", () => {
  const page = read("../app/journal/new/page.tsx");
  assert.match(page, /return <QuickRecordEntry initialVehicleId=\{vehicleId\} \/>;/);
  assert.doesNotMatch(page, /JournalForm/);
  assert.doesNotMatch(page, /JournalPrompts/);
  assert.doesNotMatch(page, /mode"\) === "detailed"/);
});

test("post-save enrichment is optional and cannot replace the saved record", () => {
  const sheet = read("../components/quick-record-completion-sheet.tsx");
  const context = read("../lib/app-context.tsx");
  const composer = read("../components/quick-event-form.tsx");
  assert.match(sheet, /このクルマに、ひとつ経験が残りました/);
  assert.match(sheet, /記録を詳しくする/);
  assert.match(sheet, /記録の詳細/);
  assert.doesNotMatch(sheet, /整備情報を追加/);
  assert.match(sheet, /onClose/);
  assert.match(sheet, /onSaveEnrichment/);
  assert.match(sheet, /元の記録は残っています/);
  assert.match(sheet, /journalToDraft\(journal\)/);
  assert.match(sheet, /captureIntentLabel\(captureIntent, locale\)/);
  assert.match(sheet, /細かい種類（任意）/);
  assert.match(sheet, /captureIntent === "service" \|\| captureIntent === "other"/);
  assert.match(sheet, /value: "issue", ja: "不具合・気になること"/);
  assert.match(sheet, /issueStatus: eventType === "issue" \? "open" : undefined/);
  assert.match(sheet, /点検・対応・結果を続けられます/);
  assert.match(sheet, /savedJournal\.eventType === "issue" && savedJournal\.issueStatus === "open"/);
  assert.match(composer, /const savedJournal = journal \? await updateJournal\(journal\.id, draft\) : await addJournal\(draft\)/);
  assert.match(composer, /setCompletion\(savedJournal\)/);
  assert.match(composer, /captureIntent: captureIntent \?\? undefined/);
  assert.match(context, /await saveAlphaWorkspace\(data\);[\s\S]*?setData\(data\);/);
});

test("record detail disclosure is visibly interactive without narrowing every experience to maintenance", () => {
  const composer = read("../components/quick-event-form.tsx");
  const css = read("../app/globals.css");

  assert.match(composer, /<strong>\{locale === "ja" \? "記録の詳細"/);
  assert.match(composer, /detailSummary/);
  assert.match(composer, /変更する/);
  assert.match(composer, /追加する/);
  assert.match(composer, /<ChevronDown size=\{17\}/);
  assert.doesNotMatch(composer, /追加情報を編集/);
  assert.match(css, /\.quick-composer-details summary \{[^}]*grid-template-columns: minmax\(0, 1fr\) auto auto;/);
});

test("media count is an explicit temporary alpha transport guardrail, not a product cap", () => {
  const detailed = read("../components/journal-form.tsx");
  const sharing = read("../../../packages/core/src/alpha-journal-sharing.ts");

  assert.match(detailed, /alphaMediaTechnicalLimit = 6/);
  assert.match(detailed, /not a permanent product-level photo cap/);
  assert.match(detailed, /現在のα版の保存上限/);
  assert.doesNotMatch(detailed, /1投稿につき\$\{maxMediaCount\}ファイル/);
  assert.match(sharing, /Temporary shared-payload safety guardrail/);
});

test("the vehicle context route reuses the same one-tap intent composer", () => {
  const page = read("../app/garage/[vehicleId]/event/new/page.tsx");
  assert.match(page, /<QuickEventForm vehicle=\{vehicle\} \/>/);
  assert.doesNotMatch(page, /JournalPrompts/);
});
