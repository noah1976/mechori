import assert from "node:assert/strict";
import test from "node:test";
import {
  cloneDemoData,
  journalToDraft,
  resolveJournalDisplayContent,
  updateJournalInData,
  upsertJournalTranslationInData,
} from "../src/index.ts";

test("shows a complete current translation for the selected UI language", () => {
  const data = cloneDemoData();
  const journal = data.journals.find((item) => item.id === "journal-demo-luca-drive");
  assert.ok(journal);

  const display = resolveJournalDisplayContent(data, journal, "en");

  assert.equal(display.translated, true);
  assert.equal(display.title, "DEMO: A short drive after the rain");
  assert.match(display.body, /first weekend/i);
  assert.equal(display.contentBlocks[1]?.type, "media");
});

test("keeps the original visible when a translation is unavailable", () => {
  const data = cloneDemoData();
  const journal = data.journals[0]!;
  const withoutTranslations = { ...data, contentTranslations: [] };

  const display = resolveJournalDisplayContent(withoutTranslations, journal, "en");

  assert.equal(display.translated, false);
  assert.equal(display.title, journal.title);
  assert.equal(display.body, journal.bodyOriginal);
});

test("lets only the author save a complete human translation", () => {
  const data = cloneDemoData();
  const journal = data.journals.find((item) => item.id === "journal-demo-owner-private");
  assert.ok(journal);
  const translated = upsertJournalTranslationInData(data, journal.id, {
    targetLanguage: "en",
    title: "My translated title",
    textBlocks: {
      "journal-block-demo-owner-private-text": "My translated paragraph.",
    },
  }, "2026-07-22T10:00:00.000Z");

  assert.equal(resolveJournalDisplayContent(translated, journal, "en").title, "My translated title");
  assert.equal(
    translated.contentTranslations.find((item) => item.entityId === journal.id)?.method,
    "human",
  );

  assert.throws(
    () => upsertJournalTranslationInData(
      { ...data, currentProfileId: "profile-demo-luca" },
      journal.id,
      {
        targetLanguage: "en",
        title: "Not allowed",
        textBlocks: { "journal-block-demo-owner-private-text": "Not allowed" },
      },
    ),
    /journal_owner_required/,
  );
});

test("marks translations outdated when the source journal changes", () => {
  const data = cloneDemoData();
  const journal = data.journals.find((item) => item.id === "journal-demo-owner-private");
  assert.ok(journal);
  const updated = updateJournalInData(
    data,
    journal.id,
    { ...journalToDraft(journal), title: `${journal.title}（更新）` },
    "2026-07-22T11:00:00.000Z",
  );

  assert.equal(
    updated.data.contentTranslations
      .filter((item) => item.entityId === journal.id)
      .every((item) => item.reviewStatus === "outdated"),
    true,
  );
  assert.equal(resolveJournalDisplayContent(updated.data, updated.journal, "en").translated, false);
});

test("keeps translations current when only event metadata changes", () => {
  const data = cloneDemoData();
  const journal = data.journals.find((item) => item.id === "journal-demo-owner-private");
  assert.ok(journal);
  const updatedAt = "2026-07-22T12:00:00.000Z";
  const updated = updateJournalInData(
    data,
    journal.id,
    { ...journalToDraft(journal), occurredOn: "2026-07-21" },
    updatedAt,
  );

  const translations = updated.data.contentTranslations.filter(
    (item) => item.entityId === journal.id,
  );
  assert.equal(translations.every((item) => item.reviewStatus !== "outdated"), true);
  assert.equal(translations.every((item) => item.sourceContentVersion === updatedAt), true);
  assert.equal(resolveJournalDisplayContent(updated.data, updated.journal, "en").translated, true);
});
