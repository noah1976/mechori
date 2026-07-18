import assert from "node:assert/strict";
import test from "node:test";
import {
  createEmptyActionDraft,
  createRestorableJournalDraft,
  parseJournalLocalDraft,
  parseRecordLocalDraft,
  serializeLocalDraft,
  type JournalDraft,
  type RecordDraft,
} from "../src/index.ts";

const recordDraft: RecordDraft = {
  serviceDate: "2026-07-16",
  odometerKm: "86420",
  odometerUnit: "km",
  odometerEpisodeId: "episode-demo",
  odometerChangeReason: "same_episode",
  summary: "DEMO draft",
  symptoms: "DEMO input",
  causeCandidates: "",
  checksPerformed: "",
  workPerformed: "",
  partName: "",
  partManufacturer: "",
  partNumber: "",
  cost: "",
  resolutionStatus: "unresolved",
  hazardLevel: "LOW",
  evidenceBasis: "contemporaneous",
  additionalActions: [{ ...createEmptyActionDraft(), clientId: "action-demo" }],
  requestSharing: false,
};

const journalDraft: JournalDraft = {
  title: "DEMO story draft",
  bodyOriginal: "",
  vehicleId: "vehicle-demo-current",
  linkedRecordId: "",
  displayFields: ["service_date"],
  media: [],
  contentBlocks: [
    { id: "block-text", type: "text", style: "paragraph", text: "Owner text" },
  ],
  visibility: "private",
  knowledgeExtractionConsent: false,
};

test("round-trips valid record and journal drafts", () => {
  const savedAt = "2026-07-16T12:00:00.000Z";
  assert.deepEqual(parseRecordLocalDraft(serializeLocalDraft(recordDraft, savedAt)), {
    version: 1,
    savedAt,
    value: recordDraft,
  });
  assert.deepEqual(parseJournalLocalDraft(serializeLocalDraft({ draft: journalDraft, omittedMediaCount: 0 }, savedAt)), {
    version: 1,
    savedAt,
    value: { draft: journalDraft, omittedMediaCount: 0 },
  });
});

test("rejects corrupt or incompatible local drafts", () => {
  assert.equal(parseRecordLocalDraft(null), null);
  assert.equal(parseRecordLocalDraft("not-json"), null);
  assert.equal(parseRecordLocalDraft(JSON.stringify({ version: 2, value: recordDraft })), null);
  assert.equal(
    parseJournalLocalDraft(
      serializeLocalDraft({
        draft: { ...journalDraft, visibility: "everyone" },
        omittedMediaCount: 0,
      }),
    ),
    null,
  );
});

test("keeps journal text but omits local media from a restorable draft", () => {
  const result = createRestorableJournalDraft({
    ...journalDraft,
    visibility: "public",
    media: [
      {
        id: "media-local",
        kind: "image",
        source: "local_blob",
        storageKey: "blob-local",
        mimeType: "image/jpeg",
        sizeBytes: 123,
        altText: "DEMO image",
        privacyState: "private_only",
        createdAt: "2026-07-16T12:00:00.000Z",
        isDemo: true,
      },
    ],
    contentBlocks: [
      ...journalDraft.contentBlocks,
      { id: "block-media", type: "media", mediaId: "media-local" },
    ],
  });

  assert.equal(result.omittedMediaCount, 1);
  assert.equal(result.draft.media.length, 0);
  assert.deepEqual(result.draft.contentBlocks, journalDraft.contentBlocks);
  assert.equal(result.draft.visibility, "private");
});
